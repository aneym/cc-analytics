import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { debugLog } from './debug.ts'

export interface SubscriptionInfo {
  subscriptionType: string | null // "max", "pro", "free", etc. (from userType)
  accountUUID: string | null
  organizationUUID: string | null
}

const STATSIG_DIR = join(homedir(), '.claude', 'statsig')

// Session-level cache to avoid reading files on every event
let cachedInfo: SubscriptionInfo | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000 // Cache for 1 minute

interface StatsigCacheFile {
  source: string
  data: string
}

interface StatsigEvaluations {
  evaluated_keys?: {
    userID?: string
    stableID?: string
    customIDs?: {
      sessionId?: string
      organizationUUID?: string
      accountUUID?: string
    }
  }
}

interface StatsigLogEntry {
  eventName?: string
  metadata?: {
    userType?: string
    [key: string]: unknown
  }
}

/**
 * Find the most recently modified Statsig cache file
 */
function findLatestCacheFile(): string | null {
  if (!existsSync(STATSIG_DIR)) return null

  try {
    const files = readdirSync(STATSIG_DIR)
      .filter((f) => f.startsWith('statsig.cached.evaluations.'))
      .map((f) => {
        const path = join(STATSIG_DIR, f)
        const stat = statSync(path)
        return { path, mtime: stat.mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)

    return files[0]?.path || null
  } catch {
    return null
  }
}

/**
 * Find the most recent failed logs file
 */
function findLatestLogsFile(): string | null {
  if (!existsSync(STATSIG_DIR)) return null

  try {
    const files = readdirSync(STATSIG_DIR)
      .filter((f) => f.startsWith('statsig.failed_logs.'))
      .map((f) => {
        const path = join(STATSIG_DIR, f)
        const stat = statSync(path)
        return { path, mtime: stat.mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)

    return files[0]?.path || null
  } catch {
    return null
  }
}

/**
 * Extract account and org UUIDs from Statsig evaluations cache
 */
function extractFromEvaluationsCache(): {
  accountUUID: string | null
  organizationUUID: string | null
} {
  const result = { accountUUID: null as string | null, organizationUUID: null as string | null }

  const cacheFile = findLatestCacheFile()
  if (!cacheFile) return result

  try {
    const content = readFileSync(cacheFile, 'utf8')
    const wrapper = JSON.parse(content) as StatsigCacheFile

    // The data field is a JSON string that needs to be parsed again
    const data = JSON.parse(wrapper.data) as StatsigEvaluations

    const customIDs = data.evaluated_keys?.customIDs
    if (customIDs) {
      result.accountUUID = customIDs.accountUUID || null
      result.organizationUUID = customIDs.organizationUUID || null
    }
  } catch {
    // Silent failure
  }

  return result
}

/**
 * Extract userType from Statsig failed logs
 */
function extractUserTypeFromLogs(): string | null {
  const logsFile = findLatestLogsFile()
  if (!logsFile) return null

  try {
    const content = readFileSync(logsFile, 'utf8')

    // Try parsing as JSON array first
    try {
      const entries = JSON.parse(content) as StatsigLogEntry[]
      for (const entry of entries) {
        if (entry.metadata?.userType) {
          return entry.metadata.userType
        }
      }
    } catch {
      // Try parsing as JSONL
      for (const line of content.split('\n')) {
        if (!line.trim()) continue
        try {
          const entry = JSON.parse(line) as StatsigLogEntry[]
          // Failed logs are arrays of log entries
          for (const e of entry) {
            if (e.metadata?.userType) {
              return e.metadata.userType
            }
          }
        } catch {
          // Skip invalid lines
        }
      }
    }
  } catch {
    // Silent failure
  }

  return null
}

/**
 * Map userType to subscription type
 * Known values: "external" (consumer), "internal" (Anthropic employee)
 * We'll pass through the value as-is for now
 */
function mapUserTypeToSubscription(userType: string | null): string | null {
  // Pass through as-is - PostHog can categorize
  return userType
}

/**
 * Get subscription info from local Statsig caches
 * Results are cached for the session to avoid repeated file reads
 */
export function getSubscriptionInfo(debug = false): SubscriptionInfo {
  const now = Date.now()

  // Return cached result if still valid
  if (cachedInfo && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedInfo
  }

  if (debug) {
    debugLog('[subscription] Reading Statsig cache files')
  }

  const { accountUUID, organizationUUID } = extractFromEvaluationsCache()
  const userType = extractUserTypeFromLogs()
  const subscriptionType = mapUserTypeToSubscription(userType)

  cachedInfo = {
    subscriptionType,
    accountUUID,
    organizationUUID,
  }
  cacheTimestamp = now

  if (debug) {
    debugLog('[subscription] Result', cachedInfo)
  }

  return cachedInfo
}

/**
 * Clear the cached subscription info (useful for testing)
 */
export function clearSubscriptionCache(): void {
  cachedInfo = null
  cacheTimestamp = 0
}
