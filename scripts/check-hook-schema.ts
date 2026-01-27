#!/usr/bin/env bun
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TYPES_PATH = join(__dirname, '..', 'src', 'types.ts')
const BASELINE_PATH = join(__dirname, 'schema-baseline.json')

interface SchemaBaseline {
  version: string
  lastChecked: string
  hookEvents: string[]
  interfaces: Record<string, { fields: string[]; required: string[] }>
}

interface SchemaDiff {
  missingEvents: string[]
  extraEvents: string[]
  interfaceDiffs: Record<string, { missingFields: string[]; extraFields: string[] }>
}

interface ParsedInterfaces {
  [name: string]: { fields: string[]; extends?: string }
}

function parseTypesFile(content: string): { events: string[]; interfaces: Record<string, string[]> } {
  const events: string[] = []
  const rawInterfaces: ParsedInterfaces = {}

  const eventMatch = content.match(/export type HookEvent =\s*([\s\S]*?)(?=\n\n|export)/m)
  if (eventMatch) {
    const eventBlock = eventMatch[1]
    const eventRegex = /'\s*(\w+)\s*'/g
    let match: RegExpExecArray | null
    while ((match = eventRegex.exec(eventBlock)) !== null) {
      events.push(match[1])
    }
  }

  const interfaceRegex = /export interface (\w+Input)(?:\s+extends\s+(\w+))?\s*\{([\s\S]*?)\}/g
  let interfaceMatch: RegExpExecArray | null
  while ((interfaceMatch = interfaceRegex.exec(content)) !== null) {
    const name = interfaceMatch[1]
    const extendsFrom = interfaceMatch[2]
    const body = interfaceMatch[3]
    const fields: string[] = []
    const fieldRegex = /(\w+)\??:/g
    let fieldMatch: RegExpExecArray | null
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields.push(fieldMatch[1])
    }
    rawInterfaces[name] = { fields, extends: extendsFrom }
  }

  const interfaces: Record<string, string[]> = {}
  for (const [name, data] of Object.entries(rawInterfaces)) {
    const allFields = [...data.fields]
    if (data.extends && rawInterfaces[data.extends]) {
      allFields.push(...rawInterfaces[data.extends].fields)
    }
    interfaces[name] = allFields
  }

  return { events, interfaces }
}

function compareSchemas(current: ReturnType<typeof parseTypesFile>, baseline: SchemaBaseline): SchemaDiff {
  const missingEvents = baseline.hookEvents.filter((e) => !current.events.includes(e))
  const extraEvents = current.events.filter((e) => !baseline.hookEvents.includes(e))

  const interfaceDiffs: Record<string, { missingFields: string[]; extraFields: string[] }> = {}

  for (const [name, expected] of Object.entries(baseline.interfaces)) {
    const actual = current.interfaces[name] || []
    const missingFields = expected.fields.filter((f) => !actual.includes(f))
    const extraFields = actual.filter((f) => !expected.fields.includes(f))

    if (missingFields.length > 0 || extraFields.length > 0) {
      interfaceDiffs[name] = { missingFields, extraFields }
    }
  }

  for (const name of Object.keys(current.interfaces)) {
    if (!baseline.interfaces[name] && !interfaceDiffs[name]) {
      interfaceDiffs[name] = { missingFields: [], extraFields: current.interfaces[name] }
    }
  }

  return { missingEvents, extraEvents, interfaceDiffs }
}

function formatDiff(diff: SchemaDiff): string {
  const lines: string[] = []

  if (diff.missingEvents.length > 0) {
    lines.push('Missing hook events (expected but not found):')
    for (const event of diff.missingEvents) {
      lines.push(`  - ${event}`)
    }
    lines.push('')
  }

  if (diff.extraEvents.length > 0) {
    lines.push('Extra hook events (found but not expected):')
    for (const event of diff.extraEvents) {
      lines.push(`  + ${event}`)
    }
    lines.push('')
  }

  const interfaceNames = Object.keys(diff.interfaceDiffs)
  if (interfaceNames.length > 0) {
    lines.push('Interface differences:')
    for (const name of interfaceNames) {
      const { missingFields, extraFields } = diff.interfaceDiffs[name]
      if (missingFields.length > 0 || extraFields.length > 0) {
        lines.push(`  ${name}:`)
        for (const field of missingFields) {
          lines.push(`    - ${field} (missing)`)
        }
        for (const field of extraFields) {
          lines.push(`    + ${field} (extra)`)
        }
      }
    }
  }

  return lines.join('\n')
}

function main(): void {
  const typesContent = readFileSync(TYPES_PATH, 'utf8')
  const baselineContent = readFileSync(BASELINE_PATH, 'utf8')

  const current = parseTypesFile(typesContent)
  const baseline = JSON.parse(baselineContent) as SchemaBaseline

  const diff = compareSchemas(current, baseline)

  const hasDiff =
    diff.missingEvents.length > 0 ||
    diff.extraEvents.length > 0 ||
    Object.keys(diff.interfaceDiffs).length > 0

  if (hasDiff) {
    console.log('Schema differences detected:\n')
    console.log(formatDiff(diff))
    process.exit(1)
  } else {
    console.log('Schema matches baseline. No differences found.')
    process.exit(0)
  }
}

main()
