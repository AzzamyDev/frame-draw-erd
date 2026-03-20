import dagre from 'dagre'
import { Node, Edge } from '@xyflow/react'

const NODE_WIDTH = 270
const NODE_HEIGHT_BASE = 80
const FIELD_HEIGHT = 32

function estimateNodeHeight(node: Node): number {
	const data = node.data as any
	if (node.type === 'tableNode') {
		const fields = data?.fields?.length || 0
		return NODE_HEIGHT_BASE + fields * FIELD_HEIGHT
	}
	if (node.type === 'enumNode') {
		const values = data?.values?.length || 0
		return 56 + values * 28
	}
	return 150
}

export function applyDagreLayout(nodes: Node[], edges: Edge[], existingNodes: Node[]): Node[] {
	const existingPositions = new Map(existingNodes.map((n) => [n.id, n.position]))

	const tableNodes = nodes.filter((n) => n.type === 'tableNode')
	const enumNodes = nodes.filter((n) => n.type === 'enumNode')

	// ── Dagre: table nodes only ──────────────────────────────────────────────
	const g = new dagre.graphlib.Graph()
	g.setDefaultEdgeLabel(() => ({}))
	g.setGraph({
		rankdir: 'LR',
		nodesep: 80,
		ranksep: 160,
		marginx: 60,
		marginy: 60,
	})

	tableNodes.forEach((node) => {
		g.setNode(node.id, { width: NODE_WIDTH, height: estimateNodeHeight(node) })
	})

	edges.forEach((edge) => {
		if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
			g.setEdge(edge.source, edge.target)
		}
	})

	dagre.layout(g)

	const tablePositions = new Map<string, { x: number; y: number }>()
	tableNodes.forEach((node) => {
		const { x, y } = g.node(node.id)
		const h = estimateNodeHeight(node)
		tablePositions.set(node.id, { x: x - NODE_WIDTH / 2, y: y - h / 2 })
	})

	// ── Smart enum placement ─────────────────────────────────────────────────
	// Find which table uses each enum (first match wins)
	const enumToTable = new Map<string, string>() // enumNodeId → tableNodeId
	tableNodes.forEach((tableNode) => {
		const fields: any[] = (tableNode.data as any).fields || []
		fields.forEach((field) => {
			if (field.enumValues) {
				const matchingEnum = enumNodes.find((e) => (e.data as any).name === field.type)
				if (matchingEnum && !enumToTable.has(matchingEnum.id)) {
					enumToTable.set(matchingEnum.id, tableNode.id)
				}
			}
		})
	})

	// Bottom boundary of all table nodes
	let bottomY = 0
	tablePositions.forEach((pos, id) => {
		const node = tableNodes.find((n) => n.id === id)!
		bottomY = Math.max(bottomY, pos.y + estimateNodeHeight(node))
	})

	const GAP = 70
	const orphanStartX = 60
	let orphanOffsetX = 0

	const enumPositions = new Map<string, { x: number; y: number }>()
	enumNodes.forEach((enumNode) => {
		const tableId = enumToTable.get(enumNode.id)
		if (tableId) {
			const tablePos = tablePositions.get(tableId)
			const parentNode = tableNodes.find((n) => n.id === tableId)!
			if (tablePos) {
				const parentH = estimateNodeHeight(parentNode)
				// Place enum directly below the parent table
				enumPositions.set(enumNode.id, {
					x: tablePos.x,
					y: tablePos.y + parentH + GAP,
				})
				return
			}
		}
		// No parent table found → place in a row below everything
		enumPositions.set(enumNode.id, {
			x: orphanStartX + orphanOffsetX,
			y: bottomY + GAP,
		})
		orphanOffsetX += NODE_WIDTH + 40
	})

	// ── Merge: keep existing positions for already-placed nodes ─────────────
	return nodes.map((node) => {
		if (existingPositions.has(node.id)) {
			return { ...node, position: existingPositions.get(node.id)! }
		}
		if (node.type === 'tableNode') {
			const pos = tablePositions.get(node.id)
			return { ...node, position: pos ?? { x: 0, y: 0 } }
		}
		if (node.type === 'enumNode') {
			const pos = enumPositions.get(node.id)
			return { ...node, position: pos ?? { x: 0, y: 0 } }
		}
		return node
	})
}

export function forceReLayout(nodes: Node[], edges: Edge[]): Node[] {
	return applyDagreLayout(nodes, edges, [])
}
