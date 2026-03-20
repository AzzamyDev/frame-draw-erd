import React, { useEffect, useState, useRef } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Navbar } from './components/Navbar'
import { Editor } from './components/Editor/Editor'
import { Canvas } from './components/Canvas/Canvas'
import { useStore } from './lib/store'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAutoSave } from './hooks/useAutoSave'
import AuthModal from './components/Auth/AuthModal'
import DiagramsPanel from './components/DiagramsPanel/DiagramsPanel'

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 600
const DEFAULT_SIDEBAR_WIDTH = 320

export default function App() {
	const { darkMode, reParse, clearAuth, openAuthModal, showAuthModal, showDiagramsPanel } = useStore()
	const [collapsed, setCollapsed] = useState(false)
	const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
	const dragging = useRef(false)
	const startX = useRef(0)
	const startWidth = useRef(0)

	useAutoSave()

	useEffect(() => {
		document.documentElement.classList.toggle('dark', darkMode)
	}, [darkMode])

	useEffect(() => { reParse() }, [])

	useEffect(() => {
		const handler = () => { clearAuth(); openAuthModal() }
		window.addEventListener('auth:expired', handler)
		return () => window.removeEventListener('auth:expired', handler)
	}, [])

	const onMouseDown = (e: React.MouseEvent) => {
		dragging.current = true
		startX.current = e.clientX
		startWidth.current = sidebarWidth
		document.body.style.cursor = 'col-resize'
		document.body.style.userSelect = 'none'
	}

	useEffect(() => {
		const onMouseMove = (e: MouseEvent) => {
			if (!dragging.current) return
			const delta = e.clientX - startX.current
			setSidebarWidth(Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, startWidth.current + delta)))
		}
		const onMouseUp = () => {
			dragging.current = false
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
		}
		window.addEventListener('mousemove', onMouseMove)
		window.addEventListener('mouseup', onMouseUp)
		return () => {
			window.removeEventListener('mousemove', onMouseMove)
			window.removeEventListener('mouseup', onMouseUp)
		}
	}, [])

	return (
		<div className={`flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
			<ReactFlowProvider>
				<Navbar />

				<div className="flex flex-1 overflow-hidden">
					{/* Sidebar */}
					<div
						className="flex shrink-0 relative border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
						style={{ width: collapsed ? 36 : sidebarWidth }}
					>
						<button
							onClick={() => setCollapsed((v) => !v)}
							className="absolute top-2 right-2 z-10 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
							title={collapsed ? 'Expand editor' : 'Collapse editor'}
						>
							{collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
						</button>
						{!collapsed && (
							<div className="flex-1 overflow-hidden">
								<Editor collapsed={collapsed} />
							</div>
						)}
					</div>

					{/* Resize handle */}
					{!collapsed && (
						<div
							className="w-1 bg-transparent hover:bg-blue-400/30 dark:hover:bg-blue-500/20 cursor-col-resize transition-colors"
							onMouseDown={onMouseDown}
						/>
					)}

					{/* Canvas */}
					<div className="flex-1 overflow-hidden">
						<Canvas />
					</div>
				</div>

				{/* Modals */}
				{showDiagramsPanel && <DiagramsPanel />}
				{showAuthModal && <AuthModal />}
			</ReactFlowProvider>
		</div>
	)
}
