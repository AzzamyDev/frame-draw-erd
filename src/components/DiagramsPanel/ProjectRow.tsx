import { useState } from 'react'
import { ChevronRight, ChevronDown, FolderOpen, Folder, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { diagramsApi, projectsApi } from '@/lib/api'
import type { Project, DiagramSummary } from '@/lib/types'
import DiagramRow from './DiagramRow'

interface Props {
	project: Project
	onDelete: (id: string) => void
	onRename: (id: string, name: string) => void
}

export default function ProjectRow({ project, onDelete, onRename }: Props) {
	const [expanded, setExpanded] = useState(false)
	const [diagrams, setDiagrams] = useState<DiagramSummary[]>([])
	const [loadedOnce, setLoadedOnce] = useState(false)
	const [loadingDiagrams, setLoadingDiagrams] = useState(false)
	const [creatingDiagram, setCreatingDiagram] = useState(false)
	const [editing, setEditing] = useState(false)
	const [nameVal, setNameVal] = useState(project.name)

	const toggle = async () => {
		const next = !expanded
		setExpanded(next)
		if (next && !loadedOnce) {
			setLoadingDiagrams(true)
			try {
				const res = await diagramsApi.list(project.id)
				setDiagrams(Array.isArray(res) ? res : [])
				setLoadedOnce(true)
			} catch {
				setDiagrams([])
			} finally {
				setLoadingDiagrams(false)
			}
		}
	}

	const createDiagram = async (e: React.MouseEvent) => {
		e.stopPropagation()
		const name = window.prompt('Diagram name:')
		if (!name?.trim()) return
		setCreatingDiagram(true)
		try {
			const d = await diagramsApi.create(project.id, name.trim())
			setDiagrams((prev) => [...prev, d])
			if (!expanded) setExpanded(true)
		} finally {
			setCreatingDiagram(false)
		}
	}

	const commitRename = async () => {
		setEditing(false)
		const trimmed = nameVal.trim()
		if (!trimmed || trimmed === project.name) return
		try {
			await projectsApi.rename(project.id, trimmed)
			onRename(project.id, trimmed)
		} catch {
			setNameVal(project.name)
		}
	}

	const handleDeleteProject = async (e: React.MouseEvent) => {
		e.stopPropagation()
		if (!window.confirm(`Delete project "${project.name}" and all its diagrams?`)) return
		try {
			await projectsApi.delete(project.id)
			onDelete(project.id)
		} catch {}
	}

	return (
		<div>
			<div
				className="group flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md mx-1 transition-colors"
				onClick={toggle}
			>
				{expanded ? (
					<ChevronDown size={13} className="shrink-0 text-zinc-400" />
				) : (
					<ChevronRight size={13} className="shrink-0 text-zinc-400" />
				)}
				{expanded ? (
					<FolderOpen size={14} className="shrink-0 text-blue-500" />
				) : (
					<Folder size={14} className="shrink-0 text-zinc-400" />
				)}

				{editing ? (
					<input
						autoFocus
						value={nameVal}
						onChange={(e) => setNameVal(e.target.value)}
						onBlur={commitRename}
						onKeyDown={(e) => {
							if (e.key === 'Enter') commitRename()
							if (e.key === 'Escape') { setEditing(false); setNameVal(project.name) }
						}}
						onClick={(e) => e.stopPropagation()}
						className="flex-1 text-xs bg-transparent border-b border-blue-500 outline-none text-zinc-900 dark:text-zinc-100"
					/>
				) : (
					<span className="flex-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
						{project.name}
					</span>
				)}

				{!editing && (
					<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							onClick={(e) => { e.stopPropagation(); setEditing(true) }}
							className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
						>
							<Pencil size={11} />
						</button>
						<button
							onClick={createDiagram}
							disabled={creatingDiagram}
							className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-blue-500"
							title="New diagram"
						>
							{creatingDiagram ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
						</button>
						<button
							onClick={handleDeleteProject}
							className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500"
						>
							<Trash2 size={11} />
						</button>
					</div>
				)}
			</div>

			{expanded && (
				<div>
					{loadingDiagrams ? (
						<div className="pl-10 py-1.5 flex items-center gap-1.5 text-xs text-zinc-400">
							<Loader2 size={11} className="animate-spin" /> Loading…
						</div>
					) : diagrams.length === 0 ? (
						<p className="pl-10 py-1.5 text-xs text-zinc-400 italic">No diagrams yet</p>
					) : (
						diagrams.map((d) => (
							<DiagramRow
								key={d.id}
								projectId={project.id}
								diagram={d}
								onDelete={(id) => setDiagrams((prev) => prev.filter((x) => x.id !== id))}
								onRename={(id, name) =>
									setDiagrams((prev) => prev.map((x) => (x.id === id ? { ...x, name } : x)))
								}
							/>
						))
					)}
				</div>
			)}
		</div>
	)
}
