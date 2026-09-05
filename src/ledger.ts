// Cost ledger: every tracked BYOK call is recorded with user/task context,
// priced automatically (explicit prices, else the showcase dataset) and made
// queryable for wallets and run views. persist:false = "не запоминать".
import { randomUUID } from 'node:crypto'
import { usdRubRate, usdToRub } from './fx.js'
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { runByokModelDetailed, type ByokConfig, type ByokUsage, type RunByokOptions } from './index.js'
import { calculateUsageCostUsd } from './catalog.js'
import modelsData from './data/models.json' with { type: 'json' }

export type ByokPricing = {
  inputPricePerMillionUsd: number | null
  cacheReadPricePerMillionUsd: number | null
  cacheWritePricePerMillionUsd: number | null
  outputPricePerMillionUsd: number | null
}

export type ByokLedgerRecord = {
  id: string
  ts: string
  userId: string
  taskId: string
  sessionId: string
  model: string
  providerHost: string
  inputTokens: number | null
  outputTokens: number | null
  cacheReadTokens: number | null
  cacheWriteTokens: number | null
  totalTokens: number | null
  costUsd: number | null
  costRub: number | null
  fxRate: number | null
  durationMs: number
  ok: boolean
  error?: string
  promptPreview?: string
  completionPreview?: string
  /** Full transcript (persistFull, on by default). */
  system?: string
  prompt?: string
  reasoning?: string
  completion?: string
}

export type ByokLedgerOptions = {
  /** Запоминать прогоны или нет (default true). */
  persist: boolean
  /** JSONL file used when persist is true. */
  file?: string
  /** How many records to keep loaded/returned (default 500). */
  keep?: number
  /** Preview trimming for prompt/completion (default 200 chars). */
  maxPreviewChars?: number
  /** Store full transcripts (system/prompt/reasoning/completion). Default true. */
  persistFull?: boolean
  /** USD→RUB cache file for the daily CBR rate. */
  fxFile?: string
}

export type ByokLedgerFilter = {
  userId?: string
  taskId?: string
  sessionId?: string
  limit?: number
}

export type ByokLedgerTotals = {
  calls: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  costUsdKnown: boolean
  costRub: number
  fxRate: number | null
}

/** Auto-pricing from the bundled compareai dataset by model display name. */
export function findShowcasePricing(modelId: string): ByokPricing | null {
  const row = (modelsData.models as Array<{ display: string; inputUsd: number; outputUsd: number }>)
    .find((item) => item.display === modelId)
  return row ? { inputPricePerMillionUsd: row.inputUsd, cacheReadPricePerMillionUsd: null, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: row.outputUsd } : null
}

export class ByokLedger {
  private readonly options: Required<Pick<ByokLedgerOptions, 'keep' | 'maxPreviewChars'>> & ByokLedgerOptions
  private records: ByokLedgerRecord[] = []
  private loaded = false

  constructor(options: ByokLedgerOptions = { persist: true }) {
    this.options = { keep: 500, maxPreviewChars: 200, persistFull: true, ...options }
  }

  async record(entry: {
    userId?: string; taskId?: string; sessionId?: string
    model: string; providerHost?: string
    usage?: ByokUsage | null; pricing?: ByokPricing | null
    durationMs?: number; ok?: boolean; error?: string
    system?: string; prompt?: string; completion?: string; reasoning?: string
    ts?: string; fxRate?: number | null
  }): Promise<ByokLedgerRecord> {
    const usage = entry.usage ?? { inputTokens: null, noCacheInputTokens: null, cacheReadTokens: null, cacheWriteTokens: null, outputTokens: null, totalTokens: null }
    const pricing = entry.pricing ?? findShowcasePricing(entry.model)
    const costUsd = pricing ? calculateUsageCostUsd({
      inputTokens: usage.inputTokens,
      noCacheInputTokens: usage.noCacheInputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      outputTokens: usage.outputTokens,
    }, {
      inputPricePerMillionUsd: pricing.inputPricePerMillionUsd,
      cacheReadPricePerMillionUsd: pricing.cacheReadPricePerMillionUsd,
      cacheWritePricePerMillionUsd: pricing.cacheWritePricePerMillionUsd,
      outputPricePerMillionUsd: pricing.outputPricePerMillionUsd,
    } as never) : null
    let fxRate = entry.fxRate ?? null
    if (costUsd != null && fxRate === null && this.options.fxFile !== undefined) {
      fxRate = (await usdRubRate({ file: this.options.fxFile })).usdRub
    }
    const preview = (value?: string) => value ? value.slice(0, this.options.maxPreviewChars!) : undefined
    const full = this.options.persistFull ? {
      system: entry.system, prompt: entry.prompt,
      reasoning: entry.reasoning, completion: entry.completion,
    } : {}
    const record: ByokLedgerRecord = {
      id: randomUUID(),
      ts: entry.ts ?? new Date().toISOString(),
      userId: entry.userId ?? '', taskId: entry.taskId ?? '', sessionId: entry.sessionId ?? '',
      model: entry.model, providerHost: entry.providerHost ?? '',
      inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens, cacheWriteTokens: usage.cacheWriteTokens,
      totalTokens: usage.totalTokens,
      costUsd, costRub: usdToRub(costUsd, fxRate),
      fxRate,
      durationMs: entry.durationMs ?? 0,
      ok: entry.ok ?? true, error: entry.error,
      promptPreview: preview(entry.prompt), completionPreview: preview(entry.completion),
      ...full,
    }
    if (this.options.persist) {
      this.ensureLoaded()
      this.records.unshift(record)
      if (this.records.length > this.options.keep!) this.records.length = this.options.keep!
      if (this.options.file) appendFileSync(this.options.file, JSON.stringify(record) + '\n')
    }
    return record
  }

