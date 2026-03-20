import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { GroupNode } from './GroupNode'
import { RelationshipEdge } from './RelationshipEdge'
import { Plus, Minus, Maximize2, Lock, Unlock, MousePointer2, Hand } from 'lucide-react'

const nodeTypes = {
	tableNode: TableNode,
	enumNode: EnumNode,
	groupNode: GroupNode,
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
		groups,
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

	const groupBackgroundNodes = useMemo<Node[]>(() => {
		if (!groups.length) return []
		const tableMap = new Map(nodes.filter((n) => n.type === 'tableNode').map((n) => [n.id, n]))
		const NODE_W = 270
		const estimateH = (n: Node) => 80 + ((n.data as any)?.fields?.length || 0) * 32
		const PAD = 28, HDR = 36

		return groups.flatMap((group) => {
			const members = group.tableNames.map((t) => tableMap.get(`table_${t}`)).filter((n): n is Node => !!n)
			if (!members.length) return []
			const minX = Math.min(...members.map((n) => n.position.x))
			const minY = Math.min(...members.map((n) => n.position.y))
			const maxX = Math.max(...members.map((n) => n.position.x + NODE_W))
			const maxY = Math.max(...members.map((n) => n.position.y + estimateH(n)))
			return [{
				id: group.id,
				type: 'groupNode',
				position: { x: minX - PAD, y: minY - HDR - PAD },
				style: { width: maxX - minX + PAD * 2, height: maxY - minY + HDR + PAD * 2 },
				data: { name: group.name, color: group.color },
				draggable: false,
				selectable: false,
				zIndex: -1,
			} as Node]
		})
	}, [nodes, groups])

	// Build a map of tableId → group color so member nodes inherit the group header color
	const tableGroupColorMap = useMemo(() => {
		const map = new Map<string, string>()
		groups.forEach((g) => g.tableNames.forEach((t) => map.set(`table_${t}`, g.color)))
		return map
	}, [groups])

	const visibleNodes = useMemo(() => {
		const tableNodes = (showEnums ? nodes : nodes.filter((n) => n.type !== 'enumNode')).map((n) => {
			const groupColor = tableGroupColorMap.get(n.id)
			if (!groupColor || n.type !== 'tableNode') return n
			// Inject groupColor into data so TableNode can use it as default header color
			return { ...n, data: { ...(n.data as object), groupColor } }
		})
		return [...groupBackgroundNodes, ...tableNodes]
	}, [groupBackgroundNodes, nodes, showEnums, tableGroupColorMap])

	// Use getState() instead of closure values to always get fresh state.
	// Without this, React Flow firing onEdgesChange/onNodesChange right after
	// reParse would overwrite the newly-parsed edges/nodes with stale ones.
	const onNodesChange = useCallback(
		(changes: NodeChange[]) => {
			const groupIds = new Set(groupBackgroundNodes.map((n) => n.id))
			const storeChanges = changes.filter((c) => !groupIds.has((c as any).id))
			if (storeChanges.length > 0) {
				const current = useStore.getState().nodes
				setNodes(applyNodeChanges(storeChanges, current))
			}
		},
		[nodes, setNodes, groupBackgroundNodes],
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
