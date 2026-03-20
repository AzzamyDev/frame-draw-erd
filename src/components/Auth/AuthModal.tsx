import { useState } from 'react'
import { X, Github, Loader2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { authApi } from '@/lib/api'

export default function AuthModal() {
	const { authModalTab, closeAuthModal, setAuth, openAuthModal } = useStore()
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const isLogin = authModalTab === 'login'

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setLoading(true)
		try {
			const res = isLogin
				? await authApi.login({ email, password })
				: await authApi.register({ name: name || undefined, email, password })
			setAuth(res.user, res.accessToken, res.refreshToken)
			closeAuthModal()
		} catch (err: any) {
			setError(err.message || 'Something went wrong')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="w-[420px] rounded-xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-700">
				{/* Header */}
				<div className="flex items-center justify-between px-6 pt-5 pb-4">
					<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						{isLogin ? 'Sign in to Frame' : 'Create an account'}
					</h2>
					<button
						onClick={closeAuthModal}
						className="rounded-md p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
					>
						<X size={18} />
					</button>
				</div>

				<div className="px-6 pb-6 space-y-4">
					{/* GitHub button */}
					<a
						href={authApi.getGithubUrl()}
						className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-sm transition-colors"
					>
						<Github size={16} />
						Continue with GitHub
					</a>

					<div className="flex items-center gap-3 text-xs text-zinc-400">
						<hr className="flex-1 border-zinc-200 dark:border-zinc-700" />
						or
						<hr className="flex-1 border-zinc-200 dark:border-zinc-700" />
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-3">
						{!isLogin && (
							<div>
								<label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
									Name (optional)
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Your name"
									className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>
						)}

						<div>
							<label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
								Email
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
								required
								className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<div>
							<label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
								Password
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								required
								minLength={6}
								className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{error && (
							<p className="text-xs text-red-500 dark:text-red-400">{error}</p>
						)}

						<button
							type="submit"
							disabled={loading}
							className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium text-sm transition-colors"
						>
							{loading && <Loader2 size={14} className="animate-spin" />}
							{isLogin ? 'Sign in' : 'Create account'}
						</button>
					</form>

					{/* Toggle tab */}
					<p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
						{isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
						<button
							onClick={() => openAuthModal(isLogin ? 'register' : 'login')}
							className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
						>
							{isLogin ? 'Sign up' : 'Sign in'}
						</button>
					</p>
				</div>
			</div>
		</div>
	)
}
