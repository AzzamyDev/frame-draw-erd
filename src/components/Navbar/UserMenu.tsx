import { useState, useRef, useEffect } from 'react'
import { LayoutGrid, LogOut, UserCog } from 'lucide-react'
import { useStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import ProfileModal from '@/components/ProfileModal'

export default function UserMenu() {
	const { user, clearAuth, toggleDiagramsPanel, showDiagramsPanel } = useStore()
	const [open, setOpen] = useState(false)
	const [showProfile, setShowProfile] = useState(false)
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
		}
		document.addEventListener('mousedown', handleClick)
		return () => document.removeEventListener('mousedown', handleClick)
	}, [])

	const initials = user?.name
		? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
		: user?.email?.[0]?.toUpperCase() ?? '?'

	const handleSignOut = async () => {
		try { await authApi.logout() } catch {}
		clearAuth()
		setOpen(false)
	}

	return (
		<>
			<div ref={ref} className="relative">
				<button
					onClick={() => setOpen((o) => !o)}
					className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors overflow-hidden"
				>
					{user?.avatarUrl
						? <img src={user.avatarUrl} alt={initials} className="w-8 h-8 rounded-full object-cover" />
						: initials}
				</button>

				{open && (
					<div className="absolute right-0 top-10 w-52 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl z-50 py-1 text-sm">
						<div className="px-3 py-2.5 border-b border-zinc-800">
							<p className="font-medium text-zinc-100 truncate">{user?.name ?? user?.email}</p>
							{user?.name && <p className="text-xs text-zinc-500 truncate">{user.email}</p>}
						</div>

						<button
							onClick={() => { toggleDiagramsPanel(); setOpen(false) }}
							className="flex items-center gap-2 w-full px-3 py-2 text-zinc-300 hover:bg-zinc-800 transition-colors"
						>
							<LayoutGrid size={14} />
							{showDiagramsPanel ? 'Hide My Diagrams' : 'My Diagrams'}
						</button>

						<button
							onClick={() => { setShowProfile(true); setOpen(false) }}
							className="flex items-center gap-2 w-full px-3 py-2 text-zinc-300 hover:bg-zinc-800 transition-colors"
						>
							<UserCog size={14} />
							Edit Profile
						</button>

						<div className="border-t border-zinc-800 mt-1 pt-1">
							<button
								onClick={handleSignOut}
								className="flex items-center gap-2 w-full px-3 py-2 text-red-400 hover:bg-zinc-800 transition-colors"
							>
								<LogOut size={14} />
								Sign out
							</button>
						</div>
					</div>
				)}
			</div>

			{showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
		</>
	)
}
