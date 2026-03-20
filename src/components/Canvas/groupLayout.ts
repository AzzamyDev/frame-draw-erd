import type { Node } from '@xyflow/react'
import type { ParsedTableGroup } from '@/lib/parser'

export const GROUP_NODE_W = 270
export const GROUP_PAD = 28
export const GROUP_HDR = 36

export const estimateTableNodeHeight = (n: Node) =>
	80 + ((n.data as { fields?: unknown[] })?.fields?.length || 0) * 32

/** Top-left of the group frame from current table positions (matches Canvas groupBackgroundNodes). */
export function computeGroupFrameOrigin(
	group: ParsedTableGroup,
	tableNodes: Node[],
): { x: number; y: number } | null {
	const tableMap = new Map(tableNodes.map((n) => [n.id, n]))
	const members = group.tableNames.map((t) => tableMap.get(`table_${t}`)).filter((n): n is Node => !!n)
	if (!members.length) return null
	const minX = Math.min(...members.map((n) => n.position.x))
	const minY = Math.min(...members.map((n) => n.position.y))
	return { x: minX - GROUP_PAD, y: minY - GROUP_HDR - GROUP_PAD }
}

export function moveGroupMemberTables(
	group: ParsedTableGroup,
	nodes: Node[],
	dx: number,
	dy: number,
): Node[] {
	if (dx === 0 && dy === 0) return nodes
	const ids = new Set(group.tableNames.map((t) => `table_${t}`))
	return nodes.map((n) =>
		ids.has(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n,
	)
}