  entries(filter: ByokLedgerFilter = {}): ByokLedgerRecord[] {
    if (!this.options.persist) return []
    this.ensureLoaded()
    let list = this.records
    if (filter.userId) list = list.filter((item) => item.userId === filter.userId)
    if (filter.taskId) list = list.filter((item) => item.taskId === filter.taskId)
    if (filter.sessionId) list = list.filter((item) => item.sessionId === filter.sessionId)
    return list.slice(0, filter.limit ?? 100)
  }

  totals(filter: ByokLedgerFilter = {}): ByokLedgerTotals {
    const list = this.entries({ ...filter, limit: undefined })
    const known = list.filter((item) => item.costUsd != null)
    const rubKnown = list.filter((item) => item.costRub != null)
    return {
      calls: list.length,
      inputTokens: list.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0),
      outputTokens: list.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0),
      costUsd: known.reduce((sum, item) => sum + (item.costUsd ?? 0), 0),
      costUsdKnown: list.length > 0 && known.length === list.length,
      costRub: rubKnown.reduce((sum, item) => sum + (item.costRub ?? 0), 0),
      fxRate: list.find((item) => item.fxRate != null)?.fxRate ?? null,
    }
  }

  private ensureLoaded() {
    if (this.loaded || !this.options.file) { this.loaded = true; return }
    this.loaded = true
    try {
      const lines = readFileSync(this.options.file, 'utf8').split('\n').filter(Boolean).slice(-this.options.keep!)
      this.records = lines.map((line) => JSON.parse(line) as ByokLedgerRecord).reverse()
    } catch { /* fresh file */ }
  }
}

/** A ledger that forgets everything — «не запоминать сессию». */
export function nullLedger(): ByokLedger {
  return new ByokLedger({ persist: false })
}

export type ByokRunContext = {
  userId?: string
  taskId?: string
  sessionId?: string
  /** Explicit per-million prices; auto-priced from the dataset when omitted. */
  pricing?: ByokPricing
  ledger?: ByokLedger
  fetch?: typeof globalThis.fetch
  timeoutMs?: number
}

/** runByokModel that records usage and cost with user/task attribution. */
export async function runByokModelTracked(
  config: ByokConfig, input: string | RunByokOptions, context: ByokRunContext = {},
): Promise<{ text: string; usage: ByokUsage; costUsd: number | null; record: ByokLedgerRecord }> {
  const ledger = context.ledger ?? new ByokLedger({ persist: false })
  const started = Date.now()
  const asOptions = typeof input === 'string' ? { prompt: input } : input
  const prompt = asOptions.prompt ?? ''
  const system = asOptions.system ?? (asOptions.messages ?? []).find((message) => message.role === 'system')
  const systemText = typeof system === 'string' ? system : system && typeof system === 'object' && 'content' in system ? String((system as { content: unknown }).content) : ''
  try {
    const result = await runByokModelDetailed(config, input, { fetch: context.fetch, timeoutMs: context.timeoutMs })
    const cost = context.pricing ?? findShowcasePricing(config.modelId)
    const costUsd = cost ? calculateUsageCostUsd({
      inputTokens: result.usage.inputTokens,
      noCacheInputTokens: result.usage.noCacheInputTokens,
      cacheReadTokens: result.usage.cacheReadTokens,
      cacheWriteTokens: result.usage.cacheWriteTokens,
      outputTokens: result.usage.outputTokens,
    }, cost as never) : null
    const think = result.text.match(/<think>([\s\S]*?)<\/think>/)
    const reasoning = think ? think[1].trim() : undefined
    const cleanText = think ? result.text.replace(/<think>[\s\S]*?<\/think>/, '').trim() : result.text
    const record = await ledger.record({
      userId: context.userId, taskId: context.taskId, sessionId: context.sessionId,
      model: config.modelId, providerHost: new URL(config.baseUrl).hostname,
      usage: result.usage, pricing: context.pricing ?? null,
      durationMs: Date.now() - started, ok: true,
      system: systemText || undefined, prompt: prompt || undefined,
      reasoning, completion: cleanText,
    })
    return { text: result.text, usage: result.usage, costUsd, record }
  } catch (error) {
    await ledger.record({
      userId: context.userId, taskId: context.taskId, sessionId: context.sessionId,
      model: config.modelId, providerHost: (() => { try { return new URL(config.baseUrl).hostname } catch { return '' } })(),
      usage: null, pricing: context.pricing ?? null,
      durationMs: Date.now() - started, ok: false,
      error: error instanceof Error ? error.message : String(error),
      system: systemText || undefined, prompt: prompt || undefined,
    })
    throw error
  }
}
