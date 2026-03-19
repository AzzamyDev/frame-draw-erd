import React from 'react'
import { NodeProps } from '@xyflow/react'
import { ParsedEnum } from '@/lib/parser'

export function EnumNode({ data, selected }: NodeProps) {
  const enumData = data as unknown as ParsedEnum

  return (
    <div
      className={`rounded-lg overflow-hidden shadow-lg border-2 transition-all min-w-[180px]
        ${selected
          ? 'border-purple-400 shadow-purple-400/30 shadow-xl'
          : 'border-purple-200 dark:border-purple-800 shadow-gray-200/50 dark:shadow-gray-900/50'
        }
        bg-white dark:bg-gray-900
      `}
    >
      {/* Header — only this area initiates node drag */}
      <div className="node-drag-handle px-3 py-2 bg-gradient-to-r from-purple-700 to-purple-600 flex items-center gap-2 cursor-grab active:cursor-grabbing">
        <span className="text-purple-200 text-xs font-mono">ENUM</span>
        <span className="text-white font-bold text-sm truncate">{enumData.name}</span>
      </div>

      {/* Values */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {enumData.values.map((val, idx) => (
          <div
            key={val.name}
            className={`flex items-center justify-between px-3 py-1.5 text-xs
              ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
              hover:bg-purple-50 dark:hover:bg-purple-950/20
            `}
          >
            <span className="text-gray-700 dark:text-gray-300 font-mono">{val.name}</span>
            {val.note && <span className="text-gray-400 text-[10px] ml-2 truncate">{val.note}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
