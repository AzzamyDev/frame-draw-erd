import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { Extension } from '@codemirror/state'

// Keywords
const KEYWORDS = new Set(['Table', 'Ref', 'Enum', 'TableGroup', 'Note', 'indexes', 'as'])
// Data types
const TYPES = new Set([
	'integer',
	'int',
	'bigint',
	'smallint',
	'tinyint',
	'varchar',
	'char',
	'text',
	'nvarchar',
	'timestamp',
	'datetime',
	'date',
	'time',
	'boolean',
	'bool',
	'decimal',
	'numeric',
	'float',
	'double',
	'real',
	'uuid',
	'json',
	'jsonb',
	'blob',
	'binary',
	'money',
	'serial',
	'bigserial',
])
// Field options inside []
const FIELD_OPTIONS = new Set([
	'pk',
	'primary',
	'key',
	'not',
	'null',
	'unique',
	'default',
	'increment',
	'note',
	'ref',
	'update',
	'delete',
	'cascade',
	'restrict',
	'no',
	'action',
	'set',
])

// Ref operators
const REF_OPS = /^(>|<|-|<>)/

interface DBMLState {
	inBracket: boolean
	inString: boolean
	stringChar: string
	inBacktick: boolean
}

const dbmlLanguage = StreamLanguage.define<DBMLState>({
	name: 'dbml',

	startState(): DBMLState {
		return { inBracket: false, inString: false, stringChar: '', inBacktick: false }
	},

	token(stream, state) {
		// Handle backtick expressions (e.g., `now()`)
		if (state.inBacktick) {
			if (stream.next() === '`') state.inBacktick = false
			return 'string'
		}
		if (stream.peek() === '`') {
			stream.next()
			state.inBacktick = true
			return 'string'
		}

		// Handle strings
		if (state.inString) {
			let ch
			while ((ch = stream.next()) != null) {
				if (ch === state.stringChar) {
					state.inString = false
					break
				}
				if (ch === '\\') stream.next()
			}
			return 'string'
		}
		if (stream.peek() === "'" || stream.peek() === '"') {
			state.stringChar = stream.next()!
			state.inString = true
			// read until close
			let ch
			while ((ch = stream.next()) != null) {
				if (ch === state.stringChar) {
					state.inString = false
					break
				}
				if (ch === '\\') stream.next()
			}
			return 'string'
		}

		// Comments
		if (stream.match('//')) {
			stream.skipToEnd()
			return 'comment'
		}

		// Skip whitespace
		if (stream.eatSpace()) return null

		// Track bracket state
		if (stream.peek() === '[') {
			state.inBracket = true
			stream.next()
			return 'bracket'
		}
		if (stream.peek() === ']') {
			state.inBracket = false
			stream.next()
			return 'bracket'
		}
		if (stream.peek() === '{') {
			stream.next()
			return 'bracket'
		}
		if (stream.peek() === '}') {
			stream.next()
			return 'bracket'
		}

		// Ref operators inside brackets or after Ref:
		if (state.inBracket && stream.match(REF_OPS)) {
			return 'operator'
		}
		if (stream.match(REF_OPS) && !stream.match(/^\s*[a-zA-Z_]/, false)) {
			return 'operator'
		}

		// Numbers
		if (stream.match(/^-?\d+(\.\d+)?/)) return 'number'

		// Words
		if (stream.match(/^[a-zA-Z_]\w*/)) {
			const word = stream.current()
			if (KEYWORDS.has(word)) return 'keyword'
			if (!state.inBracket && TYPES.has(word.toLowerCase())) return 'typeName'
			if (state.inBracket && FIELD_OPTIONS.has(word.toLowerCase())) return 'propertyName'
			return 'variableName'
		}

		// Operators
		if (stream.match(/^[><=\-]/)) return 'operator'

		// Punctuation
		stream.next()
		return null
	},

	languageData: {
		commentTokens: { line: '//' },
	},
})

// Light mode highlighting
export const dbmlHighlightLight = HighlightStyle.define([
	{ tag: t.keyword, color: '#2563eb', fontWeight: 'bold' }, // blue - Table, Ref, Enum
	{ tag: t.typeName, color: '#7c3aed' }, // purple - integer, varchar
	{ tag: t.propertyName, color: '#ea580c' }, // orange - pk, not null
	{ tag: t.operator, color: '#dc2626' }, // red - >, <, -
	{ tag: t.string, color: '#16a34a' }, // green - strings
	{ tag: t.comment, color: '#6b7280', fontStyle: 'italic' }, // gray italic
	{ tag: t.number, color: '#d97706' }, // amber - numbers
	{ tag: t.variableName, color: '#1e293b' }, // dark - identifiers
	{ tag: t.bracket, color: '#64748b' }, // slate - brackets
])

// Dark mode highlighting
export const dbmlHighlightDark = HighlightStyle.define([
	{ tag: t.keyword, color: '#60a5fa', fontWeight: 'bold' }, // blue
	{ tag: t.typeName, color: '#a78bfa' }, // purple
	{ tag: t.propertyName, color: '#fb923c' }, // orange
	{ tag: t.operator, color: '#f87171' }, // red
	{ tag: t.string, color: '#4ade80' }, // green
	{ tag: t.comment, color: '#6b7280', fontStyle: 'italic' }, // gray italic
	{ tag: t.number, color: '#fbbf24' }, // amber
	{ tag: t.variableName, color: '#e2e8f0' }, // light - identifiers
	{ tag: t.bracket, color: '#94a3b8' }, // slate
])

export function dbmlExtensions(dark: boolean): Extension[] {
	return [dbmlLanguage, syntaxHighlighting(dark ? dbmlHighlightDark : dbmlHighlightLight)]
}
