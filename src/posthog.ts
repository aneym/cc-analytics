import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { BufferedEvent, PluginConfig, PostHogEvent } from './types.ts'
import { detectUser } from './user.ts'

// Simple debug logging for posthog module
const DEBUG_FILE = join(homedir(), '.claude', 'analytics', 'debug.log')
function posthogDebug(msg: string): void {
  try {
    appendFileSync(DEBUG_FILE, `[${new Date().toISOString()}] [posthog] ${msg}\n`)
  } catch {}
}

const BUFFER_DIR = join(homedir(), '.claude', 'analytics')
const BUFFER_FILE = join(BUFFER_DIR, 'buffer.jsonl')
const FLUSH_THRESHOLD = 10

/**
 * Ensure buffer directory exists
 */
function ensureBufferDir(): void {
  if (!existsSync(BUFFER_DIR)) {
    mkdirSync(BUFFER_DIR, { recursive: true })
  }
}

/**
 * Append event to local buffer
 */
function bufferEvent(event: PostHogEvent): void {
  posthogDebug(`bufferEvent called: ${event.event}`)
  ensureBufferDir()
  const buffered: BufferedEvent = {
    ...event,
    buffered_at: new Date().toISOString(),
  }
  const line = `${JSON.stringify(buffered)}\n`

  if (existsSync(BUFFER_FILE)) {
    const existing = readFileSync(BUFFER_FILE, 'utf8')
    writeFileSync(BUFFER_FILE, existing + line)
    posthogDebug(`bufferEvent written: ${event.event}`)
  } else {
    writeFileSync(BUFFER_FILE, line)
    posthogDebug(`bufferEvent created: ${event.event}`)
  }
}

/**
 * Read all buffered events
 */
function readBuffer(): BufferedEvent[] {
  if (!existsSync(BUFFER_FILE)) return []

  const content = readFileSync(BUFFER_FILE, 'utf8')
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as BufferedEvent
      } catch {
        return null
      }
    })
    .filter((e): e is BufferedEvent => e !== null)
}

/**
 * Clear the buffer file
 */
function clearBuffer(): void {
  if (existsSync(BUFFER_FILE)) {
    writeFileSync(BUFFER_FILE, '')
  }
}

interface PostHogBatch {
  api_key: string
  batch: Array<{
    event: string
    properties: Record<string, unknown>
    distinct_id: string
    timestamp: string
  }>
}

/**
 * Send events to PostHog via HTTP
 */
async function sendToPostHog(
  events: PostHogEvent[],
  config: PluginConfig['posthog']
): Promise<boolean> {
  if (!events.length || !config.apiKey) {
    return false
  }

  const batch: PostHogBatch = {
    api_key: config.apiKey,
    batch: events.map((e) => ({
      event: e.event,
      properties: e.properties,
      distinct_id: e.distinct_id,
      timestamp: e.timestamp,
    })),
  }

  try {
    const response = await fetch(`${config.host}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(5000),
    })

    return response.ok
  } catch {
    return false
  }
}

/**
 * Capture an event - buffers locally and sends async
 */
export async function capture(
  eventName: string,
  properties: Record<string, unknown>,
  config: PluginConfig
): Promise<void> {
  // Auto-detect user if not configured
  const user = detectUser(config.user)

  const event: PostHogEvent = {
    event: eventName,
    distinct_id: user.email,
    timestamp: new Date().toISOString(),
    properties: {
      ...properties,
      $set: {
        name: user.name || config.user.name,
        email: user.email,
        team: config.user.team,
        user_source: user.source,
      },
    },
  }

  bufferEvent(event)

  const buffered = readBuffer()
  if (buffered.length >= FLUSH_THRESHOLD) {
    const success = await sendToPostHog(buffered, config.posthog)
    if (success) {
      clearBuffer()
    }
  }
}

/**
 * Force flush all buffered events
 */
export async function flush(config: PluginConfig): Promise<{ sent: number; success: boolean }> {
  const buffered = readBuffer()

  if (!buffered.length) {
    return { sent: 0, success: true }
  }

  const success = await sendToPostHog(buffered, config.posthog)
  if (success) {
    clearBuffer()
  }

  return { sent: buffered.length, success }
}

/**
 * Get buffer stats
 */
export function getBufferStats(): { count: number; oldestAt: string | null } {
  const buffered = readBuffer()

  if (!buffered.length) {
    return { count: 0, oldestAt: null }
  }

  const oldest = buffered.reduce((min, e) => {
    const t = e.buffered_at
    return t < min ? t : min
  }, buffered[0]!.buffered_at)

  return { count: buffered.length, oldestAt: oldest }
}

export { BUFFER_DIR, BUFFER_FILE }
