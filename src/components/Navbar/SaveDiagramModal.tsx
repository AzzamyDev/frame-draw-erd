import { useState, useEffect } from 'react'
import { X, Plus, FolderOpen, Loader2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { projectsApi, diagramsApi } from '@/lib/api'
import type { Project } from '@/lib/types'

interface Props {
	onClose: () => void
}

export default function SaveDiagramModal({ onClose }: Props) {
	const { dbmlCode, nodes, edges, nodeColors, showFieldTypes, showMinimap, showEnums, showEdgeAnimation, openDiagram } = useStore()

	const [projects, setProjects] = useState<Project[]>([])
	const [loadingProjects, setLoadingProjects] = useState(true)
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
	const [diagramName, setDiagramName] = useState('Untitled Diagram')
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// New project inline
	const [showNewProject, setShowNewProject] = useState(false)
	const [newProjectName, setNewProjectName] = useState('')
	const [creatingProject, setCreatingProject] = useState(false)

	useEffect(() => {
		projectsApi
			.list()
			.then((res) => {
				const list = Array.isArray(res) ? res : []
				setProjects(list)
				if (list.length > 0) setSelectedProjectId(list[0].id)
				else setShowNewProject(true)
			})
			.catch((e: any) => setError(e?.message || 'Failed to load projects'))
			.finally(() => setLoadingProjects(false))
	}, [])

	const createProject = async () => {
		const name = newProjectName.trim()
		if (!name) return
		setCreatingProject(true)
		try {
			const p = await projectsApi.create(name)
			setProjects((prev) => [...prev, p])
			setSelectedProjectId(p.id)
			setShowNewProject(false)
			setNewProjectName('')
		} catch (e: any) {
			setError(e.message)
		} finally {
			setCreatingProject(false)
		}
	}

	const handleSave = async () => {
		if (!selectedProjectId) { setError('Select a project first'); return }
		const name = diagramName.trim()
		if (!name) { setError('Enter a diagram name'); return }
		setSaving(true)
		setError(null)
		try {
			// Create diagram then immediately save current state
			const created = await diagramsApi.create(selectedProjectId, name)
			const saved = await diagramsApi.save(selectedProjectId, created.id, {
				dbmlCode,
				nodes,
				edges,
				nodeColors,
				showFieldTypes,
				showMinimap,
				showEnums,
				showEdgeAnimation,
			})
			openDiagram({ ...created, ...saved })
			onClose()
		} catch (e: any) {
			setError(e.message || 'Failed to save')
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="w-[440px] rounded-xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-700">
				{/* Header */}
				<div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
					<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
						Save diagram to cloud
					</h2>
					<button
						onClick={onClose}
						className="rounded-md p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
					>
						<X size={16} />
					</button>
				</div>

				<div className="px-6 py-5 space-y-4">
					{/* Diagram name */}
					<div>
						<label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
							Diagram name
						</label>
						<input
							type="text"
							value={diagramName}
							onChange={(e) => setDiagramName(e.target.value)}
							autoFocus
							className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					{/* Project picker */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
								Project
							</label>
							<button
								onClick={() => setShowNewProject((v) => !v)}
								className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
							>
								<Plus size={11} />
								New project
							</button>
						</div>

						{showNewProject && (
							<div className="flex gap-2 mb-2">
								<input
									type="text"
									value={newProjectName}
									onChange={(e) => setNewProjectName(e.target.value)}
									placeholder="Project name"
									onKeyDown={(e) => { if (e.key === 'Enter') createProject() }}
									className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<button
									onClick={createProject}
									disabled={creatingProject || !newProjectName.trim()}
									className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
								>
									{creatingProject ? <Loader2 size={12} className="animate-spin" /> : 'Create'}
								</button>
							</div>
						)}

						{loadingProjects ? (
							<div className="flex items-center gap-2 py-3 text-xs text-zinc-400">
								<Loader2 size={12} className="animate-spin" /> Loading projects…
							</div>
						) : projects.length === 0 ? (
							<p className="text-xs text-zinc-400 italic py-2">
								No projects yet — create one above.
							</p>
						) : (
							<div className="space-y-1 max-h-48 overflow-y-auto">
								{projects.map((p) => (
									<button
										key={p.id}
										onClick={() => setSelectedProjectId(p.id)}
										className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
											selectedProjectId === p.id
												? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
												: 'border border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
										}`}
									>
										<FolderOpen size={13} className={selectedProjectId === p.id ? 'text-blue-500' : 'text-zinc-400'} />
										<span className="truncate">{p.name}</span>
										<span className="ml-auto text-xs text-zinc-400 shrink-0">{p.diagramCount} diagrams</span>
									</button>
								))}
							</div>
						)}
					</div>

					{error && <p className="text-xs text-red-500">{error}</p>}

					<div className="flex justify-end gap-2 pt-1">
						<button
							onClick={onClose}
							className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={saving || !selectedProjectId}
							className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
						>
							{saving && <Loader2 size={13} className="animate-spin" />}
							Save to cloud
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
