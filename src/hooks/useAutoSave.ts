import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
import { diagramsApi } from '@/lib/api'

export function useAutoSave() {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const saveRef = useRef<(() => void) | null>(null)

	// Keep saveRef up to date without triggering re-subscriptions
	const storeRef = useRef(useStore.getState())
	useEffect(() => useStore.subscribe((s) => { storeRef.current = s }), [])

	const save = () => {
		const s = storeRef.current
		if (!s.isAuthenticated || !s.currentDiagram || s.parseError !== null) return

		s.setSaveStatus('saving')
		const { currentDiagram, dbmlCode, nodes, edges, nodeColors, showFieldTypes, showMinimap, showEnums, showEdgeAnimation } = s

		diagramsApi
			.save(currentDiagram.projectId, currentDiagram.id, {
				dbmlCode,
				nodes,
				edges,
				nodeColors,
				showFieldTypes,
				showMinimap,
				showEnums,
				showEdgeAnimation,
			})
			.then(() => storeRef.current.setSaveStatus('saved'))
			.catch(() => storeRef.current.setSaveStatus('failed'))
	}

	saveRef.current = save

	useEffect(() => {
		const unsubscribe = useStore.subscribe((s, prev) => {
			if (
				!s.isAuthenticated ||
				!s.currentDiagram ||
				s.parseError !== null
			) return

			// Only trigger when diagram content actually changes
			if (
				s.dbmlCode === prev.dbmlCode &&
				s.nodes === prev.nodes &&
				s.edges === prev.edges &&
				s.nodeColors === prev.nodeColors &&
				s.showFieldTypes === prev.showFieldTypes &&
				s.showMinimap === prev.showMinimap &&
				s.showEnums === prev.showEnums &&
				s.showEdgeAnimation === prev.showEdgeAnimation
			) return

			if (timerRef.current) clearTimeout(timerRef.current)
			timerRef.current = setTimeout(() => saveRef.current?.(), 1500)
		})

		return () => {
			unsubscribe()
			if (timerRef.current) clearTimeout(timerRef.current)
		}
	}, [])

	// Ctrl+S → immediate save
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 's') {
				e.preventDefault()
				if (timerRef.current) {
					clearTimeout(timerRef.current)
					timerRef.current = null
				}
				saveRef.current?.()
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [])
}
