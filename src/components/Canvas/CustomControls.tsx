import { Panel, useReactFlow } from '@xyflow/react'
import { Plus, Minus, Maximize2, Lock, Unlock } from 'lucide-react'

interface Props {
  darkMode: boolean
  locked: boolean
  onToggleLock: () => void
}

export function CustomControls({ darkMode, locked, onToggleLock }: Props) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  const base = [
    'relative w-9 h-9 flex items-center justify-center rounded-lg',
    'transition-all duration-150 active:scale-90',
    'text-gray-400 hover:text-white',
    darkMode
      ? 'hover:bg-white/10 active:bg-white/15'
      : 'hover:bg-black/8 active:bg-black/12',
  ].join(' ')

  const divider = darkMode
    ? 'h-px bg-white/10'
    : 'h-px bg-black/8'

  const wrap = [
    'flex flex-col gap-0.5 p-1 rounded-xl shadow-2xl',
    'border',
    darkMode
      ? 'bg-gray-900/85 backdrop-blur-md border-white/10'
      : 'bg-white/90 backdrop-blur-md border-black/8',
  ].join(' ')

  return (
    <Panel position="bottom-left" style={{ margin: 16 }}>
      <div className={wrap}>
        {/* Zoom In */}
        <button
          className={base}
          title="Zoom in"
          onClick={() => zoomIn({ duration: 200 })}
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>

        <div className={divider} />

        {/* Zoom Out */}
        <button
          className={base}
          title="Zoom out"
          onClick={() => zoomOut({ duration: 200 })}
        >
          <Minus size={15} strokeWidth={2.5} />
        </button>

        <div className={divider} />

        {/* Fit View */}
        <button
          className={base}
          title="Fit view"
          onClick={() => fitView({ padding: 0.12, duration: 400 })}
        >
          <Maximize2 size={14} strokeWidth={2} />
        </button>

        <div className={divider} />

        {/* Lock / Unlock */}
        <button
          className={[
            base,
            locked
              ? darkMode
                ? 'text-blue-400 hover:text-blue-300 bg-blue-500/10'
                : 'text-blue-600 hover:text-blue-500 bg-blue-500/10'
              : '',
          ].join(' ')}
          title={locked ? 'Unlock canvas' : 'Lock canvas'}
          onClick={onToggleLock}
        >
          {locked
            ? <Lock size={14} strokeWidth={2} />
            : <Unlock size={14} strokeWidth={2} />}
        </button>
      </div>
    </Panel>
  )
}
