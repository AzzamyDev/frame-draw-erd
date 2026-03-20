import { useState } from 'react'
import { FileText, Pencil, Trash2, Check, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { diagramsApi } from '@/lib/api'
import type { DiagramSummary } from '@/lib/types'

interface Props {
	projectId: string
	diagram: DiagramSummary
	onDelete: (id: string) => void
	onRename: (id: string, name: string) => void
}

const INITIAL_DBML_SNIPPET = 'Enum order_status'

export default function DiagramRow({ projectId, diagram, onDelete, onRename }: Props) {
	const { currentDiagram, openDiagram, toggleDiagramsPanel, dbmlCode } = useStore()
	const isActive = currentDiagram?.id === diagram.id
	const [editing, setEditing] = useState(false)
	const [nameVal, setNameVal] = useState(diagram.name)
	const [loading, setLoading] = useState(false)

	const handleOpen = async () => {
		if (isActive) { toggleDiagramsPanel(); return }

		// Warn if user has unsaved local content
		if (!currentDiagram && dbmlCode.includes(INITIAL_DBML_SNIPPET) === false) {
			if (!window.confirm('Opening this diagram will replace your current unsaved work. Continue?')) return
		}

		setLoading(true)
		try {
			const full = await diagramsApi.get(projectId, diagram.id)
			openDiagram(full)
			toggleDiagramsPanel()
		} catch {
			// silent
		} finally {
			setLoading(false)
		}
	}

	const commitRename = async () => {
		setEditing(false)
		const trimmed = nameVal.trim()
		if (!trimmed || trimmed === diagram.name) return
		try {
			await diagramsApi.rename(projectId, diagram.id, trimmed)
			onRename(diagram.id, trimmed)
		} catch {
			setNameVal(diagram.name)
		}
	}

	const handleDelete = async (e: React.MouseEvent) => {
		e.stopPropagation()
		if (!window.confirm(`Delete diagram "${diagram.name}"?`)) return
		try {
			await diagramsApi.delete(projectId, diagram.id)
			onDelete(diagram.id)
		} catch {}
	}

	return (
		<div
			className={`group flex items-center gap-1.5 pl-8 pr-2 py-1.5 cursor-pointer rounded-md mx-1 transition-colors ${
				isActive
					? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500 pl-7'
					: 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
			}`}
			onClick={!editing ? handleOpen : undefined}
		>
			<FileText
				size={13}
				className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-zinc-400'}`}
			/>

			{editing ? (
				<input
					autoFocus
					value={nameVal}
					onChange={(e) => setNameVal(e.target.value)}
					onBlur={commitRename}
					onKeyDown={(e) => {
						if (e.key === 'Enter') commitRename()
						if (e.key === 'Escape') { setEditing(false); setNameVal(diagram.name) }
					}}
					onClick={(e) => e.stopPropagation()}
					className="flex-1 text-xs bg-transparent border-b border-blue-500 outline-none text-zinc-900 dark:text-zinc-100"
				/>
			) : (
				<span className={`flex-1 text-xs truncate ${isActive ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>
					{loading ? 'Loading…' : diagram.name}
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
						onClick={handleDelete}
						className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500"
					>
						<Trash2 size={11} />
					</button>
				</div>
			)}
		</div>
	)
}
