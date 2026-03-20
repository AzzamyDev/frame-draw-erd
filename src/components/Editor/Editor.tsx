import React, { useEffect, useRef, useState } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { oneDark } from '@codemirror/theme-one-dark'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'
import { FileText, WandSparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { diagramsApi } from '@/lib/api'
import { dbmlExtensions } from './dbml-language'
import SaveStatusIndicator from '../Navbar/SaveStatusIndicator'

let debounceTimer: ReturnType<typeof setTimeout>

/** Format DBML code: consistent 2-space indentation, single blank lines between blocks */
function beautifyDBML(code: string): string {
	const lines = code.split('\n')
	const out: string[] = []
	let depth = 0

	for (const raw of lines) {
		const line = raw.trim()

		if (!line) {
			// Allow max one consecutive blank line
			if (out.length > 0 && out[out.length - 1] !== '') out.push('')
			continue
		}

		if (line === '}') {
			depth = Math.max(0, depth - 1)
			out.push('  '.repeat(depth) + '}')
			// Blank line after every top-level closing brace
			if (depth === 0) out.push('')
			continue
		}

		out.push('  '.repeat(depth) + line)

		if (line.endsWith('{')) depth++
	}

	// Trim leading/trailing blank lines
	while (out.length > 0 && out[0] === '') out.shift()
	while (out.length > 0 && out[out.length - 1] === '') out.pop()

	return out.join('\n')
}

/** Find 0-based line index of a field inside its Table block */
function findFieldLine(code: string, tableName: string, fieldName: string): number {
	const lines = code.split('\n')
	let inTargetTable = false

	for (let i = 0; i < lines.length; i++) {
		const trimmed = lines[i].trim()

		if (/^Table\s+/.test(trimmed)) {
			const m = trimmed.match(/^Table\s+(\S+)/)
			inTargetTable = m ? m[1] === tableName : false
			continue
		}

		if (inTargetTable && trimmed === '}') {
			inTargetTable = false
			continue
		}

		if (inTargetTable) {
			const firstToken = trimmed.split(/[\s\[]/)[0]
			if (firstToken === fieldName) return i
		}
	}
	return -1
}

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
				className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent border-b border-blue-500 outline-none px-0.5 max-w-[160px]"
			/>
		)
	}

	return (
		<button
			onClick={startEdit}
			title="Click to rename"
			className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-blue-500 dark:hover:text-blue-400 truncate max-w-[160px] transition-colors"
		>
			{currentDiagram.name}
		</button>
	)
}

export function Editor({ collapsed }: { collapsed: boolean }) {
	const { currentDiagram } = useStore()
	const containerRef = useRef<HTMLDivElement>(null)
	const viewRef = useRef<EditorView | null>(null)
	const { dbmlCode, setDbmlCode, parseError, darkMode, focusTarget, setFocusTarget } = useStore()

	const onChangeRef = useRef(setDbmlCode)
	onChangeRef.current = setDbmlCode

	useEffect(() => {
		if (!containerRef.current) return

		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				const code = update.state.doc.toString()
				clearTimeout(debounceTimer)
				debounceTimer = setTimeout(() => {
					onChangeRef.current(code)
				}, 400)
			}
		})

		const extensions = [
			basicSetup,
			updateListener,
			keymap.of([indentWithTab]), // ← Tab key inserts indent
			bracketMatching(),
			closeBrackets(),
			indentOnInput(),
			...dbmlExtensions(darkMode),
			EditorView.theme({
				'&': { height: '100%', fontSize: '13px' },
				'.cm-scroller': {
					overflow: 'auto',
					fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
				},
				'.cm-content': { minHeight: '100%', padding: '8px 0' },
				'.cm-line': { padding: '0 12px' },
				'.cm-gutters': { minWidth: '40px' },
			}),
		]

		if (darkMode) extensions.push(oneDark)

		const state = EditorState.create({ doc: dbmlCode, extensions })
		const view = new EditorView({ state, parent: containerRef.current })
		viewRef.current = view

		return () => {
			view.destroy()
			viewRef.current = null
		}
	}, [darkMode])

	// Sync external code changes (AI generate, etc.) without losing cursor
	useEffect(() => {
		const view = viewRef.current
		if (!view) return
		const currentDoc = view.state.doc.toString()
		if (currentDoc !== dbmlCode) {
			view.dispatch({ changes: { from: 0, to: currentDoc.length, insert: dbmlCode } })
		}
	}, [dbmlCode])

	// Navigate to field line when double-clicked from canvas
	useEffect(() => {
		if (!focusTarget || !viewRef.current) return
		const view = viewRef.current
		const code = view.state.doc.toString()
		const lineIdx = findFieldLine(code, focusTarget.table, focusTarget.field)

		if (lineIdx >= 0) {
			const line = view.state.doc.line(lineIdx + 1)
			view.dispatch({
				selection: { anchor: line.from, head: line.to },
				effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
			})
			view.focus()
		}

		setFocusTarget(null)
	}, [focusTarget, setFocusTarget])

	const handleBeautify = () => {
		const view = viewRef.current
		if (!view) return
		const current = view.state.doc.toString()
		const formatted = beautifyDBML(current)
		if (formatted === current) return
		view.dispatch({ changes: { from: 0, to: current.length, insert: formatted } })
		// Also update store so canvas stays in sync
		onChangeRef.current(formatted)
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-2 h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
				<div className="flex items-center gap-2 min-w-0">
					{currentDiagram ? <FileText size={14} /> : (
						<span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">DBML Editor</span>
					)}
					<DiagramNameEditor />
					{/* Save status */}
					<SaveStatusIndicator />
				</div>

				<div className="flex items-center gap-2">
					{parseError && (
						<div className="flex items-center gap-1 text-xs text-red-500">
							<span>⚠</span>
							<span className="truncate max-w-[120px]" title={parseError}>
								Parse error
							</span>
						</div>
					)}
					<button
						onClick={handleBeautify}
						title="Format / Beautify DBML"
						className="flex mr-4 items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30"
					>
						<WandSparkles size={12} />
						<span>Format</span>
					</button>
				</div>
			</div>

			{/* CodeMirror mount point */}
			<div
				ref={containerRef}
				className="flex-1 overflow-hidden"
				style={{ display: collapsed ? 'none' : 'flex', flexDirection: 'column' }}
			/>

			{/* Error panel */}
			{parseError && !collapsed && (
				<div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 shrink-0">
					<p className="text-xs text-red-600 dark:text-red-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
						{parseError}
					</p>
				</div>
			)}
		</div>
	)
}
