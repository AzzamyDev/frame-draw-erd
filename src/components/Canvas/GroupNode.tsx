import { useState, useRef, useCallback } from 'react'
import { NodeProps } from '@xyflow/react'
import { ChevronDown, Palette } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useStore } from '@/lib/store'

export interface GroupNodeData {
	name: string
	color: string
}

const PALETTE = [
	'#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
	'#3498db', '#9b59b6', '#e91e63', '#795548', '#607d8b',
	'#c0392b', '#d35400', '#f39c12', '#27ae60', '#16a085',
	'#2980b9', '#8e44ad', '#ad1457', '#4e342e', '#455a64',
]

export function GroupNode({ data }: NodeProps) {
	const { name, color } = data as unknown as GroupNodeData
	const setGroupColor = useStore((s) => s.setGroupColor)

	const [showPicker, setShowPicker] = useState(false)
	const [customHex, setCustomHex] = useState(color)
	const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 })
	const btnRef = useRef<HTMLButtonElement>(null)

	const openPicker = useCallback(() => {
		if (btnRef.current) {
			const rect = btnRef.current.getBoundingClientRect()
			setPickerPos({ x: rect.left, y: rect.bottom + 6 })
		}
		setCustomHex(color)
		setShowPicker(true)
	}, [color])

	return (
		<>
			<div
				style={{
					width: '100%',
					height: '100%',
					borderRadius: 12,
					border: `2px solid ${color}`,
					background: `${color}22`,
					overflow: 'visible',
					pointerEvents: 'none',
				}}
			>
				{/* Header — drag handle + interactive area */}
				<div
					className="group-drag-handle"
					style={{
						background: color,
						borderRadius: '10px 10px 0 0',
						padding: '5px 10px',
						display: 'flex',
						alignItems: 'center',
						gap: 6,
						pointerEvents: 'all',
						cursor: 'grab',
						userSelect: 'none',
					}}
				>
					<ChevronDown size={12} color="white" strokeWidth={2.5} />
					<span style={{ color: 'white', fontWeight: 700, fontSize: 13, flex: 1, letterSpacing: '0.01em' }}>
						{name}
					</span>
					<button
						type="button"
						className="nodrag nopan"
						ref={btnRef}
						onClick={(e) => { e.stopPropagation(); openPicker() }}
						style={{
							background: 'rgba(255,255,255,0.2)',
							border: 'none',
							cursor: 'pointer',
							padding: '2px 4px',
							borderRadius: 4,
							color: 'white',
							display: 'flex',
							alignItems: 'center',
						}}
						title="Change group color"
					>
						<Palette size={11} />
					</button>
				</div>
			</div>

			{/* Color picker portal */}
			{showPicker &&
				createPortal(
					<>
						{/* Backdrop */}
						<div
							className="fixed inset-0 z-[9998]"
							onClick={() => setShowPicker(false)}
						/>
						{/* Picker panel */}
						<div
							className="fixed z-[9999] bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl w-64"
							style={{ left: pickerPos.x, top: pickerPos.y }}
							onClick={(e) => e.stopPropagation()}
						>
							<p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">Color</p>
							<div className="grid grid-cols-5 gap-2 mb-4">
								{PALETTE.map((c) => (
									<button
										key={c}
										onClick={() => { setGroupColor(name, c); setShowPicker(false) }}
										style={{
											width: 32,
											height: 32,
											borderRadius: '50%',
											background: c,
											border: c === color ? '3px solid white' : '2px solid transparent',
											cursor: 'pointer',
											outline: c === color ? `2px solid ${c}` : 'none',
											outlineOffset: 2,
										}}
									/>
								))}
							</div>
							<p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Custom</p>
							<div className="flex gap-2">
								<input
									value={customHex}
									onChange={(e) => setCustomHex(e.target.value)}
									placeholder="HEX: #RRGGBB"
									className="flex-1 bg-zinc-800 text-zinc-100 text-xs px-2.5 py-2 rounded-lg border border-zinc-700 outline-none focus:border-blue-500 font-mono"
								/>
								<button
									onClick={() => { setGroupColor(name, customHex); setShowPicker(false) }}
									className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium transition-colors"
								>
									Apply
								</button>
							</div>
						</div>
					</>,
					document.body,
				)}
		</>
	)
}
