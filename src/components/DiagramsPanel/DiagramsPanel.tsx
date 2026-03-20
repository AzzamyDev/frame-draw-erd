import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
	Search, Plus, X, FolderOpen, Folder, FileText,
	MoreVertical, Loader2, Trash2, Pencil,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { projectsApi, diagramsApi } from '@/lib/api'
import type { Project, DiagramSummary, DiagramFull } from '@/lib/types'

function formatDate(dateStr: string): string {
	const date = new Date(dateStr)
	const now = new Date()
	const diff = now.getTime() - date.getTime()
	const days = Math.floor(diff / (1000 * 60 * 60 * 24))
	if (days === 0) return 'Today'
	if (days === 1) return 'Yesterday'
	if (days < 7) return `${days} days ago`
	const sameYear = date.getFullYear() === now.getFullYear()
	return date.toLocaleDateString('en-US', {
		month: 'short', day: 'numeric', ...(!sameYear && { year: 'numeric' }),
	})
}

// ─── Name dialog ─────────────────────────────────────────────────────────────
interface NameDialogProps {
	title: string
	placeholder: string
	defaultValue?: string
	confirmLabel?: string
	onConfirm: (value: string) => void
	onCancel: () => void
}
function NameDialog({ title, placeholder, defaultValue = '', confirmLabel = 'Create', onConfirm, onCancel }: NameDialogProps) {
	const [value, setValue] = useState(defaultValue)
	const inputRef = useRef<HTMLInputElement>(null)
	useEffect(() => { setTimeout(() => inputRef.current?.select(), 30) }, [])
	const submit = () => { const v = value.trim(); if (v) onConfirm(v) }
	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
			<div className="w-[360px] rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-5">
				<h3 className="text-sm font-semibold text-zinc-100 mb-3">{title}</h3>
				<input
					ref={inputRef}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
					placeholder={placeholder}
					className="w-full rounded-lg bg-zinc-800 border border-zinc-700 focus:border-blue-500 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none"
				/>
				<div className="flex justify-end gap-2 mt-4">
					<button onClick={onCancel} className="px-4 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors">
						Cancel
					</button>
					<button onClick={submit} disabled={!value.trim()} className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-medium transition-colors">
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	)
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
interface ConfirmDialogProps {
	message: string
	onConfirm: () => void
	onCancel: () => void
}
function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
			<div className="w-[340px] rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-5">
				<p className="text-sm text-zinc-200 mb-5">{message}</p>
				<div className="flex justify-end gap-2">
					<button onClick={onCancel} className="px-4 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-800 transition-colors">
						Cancel
					</button>
					<button onClick={onConfirm} className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors">
						Delete
					</button>
				</div>
			</div>
		</div>
	)
}

