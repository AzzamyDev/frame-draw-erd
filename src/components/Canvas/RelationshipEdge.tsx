import React, { useCallback, useRef, useState } from 'react'
import {
  EdgeProps,
  EdgeLabelRenderer,
  useReactFlow,
  getSmoothStepPath,
} from '@xyflow/react'
import { Settings } from 'lucide-react'
import { useStore } from '@/lib/store'

type Waypoint = { x: number; y: number }

// ── Color palette ─────────────────────────────────────────────────────────────
const EDGE_COLORS = [
  { hex: '#3b82f6', label: 'Blue'    },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#f59e0b', label: 'Amber'   },
  { hex: '#ef4444', label: 'Red'     },
  { hex: '#8b5cf6', label: 'Violet'  },
  { hex: '#ec4899', label: 'Pink'    },
  { hex: '#06b6d4', label: 'Cyan'    },
  { hex: '#f97316', label: 'Orange'  },
  { hex: '#84cc16', label: 'Lime'    },
  { hex: '#64748b', label: 'Slate'   },
]

// ── Geometry helpers ──────────────────────────────────────────────────────────

function distToSegment(p: Waypoint, a: Waypoint, b: Waypoint): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function findInsertIndex(click: Waypoint, pts: Waypoint[]): number {
  let min = Infinity, idx = 1
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegment(click, pts[i], pts[i + 1])
    if (d < min) { min = d; idx = i + 1 }
  }
  return idx
}

function exitPoint(x: number, y: number, pos: string, offset = 40): Waypoint {
  switch (pos) {
    case 'right':  return { x: x + offset, y }
    case 'left':   return { x: x - offset, y }
    case 'bottom': return { x, y: y + offset }
    case 'top':    return { x, y: y - offset }
    default:       return { x: x + offset, y }
  }
}

function buildRawPts(
  sx: number, sy: number, sPos: string,
  tx: number, ty: number, tPos: string,
  waypoints: Waypoint[],
): Waypoint[] {
  const srcExit  = exitPoint(sx, sy, sPos)
  const tgtEntry = exitPoint(tx, ty, tPos)
  const mid = [srcExit, ...waypoints, tgtEntry]
  const raw: Waypoint[] = [{ x: sx, y: sy }]
  for (let i = 0; i < mid.length; i++) {
    if (i === 0) { raw.push(mid[0]); continue }
    const prev = mid[i - 1], curr = mid[i]
    raw.push({ x: curr.x, y: prev.y })
    raw.push(curr)
  }
  raw.push({ x: tx, y: ty })
  return raw
}

