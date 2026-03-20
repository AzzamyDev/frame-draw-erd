import React from 'react'
import { Database } from 'lucide-react'
import { AIBar } from './AIBar'
import { Toolbar } from './Toolbar'

export function Navbar() {
	return (
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

			{/* AI Bar */}
			<AIBar />

			{/* Toolbar */}
			<Toolbar />
		</header>
	)
}
