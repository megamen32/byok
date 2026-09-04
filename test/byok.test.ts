import { describe, expect, test } from 'bun:test'
import { assertSafeProviderUrl, publicLookupResult } from '../src/index'
import { buildByokPresetsFromModelsDev, calculateAvailableInputTokens, estimateCostUsd, fallbackByokPresets } from '../src/catalog'

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
  test('calculates available input tokens', () => {
    expect(calculateAvailableInputTokens({ contextWindow: 100_000, maxInputTokens: 80_000, requestedOutputTokens: 30_000 })).toBe(70_000)
  })
  test('keeps fallback catalog for invalid payload', () => {
    expect(buildByokPresetsFromModelsDev(null)).toHaveLength(fallbackByokPresets.length)
  })
})