function buildPath(raw: Waypoint[], radius = 10): string {
  const pts = raw.filter((p, i) =>
    i === 0 || p.x !== raw[i - 1].x || p.y !== raw[i - 1].y
  )
  if (pts.length < 2) return ''
  if (pts.length === 2)
    return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`

  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1], curr = pts[i], next = pts[i + 1]
    const d1 = Math.hypot(curr.x - prev.x, curr.y - prev.y)
    const d2 = Math.hypot(next.x - curr.x, next.y - curr.y)
    if (d1 === 0 || d2 === 0) continue
    const r1 = Math.min(radius, d1 / 2), r2 = Math.min(radius, d2 / 2)
    const p1 = { x: curr.x + (prev.x - curr.x) * (r1 / d1), y: curr.y + (prev.y - curr.y) * (r1 / d1) }
    const p2 = { x: curr.x + (next.x - curr.x) * (r2 / d2), y: curr.y + (next.y - curr.y) * (r2 / d2) }
    d += ` L ${p1.x},${p1.y} Q ${curr.x},${curr.y} ${p2.x},${p2.y}`
  }
  d += ` L ${pts[pts.length - 1].x},${pts[pts.length - 1].y}`
  return d
}

// ── Markers ───────────────────────────────────────────────────────────────────

function OneMarker({ x, y, angle, color }: { x: number; y: number; angle: number; color: string }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      <line x1="10" y1="-8" x2="10" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}
function ManyMarker({ x, y, angle, color }: { x: number; y: number; angle: number; color: string }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${angle})`}>
      <polygon points="18,0 9,-6 9,6" fill={color} />
    </g>
  )
}
function markerAngle(pos: string) {
  switch (pos) {
    case 'right': return 0; case 'left': return 180
    case 'bottom': return 90; case 'top': return -90; default: return 0
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RelationshipEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data, selected,
}: EdgeProps) {
  const { setEdges, screenToFlowPosition } = useReactFlow()
  const showEdgeAnimation = useStore(s => s.showEdgeAnimation)
  const d = data as any

  const srcMark: string      = d?.sourceRelation ?? '*'
  const tgtMark: string      = d?.targetRelation ?? '1'
  const midLabel: string     = d?.isComposite ? '(composite)' : d?.name ?? ''
  const waypoints: Waypoint[] = d?.waypoints ?? []
  const customColor: string | undefined = d?.edgeColor
  const n = waypoints.length

  // Base color: use custom if set; else default blue; orange when selected
  const baseColor   = customColor ?? '#3b82f6'
  const activeColor = selected ? (customColor ?? '#f97316') : baseColor
  const color = activeColor

  const srcAngle = markerAngle(sourcePosition)
  const tgtAngle = markerAngle(targetPosition)

  // ── UI state ────────────────────────────────────────────────────────────────
  const [hovered,    setHovered]    = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // ── Drag refs ───────────────────────────────────────────────────────────────
  const pendingRef  = useRef<{ wi: number; startPos: Waypoint } | null>(null)
  const draggingRef = useRef<{ wpIdx: number } | null>(null)

  // ── Build path ──────────────────────────────────────────────────────────────
  let edgePath: string, labelX: number, labelY: number
  let rawPts: Waypoint[] = []

  if (n === 0) {
    ;[edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      borderRadius: 10,
    })
  } else {
    rawPts = buildRawPts(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, waypoints)
    edgePath = buildPath(rawPts)
    const mid = rawPts[Math.floor(rawPts.length / 2)]
    labelX = mid?.x ?? (sourceX + targetX) / 2
    labelY = mid?.y ?? (sourceY + targetY) / 2
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const calcInsertIdx = useCallback(
    (pos: Waypoint, currentWps: Waypoint[]) => {
      const srcExit  = exitPoint(sourceX, sourceY, sourcePosition)
      const tgtEntry = exitPoint(targetX, targetY, targetPosition)
      const midPts   = [srcExit, ...currentWps, tgtEntry]
      return Math.max(0, Math.min(findInsertIndex(pos, midPts) - 1, currentWps.length))
    },
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition],
  )

  // ── Path pointer events (drag-to-create-waypoint) ───────────────────────────
  const onPathPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    pendingRef.current  = { wi: calcInsertIdx(pos, waypoints), startPos: pos }
    draggingRef.current = null
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }, [waypoints, calcInsertIdx, screenToFlowPosition])

  const onPathPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return
    e.stopPropagation()
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    if (pendingRef.current && !draggingRef.current) {
      const { startPos, wi } = pendingRef.current
      if (Math.hypot(pos.x - startPos.x, pos.y - startPos.y) < 4) return
      setEdges(edges => edges.map(edge => {
        if (edge.id !== id) return edge
        const wps: Waypoint[] = (edge.data as any)?.waypoints ?? []
        const safeWi = Math.max(0, Math.min(wi, wps.length))
        return {
          ...edge,
          data: { ...(edge.data as object), waypoints: [...wps.slice(0, safeWi), startPos, ...wps.slice(safeWi)] },
        }
      }))
      draggingRef.current = { wpIdx: wi }
      pendingRef.current  = null
    }

    if (draggingRef.current) {
      const { wpIdx } = draggingRef.current
      setEdges(edges => edges.map(edge => {
        if (edge.id !== id) return edge
        const wps: Waypoint[] = (edge.data as any)?.waypoints ?? []
        if (wpIdx >= wps.length) return edge
        return { ...edge, data: { ...(edge.data as object), waypoints: wps.map((wp, i) => i === wpIdx ? pos : wp) } }
      }))
    }
  }, [id, setEdges, screenToFlowPosition])

  const onPathPointerUp = useCallback(() => {
    pendingRef.current  = null
    draggingRef.current = null
  }, [])

  // ── Waypoint drag ────────────────────────────────────────────────────────────
  const onWpPointerMove = useCallback((idx: number, e: React.PointerEvent) => {
    if (e.buttons === 0) return
    e.stopPropagation()
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setEdges(edges => edges.map(edge => {
      if (edge.id !== id) return edge
      const wps: Waypoint[] = (edge.data as any)?.waypoints ?? []
      return { ...edge, data: { ...(edge.data as object), waypoints: wps.map((wp, i) => i === idx ? pos : wp) } }
    }))
  }, [id, setEdges, screenToFlowPosition])

  const onWpDoubleClick = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setEdges(edges => edges.map(edge => {
      if (edge.id !== id) return edge
      const wps: Waypoint[] = (edge.data as any)?.waypoints ?? []
      return { ...edge, data: { ...(edge.data as object), waypoints: wps.filter((_, i) => i !== idx) } }
    }))
  }, [id, setEdges])

  // ── Color picker ─────────────────────────────────────────────────────────────
  const setEdgeColor = useCallback((hex: string) => {
    setEdges(edges => edges.map(edge =>
      edge.id === id
        ? { ...edge, data: { ...(edge.data as object), edgeColor: hex } }
        : edge
    ))
    setPickerOpen(false)
  }, [id, setEdges])

  const showCog = (hovered || pickerOpen) && !selected

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Wide invisible hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: selected ? 'crosshair' : 'pointer', pointerEvents: 'stroke' }}
        onPointerDown={onPathPointerDown}
        onPointerMove={onPathPointerMove}
        onPointerUp={onPathPointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false) }}
      />

      {/* Visible edge */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray={selected ? '8 5' : 'none'}
        opacity={selected ? 1 : 0.75}
        style={{ pointerEvents: 'none' }}
      />

      {/* Flow animation overlay — dashed arrow moving source→target */}
      {showEdgeAnimation && !selected && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="6 14"
          strokeLinecap="round"
          opacity={0.9}
          className="edge-animated"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Markers */}
      {srcMark === '*'
        ? <ManyMarker x={sourceX} y={sourceY} angle={srcAngle} color={color} />
        : <OneMarker  x={sourceX} y={sourceY} angle={srcAngle} color={color} />}
      {tgtMark === '*'
        ? <ManyMarker x={targetX} y={targetY} angle={tgtAngle} color={color} />
        : <OneMarker  x={targetX} y={targetY} angle={tgtAngle} color={color} />}

      {/* Hint: midpoint "+" circle when selected + no waypoints */}
      {selected && n === 0 && (
        <g style={{ pointerEvents: 'none' }}>
          <circle cx={labelX} cy={labelY} r={10} fill="#f97316" opacity={0.15} />
          <circle cx={labelX} cy={labelY} r={7} fill="white" stroke="#f97316" strokeWidth={2} />
          <text
            x={labelX} y={labelY}
            textAnchor="middle" dominantBaseline="central"
            fill="#f97316" fontSize={10} fontWeight="bold"
            style={{ userSelect: 'none' }}
          >+</text>
        </g>
      )}

      {/* Draggable waypoint circles */}
      {selected && waypoints.map((wp, idx) => (
        <g key={idx}>
          <circle cx={wp.x} cy={wp.y} r={12} fill={color} opacity={0.12} style={{ pointerEvents: 'none' }} />
          <circle
            cx={wp.x} cy={wp.y} r={7}
            fill={color} stroke="white" strokeWidth={2.5}
            className="nopan nodrag"
            style={{ cursor: 'move', pointerEvents: 'all', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.4))' }}
            onPointerDown={e => { e.stopPropagation(); (e.currentTarget as Element).setPointerCapture(e.pointerId) }}
            onPointerMove={e => onWpPointerMove(idx, e)}
            onDoubleClick={e => onWpDoubleClick(idx, e)}
          />
        </g>
      ))}

      {/* ── EdgeLabelRenderer: cog + color picker + mid label ── */}
      <EdgeLabelRenderer>

        {/* Cog button — appears on hover (not while selected) */}
        {showCog && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 10,
            }}
            className="nodrag nopan"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { if (!pickerOpen) setHovered(false) }}
          >
            <div className="relative flex flex-col items-center gap-1.5">
              {/* Settings button */}
              <button
                title="Change edge color"
                onClick={e => { e.stopPropagation(); setPickerOpen(p => !p) }}
                className="w-6 h-6 flex items-center justify-center rounded-full shadow-lg border transition-all duration-150 hover:scale-110 active:scale-95"
                style={{
                  background: baseColor,
                  borderColor: 'rgba(255,255,255,0.4)',
                  color: '#fff',
                }}
              >
                <Settings size={12} strokeWidth={2.5} />
              </button>

              {/* Color palette */}
              {pickerOpen && (
                <div
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-xl shadow-2xl border border-white/20 p-2"
                  style={{ background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(8px)', minWidth: 140 }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Arrow */}
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 rounded-sm"
                    style={{ background: 'rgba(17,24,39,0.95)', border: 'inherit' }} />

                  <p className="text-[10px] text-gray-400 text-center mb-2 font-medium tracking-wide">Edge Color</p>
                  <div className="grid grid-cols-5 gap-2">
                    {EDGE_COLORS.map(({ hex, label }) => (
                      <button
                        key={hex}
                        title={label}
                        onClick={() => setEdgeColor(hex)}
                        className="w-5 h-5 rounded-full transition-all duration-100 hover:scale-125 active:scale-95"
                        style={{
                          background: hex,
                          outline: customColor === hex ? `2px solid white` : '2px solid transparent',
                          outlineOffset: 1,
                          boxShadow: customColor === hex ? `0 0 0 1px ${hex}` : 'none',
                        }}
                      />
                    ))}
                  </div>

                  {/* Reset to default */}
                  {customColor && (
                    <button
                      onClick={() => setEdgeColor('#3b82f6')}
                      className="mt-2 w-full text-[10px] text-gray-400 hover:text-white transition-colors text-center"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mid-edge label */}
        {midLabel && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="bg-white/90 dark:bg-gray-800/90 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded text-[10px] border border-gray-200 dark:border-gray-600 nodrag nopan backdrop-blur-sm"
          >
            {midLabel}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
