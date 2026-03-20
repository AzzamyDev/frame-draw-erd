import { useStore } from '@/lib/store'
import { CloudUpload, Database } from 'lucide-react'
import { useState } from 'react'
import { AIBar } from './AIBar'
import SaveDiagramModal from './Navbar/SaveDiagramModal'
import UserMenu from './Navbar/UserMenu'
import { Toolbar } from './Toolbar'

export function Navbar() {
	const { isAuthenticated, openAuthModal, currentDiagram } = useStore()
	const [showSaveModal, setShowSaveModal] = useState(false)

	return (
		<>
			<header className="h-14 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10 shrink-0 gap-3">
				{/* Logo */}
				<div className="flex items-center gap-2 shrink-0">
					<div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
						<Database size={14} className="text-white" />
					</div>
					<div>
						<span className="font-bold text-gray-900 dark:text-white text-sm">Frame</span>
						<span className="text-gray-400 dark:text-gray-500 text-[10px] hidden sm:block">
							Drawing ERD Tool
						</span>
					</div>
				</div>

				<div className='grow flex items-center justify-end gap-2'>

					{/* AI Bar */}
					<AIBar />

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
