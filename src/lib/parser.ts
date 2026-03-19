import { Parser } from '@dbml/core'
import type { Node, Edge } from '@xyflow/react'

export interface ParsedField {
  name: string
  type: string
  pk: boolean
  notNull: boolean
  unique: boolean
  increment: boolean
  default?: string
  note?: string
  isFk: boolean
  isIndexed: boolean
  enumValues?: string[]
}

export interface ParsedTable {
  id: string
  name: string
  note?: string
  fields: ParsedField[]
  indexes: any[]
  schemaName?: string
}

export interface ParsedEnum {
  id: string
  name: string
  values: Array<{ name: string; note?: string }>
}

export interface ParseResult {
  schema: any
  tables: ParsedTable[]
  enums: ParsedEnum[]
  nodes: Node[]
  edges: Edge[]
}

function getFieldType(field: any): string {
  if (!field.type) return 'unknown'
  if (typeof field.type === 'string') return field.type
  if (field.type.type_name) {
    const args = field.type.args ? `(${field.type.args})` : ''
    return `${field.type.type_name}${args}`
  }
  return String(field.type)
}

function getDefaultValue(field: any): string | undefined {
  if (field.dbdefault === null || field.dbdefault === undefined) return undefined
  const def = field.dbdefault
  if (def.type === 'expression') return `\`${def.value}\``
  if (def.type === 'string') return `'${def.value}'`
  return String(def.value)
}

export function parseDBML(code: string): ParseResult {
  const parsed = Parser.parse(code, 'dbml')

  const schema = parsed.schemas?.[0] || parsed

  // Collect all enums
  const enumMap = new Map<string, ParsedEnum>()
  const enumNames = new Set<string>()

  ;(schema.enums || []).forEach((e: any, idx: number) => {
    const enumId = `enum_${e.name}_${idx}`
    const parsedEnum: ParsedEnum = {
      id: enumId,
      name: e.name,
      values: (e.values || []).map((v: any) => ({
        name: v.name,
        note: typeof v.note === 'string' ? v.note : (v.note?.value ?? undefined),
      })),
    }
    enumMap.set(e.name, parsedEnum)
    enumNames.add(e.name)
  })

  // Collect indexed fields per table
  const tableIndexedFields = new Map<string, Set<string>>()
  ;(schema.tables || []).forEach((table: any) => {
    const indexed = new Set<string>()
    ;(table.indexes || []).forEach((idx: any) => {
      ;(idx.columns || []).forEach((col: any) => {
        if (col.type === 'column') indexed.add(col.value)
      })
    })
    tableIndexedFields.set(table.name, indexed)
  })

  // Build table nodes
  const tables: ParsedTable[] = (schema.tables || []).map((table: any) => {
    const indexedFields = tableIndexedFields.get(table.name) || new Set()

    const fields: ParsedField[] = (table.fields || []).map((field: any) => {
      const typeName = getFieldType(field)
      const isFk = field.isFk || false
      return {
        name: field.name,
        type: typeName,
        pk: field.pk || false,
        notNull: field.not_null || field.notNull || false,
        unique: field.unique || false,
        increment: field.increment || false,
        default: getDefaultValue(field),
        note: typeof field.note === 'string'
          ? field.note
          : (field.note?.value ?? undefined),
        isFk,
        isIndexed: indexedFields.has(field.name),
        enumValues: enumNames.has(typeName)
          ? enumMap.get(typeName)?.values.map(v => v.name)
          : undefined,
      }
    })

    return {
      id: `table_${table.name}`,
      name: table.name,
      note: typeof table.note === 'string' ? table.note : (table.note?.value ?? undefined),
      fields,
      indexes: table.indexes || [],
      schemaName: table.schema?.name,
    }
  })

  const enums = Array.from(enumMap.values())

  // Build nodes — dragHandle restricts node dragging to the header only,
  // so field rows can be used for handle-based connections without moving the node.
  const nodes: Node[] = [
    ...tables.map((table, i) => ({
      id: table.id,
      type: 'tableNode',
      position: { x: i * 300, y: 0 },
      dragHandle: '.node-drag-handle',
      data: table as unknown as Record<string, unknown>,
    })),
    ...enums.map((e, i) => ({
      id: e.id,
      type: 'enumNode',
      position: { x: i * 250, y: 400 },
      dragHandle: '.node-drag-handle',
      data: e as unknown as Record<string, unknown>,
    })),
  ]

  // Build edges from refs
  const edges: Edge[] = []
  const tableNameToId = new Map(tables.map(t => [t.name, t.id]))

  const parsedAny = parsed as any
  ;((parsedAny.refs || schema.refs) || []).forEach((ref: any, idx: number) => {
    const endpoints = ref.endpoints || []
    if (endpoints.length < 2) return

    const ep1 = endpoints[0]
    const ep2 = endpoints[1]

    const sourceTableName = ep1.tableName || ep1.table?.name
    const targetTableName = ep2.tableName || ep2.table?.name

    if (!sourceTableName || !targetTableName) return

    const sourceId = tableNameToId.get(sourceTableName)
    const targetId = tableNameToId.get(targetTableName)

    if (!sourceId || !targetId) return

    const sourceField = Array.isArray(ep1.fieldNames) ? ep1.fieldNames[0] : ep1.fieldName || ep1.field?.name
    const targetField = Array.isArray(ep2.fieldNames) ? ep2.fieldNames[0] : ep2.fieldName || ep2.field?.name

    const isComposite =
      (Array.isArray(ep1.fieldNames) && ep1.fieldNames.length > 1) ||
      (Array.isArray(ep2.fieldNames) && ep2.fieldNames.length > 1)

    const relation = ref.name || ''

    edges.push({
      id: `ref_${idx}_${sourceTableName}_${targetTableName}`,
      source: sourceId,
      target: targetId,
      sourceHandle: `${sourceTableName}-${sourceField}-right`,
      targetHandle: `${targetTableName}-${targetField}-left`,
      type: 'relationshipEdge',
      data: {
        sourceRelation: ep1.relation,
        targetRelation: ep2.relation,
        name: ref.name,
        isComposite,
        deleteAction: ref.onDelete,
        updateAction: ref.onUpdate,
      },
      label: isComposite ? '(composite)' : relation,
    })
  })

  return { schema: parsed, tables, enums, nodes, edges }
}
