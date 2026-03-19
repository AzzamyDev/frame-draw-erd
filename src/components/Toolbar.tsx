import React, { useState, useRef } from 'react'
import {
  LayoutGrid,
  Maximize2,
  Map,
  Eye,
  EyeOff,
  Download,
  Copy,
  Database,
  Moon,
  Sun,
  ChevronDown,
  List,
  Zap,
  ZapOff,
  HelpCircle,
  BookOpen,
  Heart,
  ExternalLink,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useReactFlow } from '@xyflow/react'
import { toPng } from 'html-to-image'
import { forceReLayout } from '@/lib/layout'

function ToolbarButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors text-sm
        ${active
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
        }
      `}
    >
      {children}
    </button>
  )
}

export function Toolbar() {
  const {
    nodes,
    edges,
    dbmlCode,
    parsedSchema,
    darkMode,
    showFieldTypes,
    showMinimap,
    showEnums,
    showEdgeAnimation,
    toggleDarkMode,
    toggleFieldTypes,
    toggleMinimap,
    toggleEnums,
    toggleEdgeAnimation,
    setNodes,
  } = useStore()

  const { fitView } = useReactFlow()
  const [showExport, setShowExport] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSqlDialog, setShowSqlDialog] = useState(false)
  const [sqlDialect, setSqlDialect] = useState<'postgres' | 'mysql' | 'mssql'>('postgres')
  const [sqlOutput, setSqlOutput] = useState('')

  const handleReLayout = () => {
    const layouted = forceReLayout(nodes, edges)
    setNodes(layouted)
    setTimeout(() => fitView({ padding: 0.1 }), 100)
  }

  const handleFitView = () => {
    fitView({ padding: 0.1 })
  }

  const handleCopyDBML = () => {
    navigator.clipboard.writeText(dbmlCode)
    setShowExport(false)
  }

  const handleExportPNG = async () => {
    const canvas = document.querySelector('.react-flow__viewport')?.parentElement as HTMLElement
    if (!canvas) return
    setShowExport(false)
    try {
      const dataUrl = await toPng(canvas, {
        backgroundColor: darkMode ? '#111827' : '#ffffff',
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.download = 'db-diagram.png'
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error('Export failed:', e)
    }
  }

  const handleExportSQL = () => {
    setShowExport(false)
    if (!parsedSchema) return
    import('@dbml/core').then((dbmlCore: any) => {
      let sql = ''
      try {
        const { ModelExporter } = dbmlCore
        // parsedSchema is the raw Database object — must call .normalize() first
        const normalized = parsedSchema.normalize
          ? parsedSchema.normalize()
          : parsedSchema
        // Map dialect names to what @dbml/core expects
        const dialectMap: Record<string, string> = {
          postgres: 'postgres',
          mysql: 'mysql',
          mssql: 'mssql',
        }
        sql = ModelExporter.export(normalized, dialectMap[sqlDialect] ?? 'postgres')
      } catch (e: any) {
        sql = `-- SQL export error: ${e?.message || 'unknown'}`
      }
      setSqlOutput(sql)
      setShowSqlDialog(true)
    }).catch((e: any) => {
      setSqlOutput(`-- Failed to load exporter: ${e?.message}`)
      setShowSqlDialog(true)
    })
  }

  return (
    <div className="flex items-center gap-1 relative">
      <ToolbarButton onClick={handleReLayout} title="Re-layout diagram">
        <LayoutGrid size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={handleFitView} title="Fit to screen">
        <Maximize2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={toggleMinimap} title="Toggle minimap" active={showMinimap}>
        <Map size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={toggleFieldTypes} title="Toggle field types" active={showFieldTypes}>
        {showFieldTypes ? <Eye size={16} /> : <EyeOff size={16} />}
      </ToolbarButton>
      <ToolbarButton onClick={toggleEnums} title="Toggle enum nodes" active={showEnums}>
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={toggleEdgeAnimation}
        title={showEdgeAnimation ? 'Disable edge animation' : 'Enable edge animation'}
        active={showEdgeAnimation}
      >
        {showEdgeAnimation ? <Zap size={16} /> : <ZapOff size={16} />}
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Export dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowExport(v => !v)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <Download size={16} />
          <ChevronDown size={12} />
        </button>

        {showExport && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1">
            <button
              onClick={handleCopyDBML}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Copy size={14} />
              Copy DBML
            </button>
            <button
              onClick={handleExportPNG}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Download size={14} />
              Export PNG
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <div className="px-3 py-1">
              <select
                value={sqlDialect}
                onChange={e => setSqlDialect(e.target.value as 'postgres' | 'mysql' | 'mssql')}
                className="w-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-2 py-1 mb-1"
              >
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mssql">MSSQL</option>
              </select>
              <button
                onClick={handleExportSQL}
                className="flex items-center gap-2 w-full px-0 py-1 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-500"
              >
                <Database size={14} />
                Export SQL DDL
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      <ToolbarButton onClick={toggleDarkMode} title="Toggle dark mode">
        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Help dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowHelp(v => !v)}
          title="Help"
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <HelpCircle size={16} />
        </button>

        {showHelp && (
          <div className="absolute right-0 top-full mt-1 w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Help & Info</p>
            </div>

            {/* DBML Docs */}
            <a
              href="https://dbml.dbdiagram.io/docs/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowHelp(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors group"
            >
              <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                <BookOpen size={14} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-none mb-0.5">DBML Docs</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">dbml.dbdiagram.io/docs</p>
              </div>
              <ExternalLink size={11} className="text-gray-300 dark:text-gray-600 shrink-0" />
            </a>

            <div className="mx-3 border-t border-gray-100 dark:border-gray-700" />

            {/* Credit dbdiagram */}
            <a
              href="https://dbdiagram.io"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowHelp(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors group"
            >
              <div className="w-7 h-7 rounded-md bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center shrink-0 group-hover:bg-pink-100 dark:group-hover:bg-pink-900/50 transition-colors">
                <Heart size={14} className="text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-none mb-0.5">Inspired by dbdiagram</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">dbdiagram.io</p>
              </div>
              <ExternalLink size={11} className="text-gray-300 dark:text-gray-600 shrink-0" />
            </a>
          </div>
        )}
      </div>

      {/* Click-away for export dropdown */}
      {showExport && (
        <div className="fixed inset-0 z-40" onClick={() => setShowExport(false)} />
      )}

      {/* Click-away for help dropdown */}
      {showHelp && (
        <div className="fixed inset-0 z-40" onClick={() => setShowHelp(false)} />
      )}

      {/* SQL Dialog */}
      {showSqlDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-[640px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                SQL DDL — {sqlDialect.toUpperCase()}
              </h3>
              <button
                onClick={() => setShowSqlDialog(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <pre className="flex-1 overflow-auto text-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-4 font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
              {sqlOutput || '-- No SQL output'}
            </pre>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sqlOutput)
                }}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Copy SQL
              </button>
              <button
                onClick={() => setShowSqlDialog(false)}
                className="py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
