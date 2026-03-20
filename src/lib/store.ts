import { create } from 'zustand'
import { Node, Edge } from '@xyflow/react'
import { parseDBML } from './parser'
import { applyDagreLayout } from './layout'

const INITIAL_DBML = `Enum order_status {
  pending
  processing
  shipped
  delivered
  cancelled
}

Table users {
  id integer [pk, increment]
  username varchar [not null, unique]
  email varchar [not null, unique]
  role varchar [default: 'member']
  created_at timestamp [not null, default: \`now()\`]
}

Table products {
  id integer [pk, increment]
  name varchar [not null]
  price decimal [not null]
  stock integer [default: 0]
  created_at timestamp
}

Table orders {
  id integer [pk, increment]
  user_id integer [not null]
  status order_status [not null, default: 'pending']
  total decimal [not null]
  created_at timestamp [not null, default: \`now()\`]
  indexes {
    user_id
    (user_id, status) [name: 'user_status_idx']
  }
}

Table order_items {
  id integer [pk, increment]
  product_id integer [not null]
  order_id integer [not null]
  quantity integer [not null]
  price decimal [not null]
}

Ref: orders.user_id > users.id
Ref: order_items.order_id > orders.id
Ref: order_items.product_id > products.id`

interface DBStore {
	dbmlCode: string
	parsedSchema: any | null
	parseError: string | null
	nodes: Node[]
	edges: Edge[]
	darkMode: boolean
	showFieldTypes: boolean
	showMinimap: boolean
	showEnums: boolean
	showEdgeAnimation: boolean
	setDbmlCode: (code: string) => void
	reParse: () => void
	reLayout: () => void
	toggleDarkMode: () => void
	toggleFieldTypes: () => void
	toggleMinimap: () => void
	toggleEnums: () => void
	toggleEdgeAnimation: () => void
	setNodes: (nodes: Node[]) => void
	setEdges: (edges: Edge[]) => void
	addRef: (
		sourceTable: string,
		sourceField: string,
		targetTable: string,
		targetField: string,
	) => void
	removeRef: (sourceHandle: string, targetHandle: string) => void
	reconnectRef: (
		oldSrcHandle: string,
		oldTgtHandle: string,
		newSrcTable: string,
		newSrcField: string,
		newTgtTable: string,
		newTgtField: string,
	) => void
	focusTarget: { table: string; field: string } | null
	setFocusTarget: (target: { table: string; field: string } | null) => void
	nodeColors: Record<string, string>
	setNodeColor: (tableName: string, color: string) => void
}

