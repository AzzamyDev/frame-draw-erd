import { create } from 'zustand'
import { Node, Edge } from '@xyflow/react'
import { parseDBML, type ParsedTableGroup } from './parser'
import { applyDagreLayout } from './layout'
import { tokenStorage } from './api'
import type { User, DiagramFull, CurrentDiagram, SaveStatus } from './types'

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
	// ── Diagram editor ──────────────────────────────────────────────────────
	dbmlCode: string
	parsedSchema: any | null
	parseError: string | null
	groups: ParsedTableGroup[]
	nodes: Node[]
	edges: Edge[]
	darkMode: boolean
	showFieldTypes: boolean
	showMinimap: boolean
	showEnums: boolean
	showEdgeAnimation: boolean
	focusTarget: { table: string; field: string } | null
	nodeColors: Record<string, string>

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
	addRef: (sourceTable: string, sourceField: string, targetTable: string, targetField: string, srcHandle?: string, tgtHandle?: string) => void
	removeRef: (sourceHandle: string, targetHandle: string) => void
	setGroupColor: (groupName: string, color: string) => void
	reconnectRef: (
		oldSrcHandle: string,
		oldTgtHandle: string,
		newSrcTable: string,
		newSrcField: string,
		newTgtTable: string,
		newTgtField: string,
	) => void
	setFocusTarget: (target: { table: string; field: string } | null) => void
	setNodeColor: (tableName: string, color: string) => void

	// ── Auth ─────────────────────────────────────────────────────────────────
	user: User | null
	isAuthenticated: boolean
	accessToken: string | null
	refreshToken: string | null

	setAuth: (user: User, accessToken: string, refreshToken: string) => void
	clearAuth: () => void
	hydrateAuth: () => void

	// ── Diagram cloud context ────────────────────────────────────────────────
	currentDiagram: CurrentDiagram | null
	saveStatus: SaveStatus

	openDiagram: (full: DiagramFull) => void
	setSaveStatus: (status: SaveStatus) => void

	// ── UI flags ─────────────────────────────────────────────────────────────
	showAuthModal: boolean
	authModalTab: 'login' | 'register'
	showDiagramsPanel: boolean

	openAuthModal: (tab?: 'login' | 'register') => void
	closeAuthModal: () => void
	toggleDiagramsPanel: () => void
}