// ─── Diagram action menu ──────────────────────────────────────────────────────
interface DiagramMenuProps {
	onOpen: () => void
	onRename: () => void
	onDelete: () => void
}
function DiagramMenu({ onOpen, onRename, onDelete }: DiagramMenuProps) {
	const [open, setOpen] = useState(false)
	const ref = useRef<HTMLDivElement>(null)
	useEffect(() => {
		if (!open) return
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [open])
	return (
		<div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
			<button
				onClick={() => setOpen((v) => !v)}
				className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all"
			>
				<MoreVertical size={13} />
			</button>
			{open && (
				<div className="absolute right-0 top-7 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 py-1">
					<button onClick={() => { onOpen(); setOpen(false) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors">
						<FileText size={11} /> Open
					</button>
					<button onClick={() => { onRename(); setOpen(false) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors">
						<Pencil size={11} /> Rename
					</button>
					<button onClick={() => { onDelete(); setOpen(false) }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700 transition-colors">
						<Trash2 size={11} /> Delete
					</button>
				</div>
			)}
		</div>
	)
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DiagramsPanel() {
	const { user, toggleDiagramsPanel, openDiagram, isAuthenticated, openAuthModal } = useStore()

	// Projects
	const [projects, setProjects] = useState<Project[]>([])
	const [loadingProjects, setLoadingProjects] = useState(true)
	const [projectError, setProjectError] = useState<string | null>(null)
	const [selectedProject, setSelectedProject] = useState<Project | null>(null)

	// New project inline
	const [showNewProject, setShowNewProject] = useState(false)
	const [newProjectName, setNewProjectName] = useState('')
	const [creatingProject, setCreatingProject] = useState(false)

	// Project rename/delete
	const [projectMenuId, setProjectMenuId] = useState<string | null>(null)
	const [projectMenuPos, setProjectMenuPos] = useState<{ x: number; y: number } | null>(null)
	const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null)
	const [renameProjectVal, setRenameProjectVal] = useState('')

	// Close project menu on outside click
	useEffect(() => {
		if (!projectMenuId) return
		const handler = (e: MouseEvent) => {
			const el = document.getElementById(`proj-menu-${projectMenuId}`)
			if (!el?.contains(e.target as Node)) { setProjectMenuId(null); setProjectMenuPos(null) }
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [projectMenuId])

	// Diagrams
	const [diagrams, setDiagrams] = useState<DiagramSummary[]>([])
	const [loadingDiagrams, setLoadingDiagrams] = useState(false)
	const [diagramError, setDiagramError] = useState<string | null>(null)
	const [search, setSearch] = useState('')
	const [creatingDiagram, setCreatingDiagram] = useState(false)

	// Diagram rename
	const [renamingDiagramId, setRenamingDiagramId] = useState<string | null>(null)
	const [renameDiagramVal, setRenameDiagramVal] = useState('')

	// Dialogs
	type DialogState =
		| { type: 'new-diagram' }
		| { type: 'new-project' }
		| { type: 'rename-project'; id: string; name: string }
		| { type: 'delete-project'; id: string; name: string }
		| { type: 'delete-diagram'; id: string }
		| null
	const [dialog, setDialog] = useState<DialogState>(null)

	// Load projects
	useEffect(() => {
		if (!isAuthenticated) return
		setLoadingProjects(true)
		setProjectError(null)
		projectsApi
			.list()
			.then((res) => {
				const list = Array.isArray(res) ? res : []
				setProjects(list)
				if (list.length > 0) setSelectedProject(list[0])
			})
			.catch((e: any) => setProjectError(e?.message || 'Failed to load projects'))
			.finally(() => setLoadingProjects(false))
	}, [isAuthenticated])

	// Load diagrams when project changes
	useEffect(() => {
		if (!selectedProject) return
		setLoadingDiagrams(true)
		setDiagramError(null)
		setDiagrams([])
		diagramsApi
			.list(selectedProject.id)
			.then((res) => setDiagrams(Array.isArray(res) ? res : []))
			.catch((e: any) => setDiagramError(e?.message || 'Failed to load diagrams'))
			.finally(() => setLoadingDiagrams(false))
	}, [selectedProject?.id])

	// ── Project actions ────────────────────────────────────────────────────────
	const createProject = async (name: string) => {
		setDialog(null)
		setCreatingProject(true)
		try {
			const p = await projectsApi.create(name)
			setProjects((prev) => [...prev, p])
			setSelectedProject(p)
			setShowNewProject(false)
			setNewProjectName('')
		} catch (e: any) {
			setProjectError(e?.message || 'Failed to create project')
		} finally {
			setCreatingProject(false)
		}
	}

	const commitRenameProject = async (id: string, name: string) => {
		setDialog(null)
		setRenamingProjectId(null)
		try {
			await projectsApi.rename(id, name)
			setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
			if (selectedProject?.id === id) setSelectedProject((s) => s ? { ...s, name } : s)
		} catch {}
	}

	const deleteProject = async (id: string) => {
		setDialog(null)
		try {
			await projectsApi.delete(id)
			const next = projects.filter((p) => p.id !== id)
			setProjects(next)
			if (selectedProject?.id === id) setSelectedProject(next[0] ?? null)
		} catch {}
	}

	// ── Diagram actions ────────────────────────────────────────────────────────
	const createDiagram = async (name: string) => {
		if (!selectedProject) return
		setDialog(null)
		setCreatingDiagram(true)
		try {
			const d = await diagramsApi.create(selectedProject.id, name)
			openDiagram(d as DiagramFull)
			toggleDiagramsPanel()
		} catch (e: any) {
			setDiagramError(e?.message || 'Failed to create diagram')
		} finally {
			setCreatingDiagram(false)
		}
	}

	const openDiagramItem = async (d: DiagramSummary) => {
		if (!selectedProject) return
		try {
			const full = await diagramsApi.get(selectedProject.id, d.id)
			openDiagram(full)
			toggleDiagramsPanel()
		} catch {}
	}

	const commitRenameDiagram = async (id: string, name?: string) => {
		if (!selectedProject) return
		const trimmed = (name ?? renameDiagramVal).trim()
		setRenamingDiagramId(null)
		setDialog(null)
		if (!trimmed) return
		try {
			await diagramsApi.rename(selectedProject.id, id, trimmed)
			setDiagrams((prev) => prev.map((d) => (d.id === id ? { ...d, name: trimmed } : d)))
		} catch {}
	}

	const deleteDiagram = async (id: string) => {
		if (!selectedProject) return
		setDialog(null)
		try {
			await diagramsApi.delete(selectedProject.id, id)
			setDiagrams((prev) => prev.filter((d) => d.id !== id))
			setProjects((prev) => prev.map((p) =>
				p.id === selectedProject.id ? { ...p, diagramCount: Math.max(0, p.diagramCount - 1) } : p
			))
		} catch {}
	}

	const filtered = diagrams.filter((d) =>
		d.name.toLowerCase().includes(search.toLowerCase()),
	)

	return (
	<>
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={(e) => { if (e.target === e.currentTarget) toggleDiagramsPanel() }}
		>
			<div className="w-[900px] max-w-[95vw] h-[600px] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex border border-zinc-700/80">

				{/* ── Left sidebar ── */}
				<div className="w-56 shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-800">
					{/* User info */}
					<div className="px-4 py-3.5 border-b border-zinc-800">
						{isAuthenticated ? (
							<div className="flex items-center gap-2.5">
								<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
									{user?.avatarUrl
										? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
										: (user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
									}
								</div>
								<div className="min-w-0">
									<p className="text-xs font-semibold text-zinc-100 truncate">{user?.name ?? user?.email}</p>
									{user?.name && <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>}
								</div>
							</div>
						) : (
							<button onClick={() => openAuthModal('login')} className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">
								Sign in
							</button>
						)}
					</div>

					{/* New Diagram */}
					<div className="px-3 py-2.5 border-b border-zinc-800">
						<button
							onClick={() => setDialog({ type: 'new-diagram' })}
							disabled={!selectedProject || creatingDiagram || !isAuthenticated}
							className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
						>
							{creatingDiagram ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
							New Diagram
						</button>
					</div>

					{/* Projects */}
					<div className="flex-1 overflow-y-auto py-2">
						<div className="flex items-center justify-between px-4 mb-1">
							<span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Projects</span>
							<button
								onClick={() => setDialog({ type: 'new-project' })}
								title="New project"
								className="text-zinc-600 hover:text-zinc-300 transition-colors"
							>
								<Plus size={12} />
							</button>
						</div>


						{loadingProjects ? (
							<div className="flex justify-center py-6">
								<Loader2 size={14} className="animate-spin text-zinc-600" />
							</div>
						) : projectError ? (
							<p className="px-4 py-2 text-xs text-red-400">{projectError}</p>
						) : projects.length === 0 ? (
							<p className="px-4 py-3 text-xs text-zinc-600 italic">No projects yet</p>
						) : (
							<div>
								{projects.map((p) => (
									<div key={p.id} className="group relative">
										{renamingProjectId === p.id ? (
											<div className="px-3 py-1">
												<input
													autoFocus
													value={renameProjectVal}
													onChange={(e) => setRenameProjectVal(e.target.value)}
													onBlur={() => commitRenameProject(p.id)}
													onKeyDown={(e) => {
														if (e.key === 'Enter') commitRenameProject(p.id)
														if (e.key === 'Escape') setRenamingProjectId(null)
													}}
													className="w-full text-xs bg-zinc-800 border border-blue-500 rounded px-2 py-1 text-zinc-100 outline-none"
												/>
											</div>
										) : (
											<button
												onClick={() => setSelectedProject(p)}
												className={`flex items-center gap-2 w-full pl-4 pr-2 py-2 text-left transition-colors ${
													selectedProject?.id === p.id
														? 'bg-zinc-800 text-zinc-100'
														: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
												}`}
											>
												{selectedProject?.id === p.id
													? <FolderOpen size={13} className="text-blue-400 shrink-0" />
													: <Folder size={13} className="shrink-0" />
												}
												<span className="text-xs truncate flex-1">{p.name}</span>
												<span className="text-[10px] text-zinc-600 shrink-0">{p.diagramCount ?? ''}</span>
												{/* Project menu */}
												<div className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
													<button
														onClick={(e) => {
															e.stopPropagation()
															if (projectMenuId === p.id) { setProjectMenuId(null); setProjectMenuPos(null); return }
															const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
															setProjectMenuPos({ x: rect.right, y: rect.bottom + 4 })
															setProjectMenuId(p.id)
														}}
														className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300"
													>
														<MoreVertical size={11} />
													</button>
												</div>
											</button>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* ── Right main area ── */}
				<div className="flex-1 flex flex-col min-w-0 bg-zinc-900">
					{/* Search + close */}
					<div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-800 shrink-0">
						<div className="flex-1 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
							<Search size={13} className="text-zinc-500 shrink-0" />
							<input
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search diagrams"
								className="flex-1 text-xs bg-transparent text-zinc-100 placeholder-zinc-500 outline-none"
							/>
							{search && (
								<button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
									<X size={12} />
								</button>
							)}
						</div>
						<button
							onClick={toggleDiagramsPanel}
							className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
						>
							<X size={15} />
						</button>
					</div>

					{/* Column headers */}
					<div className="grid grid-cols-[1fr_180px_180px_40px] gap-2 px-5 py-2 border-b border-zinc-800 shrink-0">
						<p className="text-[11px] font-semibold text-zinc-500">Name</p>
						<p className="text-[11px] font-semibold text-zinc-500">Date Modified</p>
						<p className="text-[11px] font-semibold text-zinc-500">Date Created</p>
						<div />
					</div>

					{/* Diagram list */}
					<div className="flex-1 overflow-y-auto">
						{!isAuthenticated ? (
							<div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
								<p className="text-sm text-zinc-500">Sign in to manage your diagrams</p>
								<button onClick={() => openAuthModal('login')} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">
									Sign in
								</button>
							</div>
						) : !selectedProject ? (
							<div className="flex flex-col items-center justify-center h-full gap-2">
								<FolderOpen size={32} className="text-zinc-700" />
								<p className="text-sm text-zinc-500">Select or create a project</p>
							</div>
						) : loadingDiagrams ? (
							<div className="flex items-center justify-center h-32 gap-2 text-xs text-zinc-500">
								<Loader2 size={14} className="animate-spin" /> Loading…
							</div>
						) : diagramError ? (
							<div className="flex items-center justify-center h-32">
								<p className="text-xs text-red-400">{diagramError}</p>
							</div>
						) : filtered.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-48 gap-2">
								<FileText size={28} className="text-zinc-700" />
								<p className="text-xs text-zinc-500">
									{search ? 'No diagrams match your search' : 'No diagrams yet — create one!'}
								</p>
							</div>
						) : (
							filtered.map((d) => (
								<div
									key={d.id}
									onClick={() => renamingDiagramId !== d.id && openDiagramItem(d)}
									className="group grid grid-cols-[1fr_180px_180px_40px] gap-2 items-center px-5 py-3.5 border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors"
								>
									<div className="flex items-center gap-2.5 min-w-0">
										<FileText size={14} className="text-zinc-600 shrink-0" />
										{renamingDiagramId === d.id ? (
											<input
												autoFocus
												value={renameDiagramVal}
												onChange={(e) => setRenameDiagramVal(e.target.value)}
												onBlur={() => commitRenameDiagram(d.id)}
												onKeyDown={(e) => {
													if (e.key === 'Enter') commitRenameDiagram(d.id)
													if (e.key === 'Escape') setRenamingDiagramId(null)
												}}
												onClick={(e) => e.stopPropagation()}
												className="flex-1 text-xs bg-zinc-700 border border-blue-500 rounded px-2 py-0.5 text-zinc-100 outline-none"
											/>
										) : (
											<span className="text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
												{d.name}
											</span>
										)}
									</div>
									<p className="text-xs text-zinc-500">{formatDate(d.updatedAt)}</p>
									<p className="text-xs text-zinc-500">{formatDate(d.createdAt)}</p>
									<DiagramMenu
										onOpen={() => openDiagramItem(d)}
										onRename={() => { setRenamingDiagramId(d.id); setRenameDiagramVal(d.name) }}
										onDelete={() => setDialog({ type: 'delete-diagram', id: d.id })}
									/>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>

		{/* ── Project context menu (fixed, avoids overflow clip) ── */}
		{projectMenuId && projectMenuPos && createPortal(
			<div
				id={`proj-menu-${projectMenuId}`}
				style={{ position: 'fixed', left: projectMenuPos.x - 128, top: projectMenuPos.y, zIndex: 9999 }}
				className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1"
			>
				<button
					onClick={() => {
						const p = projects.find((x) => x.id === projectMenuId)
						if (p) setDialog({ type: 'rename-project', id: p.id, name: p.name })
						setProjectMenuId(null); setProjectMenuPos(null)
					}}
					className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors"
				>
					<Pencil size={10} /> Rename
				</button>
				<button
					onClick={() => {
						const p = projects.find((x) => x.id === projectMenuId)
						if (p) setDialog({ type: 'delete-project', id: p.id, name: p.name })
						setProjectMenuId(null); setProjectMenuPos(null)
					}}
					className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700 transition-colors"
				>
					<Trash2 size={10} /> Delete
				</button>
			</div>,
			document.body,
		)}

		{/* ── Dialogs (portaled to body to avoid stacking context issues) ── */}
		{dialog && createPortal(
			<>
				{dialog.type === 'new-diagram' && (
					<NameDialog
						title="New diagram"
						placeholder="Diagram name…"
						confirmLabel="Create"
						onConfirm={createDiagram}
						onCancel={() => setDialog(null)}
					/>
				)}
				{dialog.type === 'new-project' && (
					<NameDialog
						title="New project"
						placeholder="Project name…"
						confirmLabel="Create"
						onConfirm={createProject}
						onCancel={() => setDialog(null)}
					/>
				)}
				{dialog.type === 'rename-project' && (
					<NameDialog
						title="Rename project"
						placeholder="Project name…"
						defaultValue={dialog.name}
						confirmLabel="Rename"
						onConfirm={(name) => commitRenameProject(dialog.id, name)}
						onCancel={() => setDialog(null)}
					/>
				)}
				{dialog.type === 'delete-project' && (
					<ConfirmDialog
						message={`Delete project "${dialog.name}" and all its diagrams? This cannot be undone.`}
						onConfirm={() => deleteProject(dialog.id)}
						onCancel={() => setDialog(null)}
					/>
				)}
				{dialog.type === 'delete-diagram' && (
					<ConfirmDialog
						message="Delete this diagram? This cannot be undone."
						onConfirm={() => deleteDiagram(dialog.id)}
						onCancel={() => setDialog(null)}
					/>
				)}
			</>,
			document.body,
		)}
	</>
	)
}
