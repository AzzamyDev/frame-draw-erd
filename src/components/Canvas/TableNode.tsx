import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Key, Link, Hash, Info, Palette } from 'lucide-react'
import { ParsedTable, ParsedField } from '@/lib/parser'
import { useStore } from '@/lib/store'

const PALETTE = [
	'#1d4ed8',
	'#7c3aed',
	'#059669',
	'#dc2626',
	'#d97706',
	'#0891b2',
	'#db2777',
	'#4b5563',
	'#4338ca',
	'#0d9488',
]

function FieldBadge({ label, color }: { label: string; color: string }) {
	return (
		<span
			className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium leading-none ${color}`}
		>
			{label}
		</span>
	)
}

function FieldTooltip({ field, anchorRect }: { field: ParsedField; anchorRect: DOMRect | null }) {
	if (!anchorRect) return null

	const hasNote = !!field.note
	const hasDefault = field.default !== undefined && field.default !== null
	const hasEnum = !!field.enumValues?.length

	if (!hasNote && !hasDefault && !hasEnum) return null

	// Position tooltip to the right of the row, vertically centered
	const top = anchorRect.top + anchorRect.height / 2
	const left = anchorRect.right + 10

	return createPortal(
		<div
			style={{
				position: 'fixed',
				top,
				left,
				transform: 'translateY(-50%)',
				zIndex: 99999,
				pointerEvents: 'none',
				maxWidth: 240,
			}}
			className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-2xl border border-gray-700 dark:border-gray-600 py-2 px-3 text-xs"
		>
			{/* Arrow pointing left */}
			<div
				style={{
					position: 'absolute',
					left: -6,
					top: '50%',
					transform: 'translateY(-50%)',
					width: 0,
					height: 0,
					borderTop: '6px solid transparent',
					borderBottom: '6px solid transparent',
					borderRight: '6px solid #1f2937',
				}}
			/>

			<div className="flex flex-col gap-1.5">
				{hasNote && (
					<div>
						<span className="text-gray-400 font-medium uppercase tracking-wide text-[9px]">
							Note
						</span>
						<p className="text-gray-100 mt-0.5 leading-relaxed break-words">{field.note}</p>
					</div>
				)}
				{hasDefault && (
					<div>
						<span className="text-gray-400 font-medium uppercase tracking-wide text-[9px]">
							Default
						</span>
						<p className="text-blue-300 mt-0.5 font-mono">{field.default}</p>
					</div>
				)}
				{hasEnum && (
					<div>
						<span className="text-gray-400 font-medium uppercase tracking-wide text-[9px]">
							Enum values
						</span>
						<div className="flex flex-wrap gap-1 mt-0.5">
							{field.enumValues!.map((v) => (
								<span
									key={v}
									className="bg-indigo-800/60 text-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-mono"
								>
									{v}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
		</div>,
		document.body,
	)
}

function FieldRow({
	field,
	tableName,
	index,
	onDoubleClick,
}: {
	field: ParsedField
	tableName: string
	index: number
	onDoubleClick: () => void
}) {
	const [hovered, setHovered] = useState(false)
	const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
	const rowRef = useRef<HTMLDivElement>(null)
	const leftId = `${tableName}-${field.name}-left`
	const rightId = `${tableName}-${field.name}-right`

	const hasTooltip = !!(field.note || field.default !== undefined || field.enumValues?.length)

	const handleMouseEnter = () => {
		setHovered(true)
		if (hasTooltip && rowRef.current) {
			setAnchorRect(rowRef.current.getBoundingClientRect())
		}
	}

	const handleMouseLeave = () => {
		setHovered(false)
		setAnchorRect(null)
	}

	return (
		<>
			{hovered && hasTooltip && <FieldTooltip field={field} anchorRect={anchorRect} />}
			<div
				ref={rowRef}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onDoubleClick={(e) => {
					e.stopPropagation()
					onDoubleClick()
				}}
				className={`relative flex items-center gap-1 text-xs select-none cursor-pointer
        ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
        ${hovered ? '!bg-blue-50 dark:!bg-blue-950/30' : ''}
      `}
				style={{ minHeight: 34, paddingLeft: 12, paddingRight: 12 }}
			>
				{/* Left — target handle (ConnectionMode.Loose allows dragging from here too) */}
				<Handle
					type="target"
					position={Position.Left}
					id={leftId}
					style={{
						position: 'absolute',
						top: '50%',
						left: -8,
						transform: 'translateY(-50%)',
						width: 14,
						height: 14,
						borderRadius: '50%',
						zIndex: 20,
						cursor: 'crosshair',
						background: hovered ? '#3b82f6' : 'transparent',
						border: hovered ? '2px solid #1d4ed8' : '2px solid transparent',
						opacity: hovered ? 1 : 0,
						transition: 'all 0.15s ease',
					}}
				/>


				<span
					className={`flex-1 min-w-0 truncate font-mono
        ${field.pk ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}
				>
					{field.pk && <Key size={10} className="inline mr-1 text-amber-500" />}
					{field.isFk && <Link size={10} className="inline mr-1 text-blue-400" />}
					{field.name}
				</span>

				<span className="text-gray-400 dark:text-gray-500 text-[10px] shrink-0 ml-2 font-mono">
					{field.type}
				</span>

				<div className="flex items-center gap-0.5 ml-1 shrink-0">
					{field.pk && (
						<FieldBadge
							label="PK"
							color="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400"
						/>
					)}
					{field.notNull && !field.pk && (
						<FieldBadge
							label="NN"
							color="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
						/>
					)}
					{field.unique && (
						<FieldBadge
							label="UQ"
							color="bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400"
						/>
					)}
					{field.increment && (
						<FieldBadge
							label="AI"
							color="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400"
						/>
					)}
					{field.enumValues && (
						<FieldBadge
							label="ENUM"
							color="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400"
						/>
					)}
					{hasTooltip && (
						<Info
							size={10}
							className={`ml-0.5 transition-colors ${hovered ? 'text-blue-400' : 'text-gray-300 dark:text-gray-600'}`}
						/>
					)}
				</div>

				{/* Right — source handle (ConnectionMode.Loose allows dropping here too) */}
				<Handle
					type="source"
					position={Position.Right}
					id={rightId}
					style={{
						position: 'absolute',
						top: '50%',
						right: -8,
						transform: 'translateY(-50%)',
						width: 14,
						height: 14,
						borderRadius: '50%',
						zIndex: 20,
						cursor: 'crosshair',
						background: hovered ? '#2563eb' : 'transparent',
						border: hovered ? '2.5px solid #1d4ed8' : '2px solid transparent',
						opacity: hovered ? 1 : 0,
						transition: 'all 0.15s ease',
						boxShadow: hovered ? '0 0 0 3px rgba(59,130,246,0.25)' : 'none',
					}}
				/>

			</div>
		</>
	)
}

