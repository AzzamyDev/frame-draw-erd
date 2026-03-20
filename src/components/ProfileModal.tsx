import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Lock, Trash2, Loader2, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { useStore } from '@/lib/store'
import { userApi, authApi } from '@/lib/api'

type Tab = 'profile' | 'password' | 'delete'

interface Props {
	onClose: () => void
}

function PasswordInput({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string
	value: string
	onChange: (v: string) => void
	placeholder?: string
}) {
	const [show, setShow] = useState(false)
	return (
		<div>
			<label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
			<div className="relative">
				<input
					type={show ? 'text' : 'password'}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 pr-9 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
				/>
				<button
					type="button"
					onClick={() => setShow((s) => !s)}
					className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
				>
					{show ? <EyeOff size={14} /> : <Eye size={14} />}
				</button>
			</div>
		</div>
	)
}

export default function ProfileModal({ onClose }: Props) {
	const { user, setAuth, clearAuth, accessToken, refreshToken } = useStore()
	const [tab, setTab] = useState<Tab>('profile')

	// Refresh user from API on open so `hasPassword` is always fresh
	useEffect(() => {
		userApi.me().then((fresh) => {
			if (accessToken && refreshToken) setAuth(fresh, accessToken, refreshToken)
		}).catch(() => {})
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// ── Edit Profile ──────────────────────────────────────────────────────────
	const [name, setName] = useState(user?.name ?? '')
	const [email, setEmail] = useState(user?.email ?? '')

	// Sync inputs when user refreshes from API
	useEffect(() => { setName(user?.name ?? '') }, [user?.name])
	useEffect(() => { setEmail(user?.email ?? '') }, [user?.email])
	const [profileLoading, setProfileLoading] = useState(false)
	const [profileSuccess, setProfileSuccess] = useState(false)
	const [profileError, setProfileError] = useState<string | null>(null)

	const handleSaveProfile = async () => {
		setProfileLoading(true)
		setProfileError(null)
		setProfileSuccess(false)
		try {
			const updated = await userApi.updateProfile({ name: name.trim() || undefined, email: email.trim() || undefined })
			// persist updated user in store while keeping tokens
			if (accessToken && refreshToken) setAuth(updated, accessToken, refreshToken)
			setProfileSuccess(true)
			setTimeout(() => setProfileSuccess(false), 2500)
		} catch (e: unknown) {
			setProfileError(e instanceof Error ? e.message : 'Failed to update profile')
		} finally {
			setProfileLoading(false)
		}
	}

	// ── Change Password ───────────────────────────────────────────────────────
	const [currentPw, setCurrentPw] = useState('')
	const [newPw, setNewPw] = useState('')
	const [confirmPw, setConfirmPw] = useState('')
	const [pwLoading, setPwLoading] = useState(false)
	const [pwSuccess, setPwSuccess] = useState(false)
	const [pwError, setPwError] = useState<string | null>(null)

	const handleChangePassword = async () => {
		if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
		if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return }
		setPwLoading(true)
		setPwError(null)
		setPwSuccess(false)
		try {
			await userApi.changePassword({ currentPassword: currentPw, newPassword: newPw })
			setPwSuccess(true)
			setCurrentPw(''); setNewPw(''); setConfirmPw('')
			setTimeout(() => setPwSuccess(false), 2500)
		} catch (e: unknown) {
			setPwError(e instanceof Error ? e.message : 'Failed to change password')
		} finally {
			setPwLoading(false)
		}
	}

	// ── Delete Account ────────────────────────────────────────────────────────
	const [deletePw, setDeletePw] = useState('')
	const [deleteConfirm, setDeleteConfirm] = useState('')
	const [deleteLoading, setDeleteLoading] = useState(false)
	const [deleteError, setDeleteError] = useState<string | null>(null)
	// hasPassword: true jika field undefined tapi bukan akun GitHub-only (data lama di localStorage)
	const hasPassword = user?.hasPassword ?? !user?.githubUsername

	const CONFIRM_TEXT = 'delete my account'

	const handleDeleteAccount = async () => {
		if (deleteConfirm !== CONFIRM_TEXT) { setDeleteError(`Type "${CONFIRM_TEXT}" to confirm`); return }
		setDeleteLoading(true)
		setDeleteError(null)
		try {
			await userApi.deleteAccount(user?.hasPassword ? deletePw : undefined)
			try { await authApi.logout() } catch {}
			clearAuth()
			onClose()
		} catch (e: unknown) {
			setDeleteError(e instanceof Error ? e.message : 'Failed to delete account')
		} finally {
			setDeleteLoading(false)
		}
	}

	const initials = user?.name
		? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
		: user?.email?.[0]?.toUpperCase() ?? '?'

	const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
		{ id: 'profile', label: 'Edit Profile', icon: <User size={14} /> },
		{ id: 'password', label: 'Password', icon: <Lock size={14} /> },
		{ id: 'delete', label: 'Delete Account', icon: <Trash2 size={14} /> },
	]

	const modal = (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
		>
			<div className="w-[520px] max-w-[95vw] rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden shrink-0">
							{user?.avatarUrl
								? <img src={user.avatarUrl} className="w-full h-full object-cover" />
								: initials}
						</div>
						<div>
							<p className="text-sm font-semibold text-zinc-100">{user?.name ?? user?.email ?? 'My Account'}</p>
							{user?.name && <p className="text-xs text-zinc-500">{user.email}</p>}
						</div>
					</div>
					<button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
						<X size={16} />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-zinc-800">
					{tabs.map((t) => (
						<button
							key={t.id}
							onClick={() => setTab(t.id)}
							className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors border-b-2 -mb-px ${
								tab === t.id
									? t.id === 'delete'
										? 'border-red-500 text-red-400'
										: 'border-blue-500 text-blue-400'
									: 'border-transparent text-zinc-500 hover:text-zinc-300'
							}`}
						>
							{t.icon}
							{t.label}
						</button>
					))}
				</div>

				{/* Tab content */}
				<div className="px-6 py-5">

					{/* ── Edit Profile ── */}
					{tab === 'profile' && (
						<div className="space-y-4">
							<div>
								<label className="block text-xs font-medium text-zinc-400 mb-1.5">Display name</label>
								<input
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Your name"
									className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="your@email.com"
									className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
								/>
							</div>
							{user?.githubUsername && (
								<div>
									<label className="block text-xs font-medium text-zinc-400 mb-1.5">GitHub</label>
									<div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2.5">
										<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-zinc-400">
											<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.748 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
										</svg>
										<span className="text-sm text-zinc-300">@{user.githubUsername}</span>
										<span className="ml-auto text-[10px] text-zinc-600 bg-zinc-700/50 px-2 py-0.5 rounded-full">Connected</span>
									</div>
								</div>
							)}

							{profileError && <p className="text-xs text-red-400">{profileError}</p>}

							<button
								onClick={handleSaveProfile}
								disabled={profileLoading}
								className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
							>
								{profileLoading ? (
									<><Loader2 size={14} className="animate-spin" /> Saving…</>
								) : profileSuccess ? (
									<><Check size={14} /> Saved!</>
								) : 'Save changes'}
							</button>
						</div>
					)}

					{/* ── Change Password ── */}
					{tab === 'password' && (
						<div className="space-y-4">
							{!hasPassword ? (
								<div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
									<AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
									<div>
										<p className="text-sm font-medium text-zinc-200 mb-1">GitHub account</p>
										<p className="text-xs text-zinc-400">
											Your account was created via GitHub OAuth and doesn't have a password.
											Password change is not available.
										</p>
									</div>
								</div>
							) : (
								<>
									<PasswordInput label="Current password" value={currentPw} onChange={setCurrentPw} />
									<PasswordInput label="New password" value={newPw} onChange={setNewPw} placeholder="Min. 8 characters" />
									<PasswordInput label="Confirm new password" value={confirmPw} onChange={setConfirmPw} />

									{pwError && <p className="text-xs text-red-400">{pwError}</p>}

									<button
										onClick={handleChangePassword}
										disabled={pwLoading || !currentPw || !newPw || !confirmPw}
										className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
									>
										{pwLoading ? (
											<><Loader2 size={14} className="animate-spin" /> Updating…</>
										) : pwSuccess ? (
											<><Check size={14} /> Updated!</>
										) : 'Update password'}
									</button>
								</>
							)}
						</div>
					)}

					{/* ── Delete Account ── */}
					{tab === 'delete' && (
						<div className="space-y-4">
							<div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-900/50">
								<AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
								<div>
									<p className="text-sm font-medium text-red-300 mb-1">This action is permanent</p>
									<p className="text-xs text-red-400/80">
										All your projects and diagrams will be deleted immediately and cannot be recovered.
									</p>
								</div>
							</div>

							{hasPassword && (
								<PasswordInput
									label="Enter your password to confirm"
									value={deletePw}
									onChange={setDeletePw}
									placeholder="Your current password"
								/>
							)}

							<div>
								<label className="block text-xs font-medium text-zinc-400 mb-1.5">
									Type <span className="font-mono text-red-400">{CONFIRM_TEXT}</span> to confirm
								</label>
								<input
									value={deleteConfirm}
									onChange={(e) => setDeleteConfirm(e.target.value)}
									placeholder={CONFIRM_TEXT}
									className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-red-500 transition-colors"
								/>
							</div>

							{deleteError && <p className="text-xs text-red-400">{deleteError}</p>}

							<button
								onClick={handleDeleteAccount}
								disabled={deleteLoading || deleteConfirm !== CONFIRM_TEXT || (hasPassword && !deletePw)}
								className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
							>
								{deleteLoading ? (
									<><Loader2 size={14} className="animate-spin" /> Deleting…</>
								) : (
									<><Trash2 size={14} /> Delete my account</>
								)}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	)

	return createPortal(modal, document.body)
}