export const useStore = create<DBStore>((set, get) => ({
	dbmlCode: INITIAL_DBML,
	parsedSchema: null,
	parseError: null,
	nodes: [],
	edges: [],
	darkMode:
		typeof localStorage !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false,
	showFieldTypes: true,
	showMinimap: true,
	showEnums: true,
	showEdgeAnimation: false,
	focusTarget: null,
	nodeColors: {},

	setDbmlCode: (code: string) => {
		set({ dbmlCode: code })
		get().reParse()
	},

	reParse: () => {
		const { dbmlCode, nodes: currentNodes, edges: currentEdges } = get()
		try {
			const result = parseDBML(dbmlCode)
			// Preserve waypoints from existing edges (matched by source+target handle)
			const newEdges = result.edges.map((newEdge) => {
				const existing = currentEdges.find(
					(e) =>
						e.sourceHandle === newEdge.sourceHandle &&
						e.targetHandle === newEdge.targetHandle,
				)
				const waypoints = (existing?.data as any)?.waypoints
				if (waypoints?.length) {
					return { ...newEdge, data: { ...(newEdge.data as object), waypoints } }
				}
				return newEdge
			})
			const layoutedNodes = applyDagreLayout(result.nodes, result.edges, currentNodes)
			set({
				parsedSchema: result.schema,
				parseError: null,
				nodes: layoutedNodes,
				edges: newEdges,
			})
		} catch (err: any) {
			set({ parseError: err.message || 'Parse error' })
		}
	},

	reLayout: () => {
		const { nodes, edges } = get()
		const layouted = applyDagreLayout(nodes, edges, [])
		set({ nodes: layouted })
	},

	toggleDarkMode: () => {
		const next = !get().darkMode
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('darkMode', String(next))
		}
		set({ darkMode: next })
	},

	toggleFieldTypes: () => set((s) => ({ showFieldTypes: !s.showFieldTypes })),
	toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
	toggleEnums: () => set((s) => ({ showEnums: !s.showEnums })),
	toggleEdgeAnimation: () => set((s) => ({ showEdgeAnimation: !s.showEdgeAnimation })),
	setNodes: (nodes) => set({ nodes }),
	setEdges: (edges) => set({ edges }),

	addRef: (sourceTable, sourceField, targetTable, targetField) => {
		const { dbmlCode } = get()
		const refLine = `\nRef: ${sourceTable}.${sourceField} > ${targetTable}.${targetField}`
		const newCode = dbmlCode.trimEnd() + refLine + '\n'
		get().setDbmlCode(newCode)
	},

	setFocusTarget: (target) => set({ focusTarget: target }),
	setNodeColor: (tableName, color) =>
		set((s) => ({ nodeColors: { ...s.nodeColors, [tableName]: color } })),

	removeRef: (sourceHandle, targetHandle) => {
		const parseHandle = (handle: string): string | null => {
			const isRight = handle.endsWith('-right')
			const isLeft = handle.endsWith('-left')
			if (!isRight && !isLeft) return null
			const rest = handle.slice(0, isRight ? -'-right'.length : -'-left'.length)
			const dashIdx = rest.indexOf('-')
			if (dashIdx === -1) return null
			return `${rest.slice(0, dashIdx)}.${rest.slice(dashIdx + 1)}`
		}

		const source = parseHandle(sourceHandle) // e.g. "orders.user_id"
		const target = parseHandle(targetHandle) // e.g. "users.id"
		if (!source || !target) return

		const { dbmlCode } = get()
		const lines = dbmlCode.split('\n')
		const filtered = lines.filter((line) => {
			const trimmed = line.trim()
			if (!trimmed.startsWith('Ref')) return true
			// Remove any Ref line that references both endpoints (in either direction)
			return !(trimmed.includes(source) && trimmed.includes(target))
		})
		get().setDbmlCode(filtered.join('\n'))
	},

	reconnectRef: (
		oldSrcHandle,
		oldTgtHandle,
		newSrcTable,
		newSrcField,
		newTgtTable,
		newTgtField,
	) => {
		const parseHandle = (handle: string): string | null => {
			const isRight = handle.endsWith('-right')
			const isLeft = handle.endsWith('-left')
			if (!isRight && !isLeft) return null
			const rest = handle.slice(0, isRight ? -'-right'.length : -'-left'.length)
			const dashIdx = rest.indexOf('-')
			if (dashIdx === -1) return null
			return `${rest.slice(0, dashIdx)}.${rest.slice(dashIdx + 1)}`
		}

		const oldSrc = parseHandle(oldSrcHandle)
		const oldTgt = parseHandle(oldTgtHandle)
		if (!oldSrc || !oldTgt) return

		const { dbmlCode } = get()
		// Remove old Ref line and append new one — single setDbmlCode call (one reParse)
		const lines = dbmlCode.split('\n')
		const filtered = lines.filter((line) => {
			const trimmed = line.trim()
			if (!trimmed.startsWith('Ref')) return true
			return !(trimmed.includes(oldSrc) && trimmed.includes(oldTgt))
		})
		const newCode =
			filtered.join('\n').trimEnd() +
			`\nRef: ${newSrcTable}.${newSrcField} > ${newTgtTable}.${newTgtField}\n`
		get().setDbmlCode(newCode)
	},
}))
