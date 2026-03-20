import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
	ReactFlow,
	Background,
	MiniMap,
	Panel,
	BackgroundVariant,
	NodeChange,
	EdgeChange,
	Connection,
	ConnectionLineType,
	ConnectionMode,
	applyNodeChanges,
	applyEdgeChanges,
	useReactFlow,
	Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStore } from '@/lib/store'
import { TableNode } from './TableNode'
import { EnumNode } from './EnumNode'
import { RelationshipEdge } from './RelationshipEdge'
import { Plus, Minus, Maximize2, Lock, Unlock, MousePointer2, Hand } from 'lucide-react'

const nodeTypes = {
	tableNode: TableNode,
	enumNode: EnumNode,
}

const edgeTypes = {
	relationshipEdge: RelationshipEdge,
}

/**
 * Parse a handle ID like "users-id-right" or "order_items-product_id-left"
 * into { tableName, fieldName }.
 * The side suffix is always the last segment after the last "-left" or "-right".
 */
function parseHandleId(handleId: string): { tableName: string; fieldName: string } | null {
	// Normalize invisible-handle suffixes added for bidirectional connections
	const normalized = handleId.replace(/-left-src$/, '-left').replace(/-right-tgt$/, '-right')

	const leftSuffix = '-left'
	const rightSuffix = '-right'

	let rest: string
	if (normalized.endsWith(leftSuffix)) {
		rest = normalized.slice(0, -leftSuffix.length)
	} else if (normalized.endsWith(rightSuffix)) {
		rest = normalized.slice(0, -rightSuffix.length)
	} else {
		return null
	}

	// rest = "{tableName}-{fieldName}"
	// tableName can have underscores, fieldName also.
	// We split on the FIRST "-" to get tableName, rest is fieldName.
	// But table names with underscores won't have "-", so the FIRST "-" separates table from field.
	// Actually the handle format is: tableName + "-" + fieldName, where both can have underscores.
	// We need to find which prefix matches a known table. But here we don't have table names.
	// The format used in TableNode is: `${tableName}-${field.name}` so
	// split on first "-" would only work if neither has dashes.
	// Better: we encode as just the concatenation — let's find the split point.
	// Since table names and field names don't have "-" (DBML identifiers use underscores),
	// the first "-" separates them.
	const dashIdx = rest.indexOf('-')
	if (dashIdx === -1) return null

	// But if tableName has underscores (not dashes), this is fine.
	// The join character is "-" so split on first "-":
	const tableName = rest.slice(0, dashIdx)
	const fieldName = rest.slice(dashIdx + 1)

	if (!tableName || !fieldName) return null
	return { tableName, fieldName }
}

