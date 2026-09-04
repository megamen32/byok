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
  { id: 'custom', label: 'Свой endpoint', description: 'Любой внешний OpenAI-compatible API', apiFormat: 'chat-completions', baseUrl: '', modelId: '', contextWindow: null, maxInputTokens: null, maxOutputTokens: null, inputPricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'] },
  { id: 'anthropic', label: 'Anthropic', description: 'Claude через Messages API', apiFormat: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', modelId: 'claude-sonnet-4-6', contextWindow: 1_000_000, maxInputTokens: null, maxOutputTokens: 128_000, inputPricePerMillionUsd: 3, outputPricePerMillionUsd: 15, inputTypes: ['text','image','pdf'], outputTypes: ['text'], catalogProviderId: 'anthropic', catalogModelId: 'claude-sonnet-4-6' },
  { id: 'openai', label: 'OpenAI', description: 'GPT через Responses API', apiFormat: 'responses', baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-5.5-pro', contextWindow: 1_050_000, maxInputTokens: 922_000, maxOutputTokens: 128_000, inputPricePerMillionUsd: 30, outputPricePerMillionUsd: 180, inputTypes: ['text','image','pdf'], outputTypes: ['text'], note: 'Нужен API key платформы OpenAI; подписка ChatGPT не является API key.', catalogProviderId: 'openai', catalogModelId: 'gpt-5.5-pro' },
  { id: 'zai', label: 'Z.ai', description: 'GLM через OpenAI-compatible API', apiFormat: 'chat-completions', baseUrl: 'https://api.z.ai/api/paas/v4', modelId: 'glm-5.3', contextWindow: 1_000_000, maxInputTokens: null, maxOutputTokens: 131_072, inputPricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'], catalogProviderId: 'zai', catalogModelId: 'glm-5.3' },
  { id: 'minimax', label: 'MiniMax', description: 'MiniMax через Anthropic-compatible API', apiFormat: 'anthropic', baseUrl: 'https://api.minimax.io/anthropic/v1', modelId: 'MiniMax-M3', contextWindow: 1_048_576, maxInputTokens: null, maxOutputTokens: 512_000, inputPricePerMillionUsd: 0.3, outputPricePerMillionUsd: 1.2, inputTypes: ['text','image','video'], outputTypes: ['text'], catalogProviderId: 'minimax', catalogModelId: 'MiniMax-M3' },
  { id: 'deepseek', label: 'DeepSeek', description: 'DeepSeek через OpenAI-compatible API', apiFormat: 'chat-completions', baseUrl: 'https://api.deepseek.com', modelId: 'deepseek-v4-pro', contextWindow: 1_000_000, maxInputTokens: null, maxOutputTokens: 384_000, inputPricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'], catalogProviderId: 'deepseek', catalogModelId: 'deepseek-v4-pro' },
  { id: 'moonshot', label: 'Kimi / Moonshot', description: 'Kimi через OpenAI-compatible API', apiFormat: 'chat-completions', baseUrl: 'https://api.moonshot.ai/v1', modelId: 'kimi-k3', contextWindow: 1_048_576, maxInputTokens: null, maxOutputTokens: 131_072, inputPricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text','image','video'], outputTypes: ['text'], catalogProviderId: 'moonshotai', catalogModelId: 'kimi-k3' },
  { id: 'tencent-hy3', label: 'Tencent Hy3', description: 'Hy3 через Tencent TokenHub', apiFormat: 'chat-completions', baseUrl: 'https://tokenhub.tencentmaas.com/v1', modelId: 'hy3', contextWindow: 256_000, maxInputTokens: null, maxOutputTokens: 64_000, inputPricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'], catalogProviderId: 'tencent-tokenhub', catalogModelId: 'hy3' },
  { id: 'opencode', label: 'OpenCode / свой gateway', description: 'OpenCode — клиент; укажите API endpoint его провайдера', apiFormat: 'chat-completions', baseUrl: '', modelId: '', contextWindow: null, maxInputTokens: null, maxOutputTokens: null, inputPricePerMillionUsd: null, outputPricePerMillionUsd: null, inputTypes: ['text'], outputTypes: ['text'], note: 'OpenCode не является моделью или API-провайдером, поэтому Base URL и Model ID задаются вручную.' },
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


export function calculateAvailableInputTokens(values: {
  contextWindow: number | null
  maxInputTokens: number | null
  requestedOutputTokens: number
}) {
  if (!values.contextWindow || !Number.isFinite(values.requestedOutputTokens)) return null
  const remainingContext = Math.max(0, values.contextWindow - Math.max(0, values.requestedOutputTokens))
  return values.maxInputTokens ? Math.min(values.maxInputTokens, remainingContext) : remainingContext
}