export function TableNode({ data, selected }: NodeProps) {
	const table = data as unknown as ParsedTable
	const { setFocusTarget, nodeColors, setNodeColor } = useStore()
	const [pickerOpen, setPickerOpen] = useState(false)
	const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 })
	const buttonRef = useRef<HTMLButtonElement>(null)
	const headerColor = nodeColors[table.name] ?? '#1d4ed8'

	useEffect(() => {
		if (!pickerOpen) return
		const handler = (e: MouseEvent) => {
			const portal = document.getElementById('__color-picker-portal__')
			if (portal?.contains(e.target as Node)) return
			if (buttonRef.current?.contains(e.target as Node)) return
			setPickerOpen(false)
		}
		document.addEventListener('mousedown', handler)
		return () => document.removeEventListener('mousedown', handler)
	}, [pickerOpen])

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (!buttonRef.current) return
		const rect = buttonRef.current.getBoundingClientRect()
		const PICKER_W = 140
		const PICKER_H = 80
		const left = Math.max(4, Math.min(rect.right - PICKER_W, window.innerWidth - PICKER_W - 4))
		const top =
			rect.bottom + 4 + PICKER_H > window.innerHeight ? rect.top - PICKER_H - 4 : rect.bottom + 4
		setPickerPos({ top, left })
		setPickerOpen((v) => !v)
	}

	return (
		<>
			{/* Portal: renders outside overflow-hidden node container */}
			{pickerOpen &&
				createPortal(
					<div
						id="__color-picker-portal__"
						style={{
							position: 'fixed',
							top: pickerPos.top,
							left: pickerPos.left,
							zIndex: 99999,
						}}
						className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 p-2.5"
						onMouseDown={(e) => e.stopPropagation()}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="grid grid-cols-5 gap-2" style={{ width: 130 }}>
							{PALETTE.map((c) => (
								<button
									key={c}
									title={c}
									style={{ background: c, width: 22, height: 22 }}
									className={`rounded-full border-2 transition-transform hover:scale-110 ${
										headerColor === c
											? 'border-white scale-110 shadow-lg'
											: 'border-transparent'
									}`}
									onClick={() => {
										setNodeColor(table.name, c)
										setPickerOpen(false)
									}}
								/>
							))}
						</div>
					</div>,
					document.body,
				)}

			<div
				className={`rounded-lg overflow-hidden shadow-lg border-2 transition-shadow
          ${selected ? 'border-blue-400 shadow-blue-400/30 shadow-xl' : 'border-gray-200 dark:border-gray-700'}
          bg-white dark:bg-gray-900`}
				style={{ minWidth: 240, maxWidth: 340 }}
			>
				<div
					className="node-drag-handle px-3 py-2.5 flex items-center gap-2 cursor-grab active:cursor-grabbing"
					style={{ background: headerColor }}
				>
					<Hash size={13} className="text-white/70 shrink-0" />
					<span className="text-white font-bold text-sm truncate flex-1 tracking-tight">
						{table.name}
					</span>
					{table.note && (
						<span title={table.note} className="text-white/70 cursor-help shrink-0">
							<Info size={13} />
						</span>
					)}
					<button
						ref={buttonRef}
						className="text-white/60 hover:text-white transition-colors nodrag shrink-0"
						onMouseDown={(e) => e.stopPropagation()}
						onClick={handleToggle}
						title="Change header color"
					>
						<Palette size={13} />
					</button>
				</div>

				<div className="divide-y divide-gray-100 dark:divide-gray-800">
					{table.fields.map((field, idx) => (
						<FieldRow
							key={field.name}
							field={field}
							tableName={table.name}
							index={idx}
							onDoubleClick={() => setFocusTarget({ table: table.name, field: field.name })}
						/>
					))}
					{table.fields.length === 0 && (
						<div className="px-3 py-3 text-xs text-gray-400 italic text-center">
							No fields
						</div>
					)}
				</div>
			</div>
		</>
	)
}
