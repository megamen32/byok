// Model showcase extracted from compareai (data/models.json) mapped onto
// callable BYOK presets: vendor registry supplies baseUrl/apiFormat, the
// dataset supplies models, prices and context windows.
import fallbackData from './data/models.json' with { type: 'json' }
import type { ByokApiFormat, ByokPreset } from './catalog.js'

type ModelRow = {
  id: string; display: string; vendor: string
  inputUsd: number; outputUsd: number; inputRub: number; outputRub: number
  context: number; reasoning: boolean; vision: boolean
}

type Provider = { label: string; baseUrl: string; apiFormat: ByokApiFormat; note?: string }

/** Direct public BYOK endpoints; empty baseUrl means "bring your own gateway". */
export const BYOK_PROVIDERS: Record<string, Provider> = {
  qwen: { label: 'Qwen / Alibaba', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', apiFormat: 'chat-completions' },
  anthropic: { label: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', apiFormat: 'anthropic' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiFormat: 'responses' },
  google: { label: 'Google AI Studio', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', apiFormat: 'chat-completions' },
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', apiFormat: 'chat-completions' },
  moonshotai: { label: 'Kimi / Moonshot', baseUrl: 'https://api.moonshot.ai/v1', apiFormat: 'chat-completions' },
  MiniMax: { label: 'MiniMax', baseUrl: 'https://api.minimax.io/anthropic/v1', apiFormat: 'anthropic' },
  'z-ai': { label: 'Z.ai', baseUrl: 'https://api.z.ai/api/paas/v4', apiFormat: 'chat-completions' },
  'x-ai': { label: 'xAI', baseUrl: 'https://api.x.ai/v1', apiFormat: 'chat-completions' },
  mistralai: { label: 'Mistral', baseUrl: 'https://api.mistral.ai/v1', apiFormat: 'chat-completions' },
  cohere: { label: 'Cohere', baseUrl: 'https://api.cohere.com/compatibility/v1', apiFormat: 'chat-completions' },
  perplexity: { label: 'Perplexity', baseUrl: 'https://api.perplexity.ai', apiFormat: 'chat-completions' },
  stepfun: { label: 'StepFun', baseUrl: 'https://api.stepfun.com/v1', apiFormat: 'chat-completions' },
  baidu: { label: 'Baidu', baseUrl: 'https://qianfan.baidubce.com/v2', apiFormat: 'chat-completions' },
  tencent: { label: 'Tencent', baseUrl: 'https://api.lkeap.cloud.tencent.com/v1', apiFormat: 'chat-completions' },
  bytedance: { label: 'ByteDance Volcano', baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', apiFormat: 'chat-completions' },
  xiaomi: { label: 'Xiaomi', baseUrl: 'https://api.xiaomi.com/v1', apiFormat: 'chat-completions' },
  yandex: { label: 'Yandex Cloud AI', baseUrl: 'https://llm.api.cloud.yandex.net/v1', apiFormat: 'chat-completions' },
  upstage: { label: 'Upstage', baseUrl: 'https://api.upstage.ai/v1/solar', apiFormat: 'chat-completions' },
  writer: { label: 'Writer', baseUrl: 'https://api.writer.com/v1', apiFormat: 'chat-completions' },
  nvidia: { label: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', apiFormat: 'chat-completions' },
  meta: { label: 'Llama', baseUrl: '', apiFormat: 'chat-completions', note: 'Открытые веса: доступ через Together/Groq/свой gateway.' },
  'meta-llama': { label: 'Llama', baseUrl: '', apiFormat: 'chat-completions', note: 'Открытые веса: доступ через Together/Groq/свой gateway.' },
  microsoft: { label: 'Microsoft', baseUrl: '', apiFormat: 'chat-completions', note: 'Модели Microsoft доступны через Azure OpenAI.' },
  amazon: { label: 'Amazon', baseUrl: '', apiFormat: 'chat-completions', note: 'Модели Amazon доступны через AWS Bedrock.' },
}

export type ShowcaseOptions = {
  /** Model ids (vendor/model) in the exact order to show them. */
  ids?: string[]
  /** Limit the result; default: the compareai chart top list. */
  limit?: number
  /** Include the compareai chart top models first (default true). */
  chartTop?: boolean
}

/** Convert showcase rows into ready-to-use BYOK presets with ruble prices. */
export function buildShowcasePresets(options: ShowcaseOptions = {}, data: { models: ModelRow[]; chart: string[] } = fallbackData as { models: ModelRow[]; chart: string[] }): ByokPreset[] {
  const byId = new Map(data.models.map((row) => [row.id, row]))
  const ordered: ModelRow[] = []
  if (options.ids) {
    for (const id of options.ids) { const row = byId.get(id); if (row) ordered.push(row) }
  } else if (options.chartTop !== false) {
    for (const id of data.chart) { const row = byId.get(id); if (row) ordered.push(row) }
  }
  const seen = new Set(ordered.map((row) => row.id))
  if (options.limit) {
    for (const row of data.models) {
      if (ordered.length >= (options.limit)) break
      if (!seen.has(row.id)) { ordered.push(row); seen.add(row.id) }
    }
  }
  return ordered.map((row) => {
    const provider = BYOK_PROVIDERS[row.vendor]
    return {
      id: row.id,
      label: row.display,
      description: provider ? `${provider.label}${row.reasoning ? ' · reasoning' : ''}${row.vision ? ' · vision' : ''} · ${row.inputRub.toFixed(0)}₽/${row.outputRub.toFixed(0)}₽ за 1M` : row.vendor,
      apiFormat: provider?.apiFormat ?? 'chat-completions',
      baseUrl: provider?.baseUrl ?? '',
      modelId: row.display,
      contextWindow: row.context,
      maxInputTokens: null,
      maxOutputTokens: null,
      inputPricePerMillionUsd: row.inputUsd,
      cacheReadPricePerMillionUsd: null,
      cacheWritePricePerMillionUsd: null,
      outputPricePerMillionUsd: row.outputUsd,
      inputTypes: row.vision ? ['text', 'image'] : ['text'],
      outputTypes: ['text'],
      note: provider?.note || (provider ? undefined : 'Прямого публичного API нет — укажите gateway провайдера вручную.'),
    }
  })
}
