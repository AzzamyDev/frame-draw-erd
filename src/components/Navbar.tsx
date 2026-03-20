import React, { useState, useRef } from 'react'
import { Database, CloudUpload } from 'lucide-react'
import { AIBar } from './AIBar'
import { Toolbar } from './Toolbar'
import { useStore } from '@/lib/store'
import { diagramsApi } from '@/lib/api'
import SaveStatusIndicator from './Navbar/SaveStatusIndicator'
import SaveDiagramModal from './Navbar/SaveDiagramModal'
import UserMenu from './Navbar/UserMenu'

function DiagramNameEditor() {
	const { currentDiagram, setSaveStatus } = useStore()
	const [editing, setEditing] = useState(false)
	const [value, setValue] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)

	if (!currentDiagram) return null

	const startEdit = () => {
		setValue(currentDiagram.name)
		setEditing(true)
		setTimeout(() => inputRef.current?.select(), 0)
	}

	const commit = async () => {
		setEditing(false)
		const trimmed = value.trim()
		if (!trimmed || trimmed === currentDiagram.name) return
		try {
			await diagramsApi.rename(currentDiagram.projectId, currentDiagram.id, trimmed)
			useStore.setState((s) => ({
				currentDiagram: s.currentDiagram ? { ...s.currentDiagram, name: trimmed } : null,
			}))
		} catch {
			setSaveStatus('failed')
		}
	}

	if (editing) {
		return (
			<input
				ref={inputRef}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === 'Enter') commit()
					if (e.key === 'Escape') setEditing(false)
				}}
				className="text-sm font-medium text-zinc-900 dark:text-zinc-100 bg-transparent border-b border-blue-500 outline-none px-0.5 max-w-[200px]"
			/>
		)
	}

	return (
		<button
			onClick={startEdit}
			title="Click to rename"
			className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 truncate max-w-[200px]"
		>
			{currentDiagram.name}
		</button>
	)
}

export function Navbar() {
	const { isAuthenticated, openAuthModal, currentDiagram } = useStore()
	const [showSaveModal, setShowSaveModal] = useState(false)

	return (
		<>
			<header className="h-12 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10 shrink-0 gap-3">
				{/* Logo */}
				<div className="flex items-center gap-2 shrink-0">
					<div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
						<Database size={14} className="text-white" />
					</div>
					<span className="font-bold text-gray-900 dark:text-white text-sm">Frame</span>
					<span className="text-gray-400 dark:text-gray-500 text-xs hidden sm:block">
						DB Diagram
					</span>
				</div>

				{/* Diagram name */}
				<DiagramNameEditor />

				{/* Save status */}
				<SaveStatusIndicator />
				{/* AI Bar */}
				{/* <AIBar /> */}
				<div className='grow flex items-center justify-end gap-2'>

					{/* Toolbar */}
					<Toolbar />

					{/* Save to cloud (only when authenticated but no currentDiagram) */}
					{isAuthenticated && !currentDiagram && (
						<button
							onClick={() => setShowSaveModal(true)}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shrink-0"
						>
							<CloudUpload size={13} />
							Save
						</button>
					)}

					{/* Auth */}
					{isAuthenticated ? (
						<UserMenu />
					) : (
						<button
							onClick={() => openAuthModal('login')}
							className="ml-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shrink-0"
						>
							Sign in
						</button>
					)}
				</div>
			</header>

			{showSaveModal && <SaveDiagramModal onClose={() => setShowSaveModal(false)} />}
		</>
	)
}
