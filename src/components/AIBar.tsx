import React, { useState } from 'react'
import { Sparkles, Loader2, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useReactFlow } from '@xyflow/react'

const SYSTEM_PROMPT = `You are a DBML schema generator. Output ONLY valid DBML code. No explanation, no markdown fences, no extra text. Use the full DBML spec: Table blocks with typed fields, pk, not null, unique, default, increment annotations, Enum blocks for enumerated types, Ref statements with proper cardinality operators (>, <, -, <>), ref names, and indexes blocks where appropriate.`

export function AIBar() {
	const [prompt, setPrompt] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const { setDbmlCode } = useStore()
	const { fitView } = useReactFlow()

	const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY

	const handleGenerate = async () => {
		if (!prompt.trim() || loading) return
		if (!apiKey) {
			setError('Set VITE_ANTHROPIC_API_KEY in .env to use AI')
			return
		}

		setLoading(true)
		setError('')

		try {
			const res = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
					'content-type': 'application/json',
					'anthropic-dangerous-direct-browser-calls': 'true',
				},
				body: JSON.stringify({
					model: 'claude-sonnet-4-20250514',
					max_tokens: 2000,
					system: SYSTEM_PROMPT,
					messages: [{ role: 'user', content: prompt }],
				}),
			})

			if (!res.ok) {
				const err = await res.json().catch(() => ({}))
				throw new Error((err as any).error?.message || `HTTP ${res.status}`)
			}

			const data = await res.json()
			const dbml = data.content?.[0]?.text || ''
			if (!dbml.trim()) throw new Error('Empty response from Claude')

			setDbmlCode(dbml.trim())
			setPrompt('')
			// Fit view after layout settles
			setTimeout(() => fitView({ padding: 0.12, duration: 500 }), 300)
		} catch (err: any) {
			setError(err.message || 'Unknown error')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex items-center gap-2 flex-1 min-w-0 max-w-lg mx-4">
			<div className="relative flex-1">
				<div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400">
					<Sparkles size={14} />
				</div>
				<input
					value={prompt}
					onChange={(e) => {
						setPrompt(e.target.value)
						setError('')
					}}
					onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
					placeholder="Describe your database schema for AI generation..."
					className={`w-full pl-8 pr-10 py-1.5 text-sm rounded-lg border transition-colors
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            border-gray-300 dark:border-gray-600
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:opacity-60
            ${error ? 'border-red-400 focus:ring-red-400' : ''}
          `}
					disabled={loading}
				/>
				<button
					onClick={handleGenerate}
					disabled={loading || !prompt.trim()}
					className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-blue-500 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
					title={loading ? 'Generating…' : 'Generate with AI (Enter)'}
				>
					{loading ? (
						<Loader2 size={15} className="animate-spin" />
					) : (
						<span className="text-[10px] font-semibold text-blue-500">GO</span>
					)}
				</button>
			</div>

			{error && (
				<div className="flex items-center gap-1 text-xs text-red-500 max-w-[200px] shrink-0">
					<span className="truncate" title={error}>
						{error}
					</span>
					<button onClick={() => setError('')} className="shrink-0 hover:text-red-700">
						<X size={11} />
					</button>
				</div>
			)}
		</div>
	)
}
