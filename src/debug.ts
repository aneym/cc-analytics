import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEBUG_DIR = join(homedir(), '.claude', 'analytics')
const DEBUG_FILE = join(DEBUG_DIR, 'debug.log')

export function debugLog(message: string, data?: unknown): void {
  try {
    if (!existsSync(DEBUG_DIR)) {
      mkdirSync(DEBUG_DIR, { recursive: true })
    }

    const timestamp = new Date().toISOString()
    let logLine = `[${timestamp}] ${message}`

    if (data !== undefined) {
      logLine += ` ${JSON.stringify(data)}`
    }

    appendFileSync(DEBUG_FILE, `${logLine}\n`)
  } catch {
    // Silent failure - debug logging should never break the hook
  }
}
