import type { User, Project, DiagramSummary, DiagramFull } from './types'

const ACCESS_KEY = 'frame_access_token'
const REFRESH_KEY = 'frame_refresh_token'
const USER_KEY = 'frame_user'

export const tokenStorage = {
	getAccess: () => localStorage.getItem(ACCESS_KEY),
	getRefresh: () => localStorage.getItem(REFRESH_KEY),
	getUser: (): User | null => {
		try {
			const raw = localStorage.getItem(USER_KEY)
			return raw ? JSON.parse(raw) : null
		} catch {
			return null
		}
	},
	set: (accessToken: string, refreshToken: string, user: User) => {
		localStorage.setItem(ACCESS_KEY, accessToken)
		localStorage.setItem(REFRESH_KEY, refreshToken)
		localStorage.setItem(USER_KEY, JSON.stringify(user))
	},
	clear: () => {
		localStorage.removeItem(ACCESS_KEY)
		localStorage.removeItem(REFRESH_KEY)
		localStorage.removeItem(USER_KEY)
	},
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
	if (isRefreshing) return refreshPromise
	isRefreshing = true
	refreshPromise = (async () => {
		const refreshToken = tokenStorage.getRefresh()
		if (!refreshToken) return null
		try {
			const res = await fetch('/api/auth/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken }),
			})
			if (!res.ok) return null
			const data = await res.json()
			const user = tokenStorage.getUser()!
			tokenStorage.set(data.accessToken, data.refreshToken, user)
			return data.accessToken as string
		} catch {
			return null
		} finally {
			isRefreshing = false
			refreshPromise = null
		}
	})()
	return refreshPromise
}

export async function apiFetch<T = unknown>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const makeRequest = async (token: string | null) => {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...(options.headers as Record<string, string>),
		}
		if (token) headers['Authorization'] = `Bearer ${token}`
		return fetch(`/api${path}`, { ...options, headers })
	}

	let res = await makeRequest(tokenStorage.getAccess())

	if (res.status === 401) {
		const newToken = await tryRefreshToken()
		if (newToken) {
			res = await makeRequest(newToken)
		} else {
			tokenStorage.clear()
			window.dispatchEvent(new Event('auth:expired'))
			throw new Error('Session expired')
		}
	}

	if (!res.ok) {
		const body = await res.json().catch(() => ({}))
		throw new Error(body?.message || `Request failed: ${res.status}`)
	}

	const text = await res.text()
	return text ? JSON.parse(text) : (undefined as T)
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
	register: (data: { name?: string; email: string; password: string }) =>
		apiFetch<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
			method: 'POST',
			body: JSON.stringify(data),
		}),

	login: (data: { email: string; password: string }) =>
		apiFetch<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
			method: 'POST',
			body: JSON.stringify(data),
		}),

	logout: () =>
		apiFetch('/auth/logout', { method: 'POST' }),

	getGithubUrl: (): string => '/api/auth/github',
}

// ─── User ────────────────────────────────────────────────────────────────────

export const userApi = {
	me: () => apiFetch<User>('/user/me'),

	updateProfile: (data: { name?: string; email?: string }) =>
		apiFetch<User>('/user/profile', { method: 'PUT', body: JSON.stringify(data) }),

	changePassword: (data: { currentPassword: string; newPassword: string }) =>
		apiFetch<{ message: string }>('/user/password', { method: 'PUT', body: JSON.stringify(data) }),

	deleteAccount: (password?: string) =>
		apiFetch<{ message: string }>('/user/me', { method: 'DELETE', body: JSON.stringify({ password }) }),
}

// ─── Projects ────────────────────────────────────────────────────────────────

export const projectsApi = {
	list: () => apiFetch<Project[]>('/projects'),

	create: (name: string) =>
		apiFetch<Project>('/projects', {
			method: 'POST',
			body: JSON.stringify({ name }),
		}),

	get: (id: string) => apiFetch<Project>(`/projects/${id}`),

	rename: (id: string, name: string) =>
		apiFetch<Project>(`/projects/${id}/name`, {
			method: 'PATCH',
			body: JSON.stringify({ name }),
		}),

	delete: (id: string) =>
		apiFetch(`/projects/${id}`, { method: 'DELETE' }),
}

// ─── Diagram serialization ───────────────────────────────────────────────────
// Nodes carry DBML-parser objects in `.data` that have circular references.
// We only need id/type/position for layout — table structure comes from dbmlCode.

type RawNode = { id: string; type?: string; position: { x: number; y: number }; width?: number; height?: number; [key: string]: unknown }
type RawEdge = { id: string; type?: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; [key: string]: unknown }

function stripNodes(nodes: unknown): RawNode[] {
	if (!Array.isArray(nodes)) return []
	return nodes.map(({ id, type, position, width, height }: RawNode) => ({
		id, type, position, ...(width != null && { width }), ...(height != null && { height }),
	}))
}

function stripEdges(edges: unknown): RawEdge[] {
	if (!Array.isArray(edges)) return []
	return edges.map(({ id, type, source, target, sourceHandle, targetHandle }: RawEdge) => ({
		id, type, source, target, sourceHandle, targetHandle,
	}))
}

// ─── Diagrams ────────────────────────────────────────────────────────────────

export const diagramsApi = {
	list: (projectId: string) =>
		apiFetch<DiagramSummary[]>(`/projects/${projectId}/diagrams`),

	create: (projectId: string, name: string) =>
		apiFetch<DiagramFull>(`/projects/${projectId}/diagrams`, {
			method: 'POST',
			body: JSON.stringify({ name }),
		}),

	get: (projectId: string, id: string) =>
		apiFetch<DiagramFull>(`/projects/${projectId}/diagrams/${id}`),

	save: (
		projectId: string,
		id: string,
		data: Partial<Omit<DiagramFull, 'id' | 'name' | 'projectId' | 'createdAt' | 'updatedAt'>>,
	) => {
		const { nodes, edges, ...rest } = data
		const safe = {
			...rest,
			nodes: stripNodes(nodes),
			edges: stripEdges(edges),
		}
		return apiFetch<DiagramFull>(`/projects/${projectId}/diagrams/${id}`, {
			method: 'PUT',
			body: JSON.stringify(safe),
		})
	},

	rename: (projectId: string, id: string, name: string) =>
		apiFetch<DiagramFull>(`/projects/${projectId}/diagrams/${id}/name`, {
			method: 'PATCH',
			body: JSON.stringify({ name }),
		}),

	delete: (projectId: string, id: string) =>
		apiFetch(`/projects/${projectId}/diagrams/${id}`, { method: 'DELETE' }),
}
