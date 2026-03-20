import type { Node, Edge } from '@xyflow/react'

export type { Node, Edge }

export interface User {
	id: string
	email: string | null
	name: string | null
	avatarUrl: string | null
	githubUsername: string | null
	darkMode: boolean
	hasPassword: boolean
}

export interface Project {
	id: string
	name: string
	description: string | null
	diagramCount: number
	createdAt: string
	updatedAt: string
}

export interface DiagramSummary {
	id: string
	name: string
	createdAt: string
	updatedAt: string
}

export interface DiagramFull extends DiagramSummary {
	projectId: string
	dbmlCode: string
	nodeColors: Record<string, string>
	nodes: Node[]
	edges: Edge[]
	showFieldTypes: boolean
	showMinimap: boolean
	showEnums: boolean
	showEdgeAnimation: boolean
}

export interface CurrentDiagram {
	id: string
	name: string
	projectId: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'
