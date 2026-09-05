// USD→RUB from the Central Bank of Russia mirror (cbr-xml-daily.ru),
// cached on disk for a day; falls back to the last stored rate so a
// network hiccup never zeroes the ruble column.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export const CBR_DAILY_URL = 'https://www.cbr-xml-daily.ru/daily_json.js'

export type ByokFxRate = {
  usdRub: number
  fetchedAt: string
  source: 'cbr' | 'cache' | 'fallback'
}

type FxCache = ByokFxRate & { stale?: boolean }

const FALLBACK_USD_RUB = 80 // last-resort constant; cache usually wins

let memory: FxCache | null = null

export function readFxCache(file?: string): FxCache | null {
  if (memory) return memory
  if (!file) return null
  try { memory = JSON.parse(readFileSync(file, 'utf8')) as FxCache } catch { memory = null }
  return memory
}

export function usdRubRate(
  options: { file?: string; ttlMs?: number; fetcher?: (url: string) => Promise<unknown> } = {},
): Promise<ByokFxRate> {
  const ttl = options.ttlMs ?? 24 * 60 * 60 * 1000
  const fetcher = options.fetcher ?? ((url: string) => fetch(url).then((response) => response.json()))
  const cached = readFxCache(options.file)
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < ttl && !cached.stale) {
    return Promise.resolve({ usdRub: cached.usdRub, fetchedAt: cached.fetchedAt, source: 'cbr' })
  }
  return (async () => {
    try {
      const payload = (await fetcher(CBR_DAILY_URL)) as { Valute?: { USD?: { Value?: number } } }
      const value = payload?.Valute?.USD?.Value
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('bad CBR payload')
      const rate: ByokFxRate = { usdRub: value, fetchedAt: new Date().toISOString(), source: 'cbr' }
      memory = { ...rate }
      if (options.file) {
        try { mkdirSync(dirname(options.file), { recursive: true }); writeFileSync(options.file, JSON.stringify(rate)) } catch { /* cache write is best-effort */ }
      }
      return rate
    } catch {
      if (cached) return { usdRub: cached.usdRub, fetchedAt: cached.fetchedAt, source: 'cache' }
      return { usdRub: FALLBACK_USD_RUB, fetchedAt: new Date(0).toISOString(), source: 'fallback' }
    }
  })()
}

export function usdToRub(costUsd: number | null, rate: number | null): number | null {
  return costUsd == null || rate == null ? null : Math.round(costUsd * rate * 10000) / 10000
}

/** Test hook: drop the in-memory rate cache. */
export function resetFxCache(): void { memory = null }
