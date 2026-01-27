import { existsSync, readFileSync } from 'node:fs'
import { calculateTokenCost, getModelPricing } from './pricing.ts'

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
}

export interface TurnCost {
  input_cost: number
  output_cost: number
  cache_creation_cost: number
  cache_read_cost: number
  total_cost: number
}

export interface TurnUsageData {
  usage: TokenUsage
  model: string
  turnIndex: number
}

interface TranscriptUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

interface TranscriptMessage {
  model?: string
  usage?: TranscriptUsage
}

interface TranscriptEntry {
  type: string
  message?: TranscriptMessage
}

export function extractLastTurnUsage(transcriptPath: string): TurnUsageData | null {
  if (!existsSync(transcriptPath)) {
    return null
  }

  try {
    const content = readFileSync(transcriptPath, 'utf8')
    const lines = content.trim().split('\n')

    let lastAssistantEntry: TranscriptEntry | null = null
    let turnIndex = 0

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const entry = JSON.parse(line) as TranscriptEntry

        // Count assistant messages (each is a turn)
        if (entry.type === 'assistant' && entry.message?.usage) {
          turnIndex++
          lastAssistantEntry = entry
        }
      } catch {}
    }

    if (!lastAssistantEntry?.message?.usage) {
      return null
    }

    const msg = lastAssistantEntry.message
    const usage = msg.usage!

    return {
      usage: {
        input_tokens: usage.input_tokens ?? 0,
        output_tokens: usage.output_tokens ?? 0,
        cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      },
      model: msg.model ?? 'unknown',
      turnIndex,
    }
  } catch {
    return null
  }
}

export function calculateCost(usage: TokenUsage, model: string): TurnCost {
  const pricing = getModelPricing(model)

  const inputCost = calculateTokenCost(usage.input_tokens, pricing.input)
  const outputCost = calculateTokenCost(usage.output_tokens, pricing.output)
  const cacheReadCost = calculateTokenCost(usage.cache_read_input_tokens, pricing.cacheRead)
  const cacheCreationCost = calculateTokenCost(
    usage.cache_creation_input_tokens,
    pricing.cacheCreation
  )

  return {
    input_cost: inputCost,
    output_cost: outputCost,
    cache_creation_cost: cacheCreationCost,
    cache_read_cost: cacheReadCost,
    total_cost: inputCost + outputCost + cacheReadCost + cacheCreationCost,
  }
}
