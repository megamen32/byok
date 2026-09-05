export type ByokApiFormat = 'anthropic' | 'chat-completions' | 'responses'

export type ByokPreset = {
  id: string
  label: string
  description: string
  apiFormat: ByokApiFormat
  baseUrl: string
  modelId: string
  contextWindow: number | null
  maxInputTokens: number | null
  maxOutputTokens: number | null
  inputPricePerMillionUsd: number | null
  cacheReadPricePerMillionUsd: number | null
  cacheWritePricePerMillionUsd: number | null
  outputPricePerMillionUsd: number | null
  inputTypes: string[]
  outputTypes: string[]
  note?: string
  catalogProviderId?: string
  catalogModelId?: string
}


export type ByokCatalogResponse = {
  presets: ByokPreset[]
  source: 'models.dev' | 'bundled-fallback' | 'fallback'
  sourceUrl: string
  fetchedAt: string
  degraded?: boolean
}

export const MODELS_DEV_URL = 'https://models.dev/api.json'

export const fallbackByokPresets: ByokPreset[] = [
  { id: 'custom', label: 'Свой endpoint', description: 'Любой внешний OpenAI-compatible API', apiFormat: 'chat-completions', baseUrl: '', modelId: '', contextWindow: null, maxInputTokens: null, maxOutputTokens: null, inputPricePerMillionUsd: null, cacheReadPricePerMillionUsd: null, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'] },
  { id: 'anthropic', label: 'Anthropic', description: 'Claude через Messages API', apiFormat: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', modelId: 'claude-sonnet-4-6', contextWindow: 1_000_000, maxInputTokens: null, maxOutputTokens: 128_000, inputPricePerMillionUsd: 3, cacheReadPricePerMillionUsd: 0.3, cacheWritePricePerMillionUsd: 3.75, outputPricePerMillionUsd: 15, inputTypes: ['text','image','pdf'], outputTypes: ['text'], catalogProviderId: 'anthropic', catalogModelId: 'claude-sonnet-4-6' },
  { id: 'openai', label: 'OpenAI', description: 'GPT через Responses API', apiFormat: 'responses', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-5.5-pro', contextWindow: 1_050_000, maxInputTokens: 922_000, maxOutputTokens: 128_000, inputPricePerMillionUsd: 30, cacheReadPricePerMillionUsd: null, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: 180, inputTypes: ['text','image','pdf'], outputTypes: ['text'], note: 'Нужен API key платформы OpenAI; подписка ChatGPT не является API key.', catalogProviderId: 'openai', catalogModelId: 'gpt-5.5-pro' },
  { id: 'zai', label: 'Z.ai', description: 'GLM через OpenAI-compatible API', apiFormat: 'chat-completions', baseUrl: 'https://api.z.ai/api/paas/v4', modelId: 'glm-5.3', contextWindow: 1_000_000, maxInputTokens: null, maxOutputTokens: 131_072, inputPricePerMillionUsd: null, cacheReadPricePerMillionUsd: null, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'], catalogProviderId: 'zai', catalogModelId: 'glm-5.3' },
  { id: 'minimax', label: 'MiniMax', description: 'MiniMax через Anthropic-compatible API', apiFormat: 'anthropic', baseUrl: 'https://api.minimax.io/anthropic/v1', modelId: 'MiniMax-M3', contextWindow: 1_048_576, maxInputTokens: null, maxOutputTokens: 512_000, inputPricePerMillionUsd: 0.3, cacheReadPricePerMillionUsd: 0.06, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: 1.2, inputTypes: ['text','image','video'], outputTypes: ['text'], catalogProviderId: 'minimax', catalogModelId: 'MiniMax-M3' },
  { id: 'deepseek', label: 'DeepSeek', description: 'DeepSeek через OpenAI-compatible API', apiFormat: 'chat-completions', baseUrl: 'https://api.deepseek.com', modelId: 'deepseek-v4-pro', contextWindow: 1_000_000, maxInputTokens: null, maxOutputTokens: 384_000, inputPricePerMillionUsd: null, cacheReadPricePerMillionUsd: null, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'], catalogProviderId: 'deepseek', catalogModelId: 'deepseek-v4-pro' },
  { id: 'moonshot', label: 'Kimi / Moonshot', description: 'Kimi через OpenAI-compatible API', apiFormat: 'chat-completions', baseUrl: 'https://api.moonshot.ai/v1', modelId: 'kimi-k3', contextWindow: 1_048_576, maxInputTokens: null, maxOutputTokens: 131_072, inputPricePerMillionUsd: null, cacheReadPricePerMillionUsd: null, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text','image','video'], outputTypes: ['text'], catalogProviderId: 'moonshotai', catalogModelId: 'kimi-k3' },
  { id: 'tencent-hy3', label: 'Tencent Hy3', description: 'Hy3 через Tencent TokenHub', apiFormat: 'chat-completions', baseUrl: 'https://tokenhub.tencentmaas.com/v1', modelId: 'hy3', contextWindow: 256_000, maxInputTokens: null, maxOutputTokens: 64_000, inputPricePerMillionUsd: null, cacheReadPricePerMillionUsd: null, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'], catalogProviderId: 'tencent-tokenhub', catalogModelId: 'hy3' },
  { id: 'opencode', label: 'OpenCode / свой gateway', description: 'OpenCode — клиент; укажите API endpoint его провайдера', apiFormat: 'chat-completions', baseUrl: '', modelId: '', contextWindow: null, maxInputTokens: null, maxOutputTokens: null, inputPricePerMillionUsd: null, cacheReadPricePerMillionUsd: null, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'], note: 'OpenCode не является моделью или API-провайдером, поэтому Base URL и Model ID задаются вручную.' },
]

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}
function finiteNumber(value: unknown) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null }
function stringList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [] }

export function buildByokPresetsFromModelsDev(payload: unknown): ByokPreset[] {
  const providers = record(payload)
  if (!providers) return fallbackByokPresets.map((preset) => ({ ...preset }))
  return fallbackByokPresets.map((preset) => {
    if (!preset.catalogProviderId || !preset.catalogModelId) return { ...preset }
    const provider = record(providers[preset.catalogProviderId])
    const model = record(record(provider?.models)?.[preset.catalogModelId])
    if (!provider || !model) return { ...preset }
    const limit = record(model.limit)
    const modalities = record(model.modalities)
    const cost = record(model.cost)
    return {
      ...preset,
      baseUrl: typeof provider.api === 'string' && provider.api.startsWith('https://') ? provider.api : preset.baseUrl,
      contextWindow: finiteNumber(limit?.context) ?? preset.contextWindow,
      maxInputTokens: finiteNumber(limit?.input) ?? preset.maxInputTokens,
      maxOutputTokens: finiteNumber(limit?.output) ?? preset.maxOutputTokens,
      inputPricePerMillionUsd: finiteNumber(cost?.input) ?? preset.inputPricePerMillionUsd,
      cacheReadPricePerMillionUsd: finiteNumber(cost?.cache_read) ?? preset.cacheReadPricePerMillionUsd,
      cacheWritePricePerMillionUsd: finiteNumber(cost?.cache_write) ?? preset.cacheWritePricePerMillionUsd,
      outputPricePerMillionUsd: finiteNumber(cost?.output) ?? preset.outputPricePerMillionUsd,
      inputTypes: stringList(modalities?.input).length ? stringList(modalities?.input) : preset.inputTypes,
      outputTypes: stringList(modalities?.output).length ? stringList(modalities?.output) : preset.outputTypes,
    }
  })
}

export function estimateCostUsd(inputTokens: number, outputTokens: number, preset: Pick<ByokPreset, 'inputPricePerMillionUsd' | 'outputPricePerMillionUsd'>) {
  if (preset.inputPricePerMillionUsd == null || preset.outputPricePerMillionUsd == null) return null
  return (Math.max(0,inputTokens) / 1_000_000) * preset.inputPricePerMillionUsd + (Math.max(0,outputTokens) / 1_000_000) * preset.outputPricePerMillionUsd
}

export function calculateUsageCostUsd(usage: {
  inputTokens: number | null
  noCacheInputTokens?: number | null
  cacheReadTokens?: number | null
  cacheWriteTokens?: number | null
  outputTokens: number | null
}, prices: Pick<ByokPreset, 'inputPricePerMillionUsd' | 'cacheReadPricePerMillionUsd' | 'cacheWritePricePerMillionUsd' | 'outputPricePerMillionUsd'>) {
  if (usage.outputTokens == null || prices.inputPricePerMillionUsd == null || prices.outputPricePerMillionUsd == null) return null
  const cacheRead = Math.max(0, usage.cacheReadTokens ?? 0)
  const cacheWrite = Math.max(0, usage.cacheWriteTokens ?? 0)
  const uncached = Math.max(0, usage.noCacheInputTokens ?? ((usage.inputTokens ?? 0) - cacheRead - cacheWrite))
  if (cacheRead > 0 && prices.cacheReadPricePerMillionUsd == null) return null
  if (cacheWrite > 0 && prices.cacheWritePricePerMillionUsd == null) return null
  return (uncached / 1_000_000) * prices.inputPricePerMillionUsd
    + (cacheRead / 1_000_000) * (prices.cacheReadPricePerMillionUsd ?? 0)
    + (cacheWrite / 1_000_000) * (prices.cacheWritePricePerMillionUsd ?? 0)
    + (Math.max(0, usage.outputTokens) / 1_000_000) * prices.outputPricePerMillionUsd
}


export function calculateAvailableInputTokens(values: {
  contextWindow: number | null
  maxInputTokens: number | null
  requestedOutputTokens: number
}) {
  if (!values.contextWindow || !Number.isFinite(values.requestedOutputTokens)) return null
  const remainingContext = Math.max(0, values.contextWindow - Math.max(0, values.requestedOutputTokens))
  return values.maxInputTokens ? Math.min(values.maxInputTokens, remainingContext) : remainingContext
}

// --- preset preview (compareai-style cards) ---------------------------------

export type ByokPresetPreview = {
  id: string
  label: string
  description: string
  apiFormat: ByokApiFormat
  baseUrl: string
  modelId: string
  contextWindow: number | null
  inputPricePerMillionUsd: number | null
  cacheReadPricePerMillionUsd: number | null
  outputPricePerMillionUsd: number | null
  priceLabel: string  // "$0.30 / $1.20 за 1M токенов" | "цены недоступны"
  note?: string
}

/** Project presets into compact UI cards with a human price line. */
export function previewByokPresets(presets: ByokPreset[]): ByokPresetPreview[] {
  return presets.map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    apiFormat: preset.apiFormat,
    baseUrl: preset.baseUrl,
    modelId: preset.modelId,
    contextWindow: preset.contextWindow,
    inputPricePerMillionUsd: preset.inputPricePerMillionUsd,
    cacheReadPricePerMillionUsd: preset.cacheReadPricePerMillionUsd,
    outputPricePerMillionUsd: preset.outputPricePerMillionUsd,
    priceLabel: preset.inputPricePerMillionUsd != null && preset.outputPricePerMillionUsd != null
      ? `$${preset.inputPricePerMillionUsd} / $${preset.outputPricePerMillionUsd} за 1M токенов`
      : 'цены недоступны',
    note: preset.note,
  }))
}

let catalogCache: { response: ByokCatalogResponse; expiresAt: number } | null = null

/** Fetch the models.dev catalog (cached) and fall back to bundled presets. */
export async function fetchByokCatalogResponse(
  ttlMs = 3_600_000,
  fetcher: (url: string) => Promise<unknown> = (url) => fetch(url).then((response) => response.json()),
): Promise<ByokCatalogResponse> {
  const now = Date.now()
  if (catalogCache && catalogCache.expiresAt > now) return catalogCache.response
  const fallback: ByokCatalogResponse = {
    presets: fallbackByokPresets.map((preset) => ({ ...preset })),
    source: 'bundled-fallback', sourceUrl: MODELS_DEV_URL, fetchedAt: new Date().toISOString(),
  }
  try {
    const payload = await fetcher(MODELS_DEV_URL)
    const response: ByokCatalogResponse = {
      presets: buildByokPresetsFromModelsDev(payload),
      source: 'models.dev', sourceUrl: MODELS_DEV_URL, fetchedAt: new Date().toISOString(),
    }
    catalogCache = { response, expiresAt: now + ttlMs }
    return response
  } catch {
    return fallback
  }
}
