import { useEffect, useState } from 'react'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { useStore } from '@/lib/store'

export default function SaveStatusIndicator() {
	const saveStatus = useStore((s) => s.saveStatus)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		if (saveStatus === 'idle') {
			setVisible(false)
			return
		}
		setVisible(true)
		if (saveStatus === 'saved') {
			const t = setTimeout(() => setVisible(false), 3000)
			return () => clearTimeout(t)
		}
	}, [saveStatus])

	if (!visible) return null

	return (
		<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium select-none">
			{saveStatus === 'saving' && (
				<>
					<Loader2 size={12} className="animate-spin text-zinc-500" />
					<span className="text-zinc-500 dark:text-zinc-400">Saving…</span>
				</>
			)}
			{saveStatus === 'saved' && (
				<>
					<Check size={12} className="text-green-600 dark:text-green-400" />
					<span className="text-green-600 dark:text-green-400">Saved</span>
				</>
			)}
			{saveStatus === 'failed' && (
				<>
					<AlertCircle size={12} className="text-red-500" />
					<span className="text-red-500">Save failed</span>
				</>
			)}
		</div>
	)
}
