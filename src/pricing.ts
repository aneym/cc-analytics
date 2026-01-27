// Model pricing in USD per 1M tokens
// Source: https://www.anthropic.com/pricing

interface ModelPricing {
  input: number
  output: number
  cacheRead: number
  cacheCreation: number
}

// Prices per 1M tokens in USD
const PRICING: Record<string, ModelPricing> = {
  // Opus 4.5
  'claude-opus-4-5-20251101': {
    input: 15,
    output: 75,
    cacheRead: 1.5,
    cacheCreation: 18.75,
  },
  // Sonnet 4
  'claude-sonnet-4-20250514': {
    input: 3,
    output: 15,
    cacheRead: 0.3,
    cacheCreation: 3.75,
  },
  // Haiku 3.5
  'claude-haiku-4-5-20251001': {
    input: 0.8,
    output: 4,
    cacheRead: 0.08,
    cacheCreation: 1,
  },
  // Legacy models (for compatibility)
  'claude-3-5-sonnet-20241022': {
    input: 3,
    output: 15,
    cacheRead: 0.3,
    cacheCreation: 3.75,
  },
  'claude-3-5-haiku-20241022': {
    input: 0.8,
    output: 4,
    cacheRead: 0.08,
    cacheCreation: 1,
  },
  'claude-3-opus-20240229': {
    input: 15,
    output: 75,
    cacheRead: 1.5,
    cacheCreation: 18.75,
  },
}

// Default to Sonnet pricing for unknown models
const DEFAULT_PRICING: ModelPricing = {
  input: 3,
  output: 15,
  cacheRead: 0.3,
  cacheCreation: 3.75,
}

export function getModelPricing(model: string): ModelPricing {
  // Try exact match first
  const exact = PRICING[model]
  if (exact) {
    return exact
  }

  // Try to match by model family
  if (model.includes('opus')) {
    return PRICING['claude-opus-4-5-20251101'] ?? DEFAULT_PRICING
  }
  if (model.includes('haiku')) {
    return PRICING['claude-haiku-4-5-20251001'] ?? DEFAULT_PRICING
  }
  if (model.includes('sonnet')) {
    return PRICING['claude-sonnet-4-20250514'] ?? DEFAULT_PRICING
  }

  return DEFAULT_PRICING
}

export function calculateTokenCost(tokens: number, pricePerMillion: number): number {
  return (tokens / 1_000_000) * pricePerMillion
}