export function Canvas() {
	const {
		nodes,
		edges,
		darkMode,
		showMinimap,
		showEnums,
		setNodes,
		setEdges,
		addRef,
		removeRef,
		reconnectRef,
	} = useStore()

	const { fitView, zoomIn, zoomOut } = useReactFlow()
	const didFitRef = useRef(false)
	const [locked, setLocked] = useState(false)
	// selectMode: drag on canvas draws a selection box instead of panning
	const [selectMode, setSelectMode] = useState(false)

	// Auto-fit once after nodes first appear
	useEffect(() => {
		if (nodes.length > 0 && !didFitRef.current) {
			didFitRef.current = true
			setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 100)
		}
		if (nodes.length === 0) {
			didFitRef.current = false
		}
	}, [nodes.length, fitView])

	const visibleNodes = showEnums ? nodes : nodes.filter((n) => n.type !== 'enumNode')

	// Use getState() instead of closure values to always get fresh state.
	// Without this, React Flow firing onEdgesChange/onNodesChange right after
	// reParse would overwrite the newly-parsed edges/nodes with stale ones.
	const onNodesChange = useCallback(
		(changes: NodeChange[]) => {
			const current = useStore.getState().nodes
			setNodes(applyNodeChanges(changes, current))
		},
		[setNodes],
	)

	const onEdgesChange = useCallback(
		(changes: EdgeChange[]) => {
			const currentEdges = useStore.getState().edges
			const passThrough: EdgeChange[] = []

			changes.forEach((change) => {
				if (change.type === 'remove') {
					const edge = currentEdges.find((e) => e.id === change.id)
					if (edge?.sourceHandle && edge?.targetHandle) {
						removeRef(edge.sourceHandle, edge.targetHandle)
						return
					}
				}
				passThrough.push(change)
			})

			if (passThrough.length > 0) {
				setEdges(applyEdgeChanges(passThrough, currentEdges))
			}
		},
		[setEdges, removeRef],
	)

	const onReconnect = useCallback(
		(oldEdge: Edge, newConnection: Connection) => {
			const oldSrc = oldEdge.sourceHandle
			const oldTgt = oldEdge.targetHandle
			const newSrc = newConnection.sourceHandle
			const newTgt = newConnection.targetHandle
			if (!oldSrc || !oldTgt || !newSrc || !newTgt) return

			const source = parseHandleId(newSrc)
			const target = parseHandleId(newTgt)
			if (!source || !target) return

			reconnectRef(
				oldSrc,
				oldTgt,
				source.tableName,
				source.fieldName,
				target.tableName,
				target.fieldName,
			)
		},
		[reconnectRef],
	)

	const onConnect = useCallback(
		(connection: Connection) => {
			let src = connection.sourceHandle
			let tgt = connection.targetHandle
			if (!src || !tgt) return

			// ConnectionMode.Loose: source = where user dragged FROM, target = where they dropped.
			// If user dragged from a left (target-type) handle, RF may swap source↔target.
			// Detect swap: sourceHandle ends with "-left" AND targetHandle ends with "-right".
			if (src.endsWith('-left') && tgt.endsWith('-right')) {
				;[src, tgt] = [tgt, src]
			}

			const source = parseHandleId(src)
			const target = parseHandleId(tgt)
			if (!source || !target) return

			// Pass actual handles so addRef preserves user's chosen sides after reParse
			addRef(source.tableName, source.fieldName, target.tableName, target.fieldName, src, tgt)
		},
		[addRef],
	)

	return (
		<div className="w-full h-full">
			<ReactFlow
				nodes={visibleNodes}
				edges={edges}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onReconnect={onReconnect}
				connectionMode={ConnectionMode.Loose}
				nodesDraggable={!locked}
				nodesConnectable={!locked}
				elementsSelectable={!locked}
				// select mode: drag = rubber-band box; pan mode: drag = pan
				selectionOnDrag={selectMode && !locked}
				panOnDrag={selectMode ? [1, 2] : true}
				selectionMode={'partial' as any}
				minZoom={0.15}
				maxZoom={3}
				colorMode={darkMode ? 'dark' : 'light'}
				defaultEdgeOptions={{
					type: 'relationshipEdge',
					animated: false,
				}}
				connectionLineType={ConnectionLineType.SmoothStep}
				connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '6 3' }}
			>
				<Background
					variant={BackgroundVariant.Dots}
					gap={20}
					size={1}
					color={darkMode ? '#374151' : '#d1d5db'}
				/>
				{/* ── Custom Controls ── */}
				<Panel position="bottom-left" style={{ margin: 16 }}>
					<div
						className={[
							'flex flex-col gap-0.5 p-1 rounded-xl shadow-2xl border',
							darkMode
								? 'bg-gray-900/90 backdrop-blur-md border-white/10'
								: 'bg-white/95 backdrop-blur-md border-black/10',
						].join(' ')}
					>
						{/* Zoom In */}
						<button
							title="Zoom in"
							onClick={() => zoomIn({ duration: 200 })}
							className={[
								'w-9 h-9 flex items-center justify-center rounded-lg',
								'transition-all duration-150 active:scale-90',
								darkMode
									? 'text-gray-400 hover:text-white hover:bg-white/10'
									: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
							].join(' ')}
						>
							<Plus size={15} strokeWidth={2.5} />
						</button>

						<div className={darkMode ? 'h-px bg-white/10' : 'h-px bg-gray-200'} />

						{/* Zoom Out */}
						<button
							title="Zoom out"
							onClick={() => zoomOut({ duration: 200 })}
							className={[
								'w-9 h-9 flex items-center justify-center rounded-lg',
								'transition-all duration-150 active:scale-90',
								darkMode
									? 'text-gray-400 hover:text-white hover:bg-white/10'
									: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
							].join(' ')}
						>
							<Minus size={15} strokeWidth={2.5} />
						</button>

						<div className={darkMode ? 'h-px bg-white/10' : 'h-px bg-gray-200'} />

						{/* Fit View */}
						<button
							title="Fit view"
							onClick={() => fitView({ padding: 0.12, duration: 400 })}
							className={[
								'w-9 h-9 flex items-center justify-center rounded-lg',
								'transition-all duration-150 active:scale-90',
								darkMode
									? 'text-gray-400 hover:text-white hover:bg-white/10'
									: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
							].join(' ')}
						>
							<Maximize2 size={14} strokeWidth={2} />
						</button>

						<div className={darkMode ? 'h-px bg-white/10' : 'h-px bg-gray-200'} />

						{/* Select / Pan mode */}
						<button
							title={
								selectMode
									? 'Switch to pan mode (drag to pan)'
									: 'Switch to select mode (drag to select)'
							}
							onClick={() => setSelectMode((m) => !m)}
							className={[
								'w-9 h-9 flex items-center justify-center rounded-lg',
								'transition-all duration-150 active:scale-90',
								selectMode
									? darkMode
										? 'text-violet-400 bg-violet-500/20 hover:bg-violet-500/30'
										: 'text-violet-600 bg-violet-500/10 hover:bg-violet-500/20'
									: darkMode
										? 'text-gray-400 hover:text-white hover:bg-white/10'
										: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
							].join(' ')}
						>
							{selectMode ? (
								<MousePointer2 size={14} strokeWidth={2} />
							) : (
								<Hand size={14} strokeWidth={2} />
							)}
						</button>

						<div className={darkMode ? 'h-px bg-white/10' : 'h-px bg-gray-200'} />

						{/* Lock / Unlock */}
						<button
							title={locked ? 'Unlock canvas' : 'Lock canvas'}
							onClick={() => setLocked((l) => !l)}
							className={[
								'w-9 h-9 flex items-center justify-center rounded-lg',
								'transition-all duration-150 active:scale-90',
								locked
									? darkMode
										? 'text-blue-400 bg-blue-500/20 hover:bg-blue-500/30'
										: 'text-blue-600 bg-blue-500/10 hover:bg-blue-500/20'
									: darkMode
										? 'text-gray-400 hover:text-white hover:bg-white/10'
										: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
							].join(' ')}
						>
							{locked ? (
								<Lock size={14} strokeWidth={2} />
							) : (
								<Unlock size={14} strokeWidth={2} />
							)}
						</button>
					</div>
				</Panel>

				{/* Hint */}
				<Panel position="top-right">
					<div className="text-[11px] text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-gray-200/60 dark:border-gray-700/60 pointer-events-none select-none">
						{selectMode
							? 'Drag to select nodes · Shift+click to add · Esc to deselect'
							: 'Hover a field row → drag the blue dot to connect'}
					</div>
				</Panel>

				{showMinimap && (
					<MiniMap
						style={{
							bottom: 20,
							right: 20,
							backgroundColor: darkMode ? '#1f2937' : '#f9fafb',
						}}
						nodeColor={(n) => (n.type === 'enumNode' ? '#7c3aed' : '#1d4ed8')}
					/>
				)}
			</ReactFlow>
		</div>
	)
}
