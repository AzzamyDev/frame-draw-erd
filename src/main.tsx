import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { tokenStorage, userApi, diagramsApi } from './lib/api'
import { useStore } from './lib/store'

async function bootstrap() {
	// Pick up OAuth tokens from URL hash: #accessToken=...&refreshToken=...
	if (window.location.hash) {
		const params = new URLSearchParams(window.location.hash.slice(1))
		const accessToken = params.get('accessToken')
		const refreshToken = params.get('refreshToken')
		if (accessToken && refreshToken) {
			try {
				// Temporarily store tokens so apiFetch can use them
				localStorage.setItem('frame_access_token', accessToken)
				localStorage.setItem('frame_refresh_token', refreshToken)
				const user = await userApi.me()
				tokenStorage.set(accessToken, refreshToken, user)
			} catch {
				tokenStorage.clear()
			}
			window.history.replaceState(null, '', window.location.pathname)
		}
	}

	useStore.getState().hydrateAuth()

	// Auto-load diagram from URL: ?p=<projectId>&d=<diagramId>
	const urlParams = new URLSearchParams(window.location.search)
	const urlProjectId = urlParams.get('p')
	const urlDiagramId = urlParams.get('d')
	if (urlProjectId && urlDiagramId && useStore.getState().isAuthenticated) {
		try {
			const diagram = await diagramsApi.get(urlProjectId, urlDiagramId)
			useStore.getState().openDiagram(diagram)
		} catch {
			// Diagram not found or no access — clear stale URL params
			window.history.replaceState(null, '', window.location.pathname)
		}
	}

	ReactDOM.createRoot(document.getElementById('root')!).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	)
}

bootstrap()
