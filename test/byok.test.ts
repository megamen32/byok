import { describe, expect, test } from 'bun:test'
import { assertSafeProviderUrl, publicLookupResult } from '../src/index'
import { buildByokPresetsFromModelsDev, calculateAvailableInputTokens, calculateUsageCostUsd, estimateCostUsd, fallbackByokPresets } from '../src/catalog'

describe('safe provider URL', () => {
  test('rejects localhost/private/http', async () => {
    await expect(assertSafeProviderUrl('https://localhost/v1')).rejects.toThrow()
    await expect(assertSafeProviderUrl('https://127.0.0.1/v1')).rejects.toThrow()
    await expect(assertSafeProviderUrl('http://api.example.com/v1')).rejects.toThrow()
  })
  test('accepts public HTTPS with public DNS', async () => {
    expect(await assertSafeProviderUrl('https://api.example.com/v1/', async () => [{ address: '93.184.216.34', family: 4 }])).toBe('https://api.example.com/v1')
  })
  test('filters private DNS answers', () => {
    expect(publicLookupResult([{ address: '10.0.0.2', family: 4 }, { address: '93.184.216.34', family: 4 }], false)).toEqual({ address: '93.184.216.34', family: 4 })
  })
})

describe('catalog', () => {
  test('estimates cost', () => {
    expect(estimateCostUsd(10_000, 2_000, { inputPricePerMillionUsd: 0.3, outputPricePerMillionUsd: 1.2 })).toBeCloseTo(0.0054)
  })
  test('prices cache hits separately', () => {
    expect(calculateUsageCostUsd({ inputTokens: 10000, noCacheInputTokens: 2000, cacheReadTokens: 8000, cacheWriteTokens: 0, outputTokens: 2000 }, { inputPricePerMillionUsd: 5, cacheReadPricePerMillionUsd: 0.5, cacheWritePricePerMillionUsd: null, outputPricePerMillionUsd: 30 })).toBeCloseTo(0.074)
  })
  test('calculates available input tokens', () => {
    expect(calculateAvailableInputTokens({ contextWindow: 100_000, maxInputTokens: 80_000, requestedOutputTokens: 30_000 })).toBe(70_000)
  })
  test('keeps fallback catalog for invalid payload', () => {
    expect(buildByokPresetsFromModelsDev(null)).toHaveLength(fallbackByokPresets.length)
  })
})

describe('preset preview', () => {
  test('previewByokPresets renders price labels', async () => {
    const { previewByokPresets, fallbackByokPresets } = await import('../src/catalog')
    const cards = previewByokPresets(fallbackByokPresets)
    const minimax = cards.find((card) => card.id === 'minimax')!
    expect(minimax.modelId).toBe('MiniMax-M3')
    expect(minimax.priceLabel).toContain('$0.3')
    expect(minimax.priceLabel).toContain('$1.2')
    const custom = cards.find((card) => card.id === 'custom')!
    expect(custom.priceLabel).toBe('цены недоступны')
  })

  test('fetchByokCatalogResponse falls back when models.dev is unreachable', async () => {
    const { fetchByokCatalogResponse } = await import('../src/catalog')
    const response = await fetchByokCatalogResponse(60_000, async () => { throw new Error('offline') })
    expect(response.source).toBe('bundled-fallback')
    expect(response.presets.length).toBeGreaterThan(3)
  })
})