export const useStore = create<DBStore>((set, get) => ({
	// ── Diagram editor ──────────────────────────────────────────────────────
	dbmlCode: INITIAL_DBML,
	parsedSchema: null,
	parseError: null,
	groups: [],
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

	// ── Auth ─────────────────────────────────────────────────────────────────
	user: null,
	isAuthenticated: false,
	accessToken: null,
	refreshToken: null,

	setAuth: (user, accessToken, refreshToken) => {
		tokenStorage.set(accessToken, refreshToken, user)
		set({ user, isAuthenticated: true, accessToken, refreshToken })
	},

	clearAuth: () => {
		tokenStorage.clear()
		window.history.replaceState(null, '', window.location.pathname)
		// Reset diagram state so stale diagram isn't shown after sign-out
		set({
			user: null,
			isAuthenticated: false,
			accessToken: null,
			refreshToken: null,
			currentDiagram: null,
			saveStatus: 'idle',
			dbmlCode: INITIAL_DBML,
			nodes: [],
			edges: [],
			parsedSchema: null,
			parseError: null,
			groups: [],
			nodeColors: {},
		})
		// Re-parse initial DBML so the welcome diagram renders immediately
		get().reParse()
	},

	hydrateAuth: () => {
		const user = tokenStorage.getUser()
		const accessToken = tokenStorage.getAccess()
		const refreshToken = tokenStorage.getRefresh()
		if (user && accessToken && refreshToken) {
			set({ user, isAuthenticated: true, accessToken, refreshToken })
		}
	},

	// ── Diagram cloud context ────────────────────────────────────────────────
	currentDiagram: null,
	saveStatus: 'idle',

	openDiagram: (full) => {
		window.history.pushState(null, '', `?p=${full.projectId}&d=${full.id}`)
		set({
			currentDiagram: { id: full.id, name: full.name, projectId: full.projectId },
			dbmlCode: full.dbmlCode,
			nodeColors: full.nodeColors ?? {},
			showFieldTypes: full.showFieldTypes,
			showMinimap: full.showMinimap,
			showEnums: full.showEnums,
			showEdgeAnimation: full.showEdgeAnimation,
			nodes: full.nodes ?? [],
			edges: full.edges ?? [],
		})
		get().reParse()
	},

	setSaveStatus: (saveStatus) => set({ saveStatus }),

	// ── UI flags ─────────────────────────────────────────────────────────────
	showAuthModal: false,
	authModalTab: 'login',
	showDiagramsPanel: false,

	openAuthModal: (tab = 'login') => set({ showAuthModal: true, authModalTab: tab }),
	closeAuthModal: () => set({ showAuthModal: false }),
	toggleDiagramsPanel: () => set((s) => ({ showDiagramsPanel: !s.showDiagramsPanel })),

	setDbmlCode: (code: string) => {
		set({ dbmlCode: code })
		get().reParse()
	},

	reParse: () => {
		const { dbmlCode, nodes: currentNodes, edges: currentEdges } = get()
		try {
			const result = parseDBML(dbmlCode)
			// Strip side suffix → base key  e.g. "users-id-right" → "users-id"
			const handleBase = (h: string | null | undefined) =>
				(h ?? '').replace(/-right$|-left$/, '')

			// Preserve user-chosen handles (left/right side) + waypoints
			// Match existing edges by base key so side-changes survive re-parse
			const newEdges = result.edges.map((newEdge) => {
				const newSrcBase = handleBase(newEdge.sourceHandle)
				const newTgtBase = handleBase(newEdge.targetHandle)

				const existing = currentEdges.find(
					(e) =>
						handleBase(e.sourceHandle) === newSrcBase &&
						handleBase(e.targetHandle) === newTgtBase,
				)

				if (existing) {
					return {
						...newEdge,
						sourceHandle: existing.sourceHandle ?? newEdge.sourceHandle,
						targetHandle: existing.targetHandle ?? newEdge.targetHandle,
						data: {
							...(newEdge.data as object),
							waypoints: (existing.data as any)?.waypoints,
						},
					}
				}
				return newEdge
			})
			const layoutedNodes = applyDagreLayout(result.nodes, result.edges, currentNodes)
			set({
				parsedSchema: result.schema,
				parseError: null,
				groups: result.groups,
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

	addRef: (sourceTable, sourceField, targetTable, targetField, srcHandle?, tgtHandle?) => {
		const { dbmlCode, parsedSchema } = get()

		// Smart relation by naming convention + PK/unique fallback
		// - field named exactly "id"           → "one" side
		// - field ending "_id" or "Id" (FK)   → "many" side
		// - fallback: check PK/unique from parsedSchema
		// Operators: < = one-to-many  > = many-to-one  - = one-to-one  <> = many-to-many
		const isByNameOne  = (n: string) => n === 'id'
		const isByNameMany = (n: string) => n.endsWith('_id') || (n.endsWith('Id') && n !== 'id')

		const getSchemaField = (tbl: string, fld: string) => {
			const tables: any[] = parsedSchema?.tables ?? []
			return tables.find((t: any) => t.name === tbl)?.fields?.find((f: any) => f.name === fld)
		}

		const resolveOneSide = (tableName: string, fieldName: string): boolean => {
			if (isByNameOne(fieldName))  return true
			if (isByNameMany(fieldName)) return false
			// fallback: trust schema PK / unique flag
			const f = getSchemaField(tableName, fieldName)
			return !!(f?.pk || f?.unique)
		}

		const srcIsOne = resolveOneSide(sourceTable, sourceField)
		const tgtIsOne = resolveOneSide(targetTable, targetField)

		let op: string
		if (srcIsOne && tgtIsOne)   op = '-'   // one-to-one
		else if (srcIsOne)          op = '<'   // one-to-many  (source is "one")
		else if (tgtIsOne)          op = '>'   // many-to-one  (target is "one")
		else                        op = '<>'  // many-to-many

		const refLine = `\nRef: ${sourceTable}.${sourceField} ${op} ${targetTable}.${targetField}`
		const newCode = dbmlCode.trimEnd() + refLine + '\n'
		get().setDbmlCode(newCode) // calls reParse synchronously

		// Patch the newly created edge with the user's actual chosen handles
		if (srcHandle && tgtHandle) {
			const handleBase = (h: string) => h.replace(/-right$|-left$/, '')
			const wantedSrcBase = handleBase(srcHandle)
			const wantedTgtBase = handleBase(tgtHandle)

			set((s) => ({
				edges: s.edges.map((e) => {
					if (
						handleBase(e.sourceHandle ?? '') === wantedSrcBase &&
						handleBase(e.targetHandle ?? '') === wantedTgtBase
					) {
						return { ...e, sourceHandle: srcHandle, targetHandle: tgtHandle }
					}
					return e
				}),
			}))
		}
	},

	setGroupColor: (groupName, color) => {
		const { dbmlCode } = get()
		const lines = dbmlCode.split('\n')
		const updated = lines.map((line) => {
			if (!/TableGroup\s/i.test(line)) return line
			const nameMatch = line.match(/TableGroup\s+["'`]?(\w+)["'`]?/)
			if (!nameMatch || nameMatch[1] !== groupName) return line

			if (line.includes('[')) {
				if (/color\s*:/i.test(line)) {
					return line.replace(/color\s*:\s*#[0-9a-fA-F]*/i, `color: ${color}`)
				}
				return line.replace('[', `[color: ${color}, `)
			}
			if (line.includes('{')) return line.replace('{', `[color: ${color}] {`)
			return line + ` [color: ${color}]`
		})
		get().setDbmlCode(updated.join('\n'))
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
