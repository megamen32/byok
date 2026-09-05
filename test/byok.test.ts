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

describe('preset UI', () => {
  test('renderPresetCards renders cards with prices and escapes html', async () => {
    const { renderPresetCards } = await import('../src/ui')
    const cards = renderPresetCards([
      { id: 'minimax', label: 'MiniMax <опасно>', description: 'd', apiFormat: 'anthropic', baseUrl: 'https://api.minimax.io/anthropic/v1', modelId: 'MiniMax-M3', contextWindow: 1048576, inputPricePerMillionUsd: 0.3, cacheReadPricePerMillionUsd: null, outputPricePerMillionUsd: 1.2, priceLabel: '$0.3 / $1.2 за 1M токенов' },
    ], { selectedId: 'minimax', showContext: true })
    expect(cards).toContain('byok-card--selected')
    expect(cards).toContain('MiniMax &lt;опасно&gt;')
    expect(cards).toContain('$0.3 / $1.2 за 1M токенов')
    expect(cards).toContain('1 048K контекст')
  })

  test('renderPresetCards empty hint', async () => {
    const { renderPresetCards } = await import('../src/ui')
    expect(renderPresetCards([])).toContain('byok-empty')
  })

  test('BYOK_FORM_FIELDS covers every api format', async () => {
    const { BYOK_FORM_FIELDS } = await import('../src/ui')
    for (const format of ['chat-completions', 'anthropic', 'responses']) {
      const names = BYOK_FORM_FIELDS[format].map((field) => field.name)
      expect(names).toContain('base_url')
      expect(names).toContain('model_id')
      expect(names).toContain('api_key')
    }
  })

  test('defineByokPresetPicker registers once', async () => {
    const { defineByokPresetPicker } = await import('../src/ui')
    const defined: string[] = []
    const fakeRegistry = { get: (name: string) => defined.includes(name), define: (name: string) => defined.push(name) } as unknown as CustomElementRegistry
    defineByokPresetPicker(fakeRegistry)
    defineByokPresetPicker(fakeRegistry)
    expect(defined).toEqual(['byok-preset-picker'])
  })
})

describe('showcase presets', () => {
  test('chart top becomes presets with providers and rub prices', async () => {
    const { buildShowcasePresets } = await import('../src/showcase')
    const presets = buildShowcasePresets()
    expect(presets.length).toBeGreaterThanOrEqual(20)
    const qwen = presets.find((p) => p.id === 'qwen/qwen3.8-max')!
    expect(qwen.baseUrl).toContain('dashscope')
    expect(qwen.inputPricePerMillionUsd).toBeGreaterThan(0)
    const custom = presets.find((p) => p.id.includes('muse') || p.id.includes('hy3'))
    expect(custom).toBeTruthy()
  })

  test('unknown vendors get a bring-your-gateway note', async () => {
    const { buildShowcasePresets } = await import('../src/showcase')
    const presets = buildShowcasePresets({ ids: ['meta/muse-spark-1.1'] })
    if (presets.length) {
      expect(presets[0].baseUrl).toBe('')
      expect(presets[0].note).toBeTruthy()
    }
  })
})

describe('cost ledger', () => {
  test('records usage, auto-prices from the dataset, filters and totals', async () => {
    const { ByokLedger, findShowcasePricing } = await import('../src/ledger')
    const pricing = findShowcasePricing('qwen3.8-max')!
    expect(pricing.inputPricePerMillionUsd).toBeGreaterThan(0)
    const ledger = new ByokLedger({ persist: true })
    ledger.record({ userId: 'u1', taskId: 't1', model: 'qwen3.8-max', usage: { inputTokens: 1_000_000, noCacheInputTokens: 1_000_000, cacheReadTokens: null, cacheWriteTokens: null, outputTokens: 1_000_000, totalTokens: 2_000_000 } as never })
    ledger.record({ userId: 'u1', taskId: 't2', model: 'qwen3.8-max', usage: { inputTokens: 500_000, noCacheInputTokens: 500_000, cacheReadTokens: null, cacheWriteTokens: null, outputTokens: 0, totalTokens: 500_000 } as never })
    ledger.record({ userId: 'u2', taskId: 't1', model: 'unknown-model', usage: null })
    expect(ledger.entries({ taskId: 't1' }).length).toBe(2)
    const totals = ledger.totals({ userId: 'u1' })
    expect(totals.calls).toBe(2)
    // 1M*2.6 + 1M*7.8 = 10.4 and 0.5M*2.6 = 1.3 → 11.7
    expect(totals.costUsd).toBeCloseTo(11.7, 3)
    expect(totals.costUsdKnown).toBe(true)
  })

  test('persist=false forgets everything and file ledger round-trips', async () => {
    const { ByokLedger } = await import('../src/ledger')
    const forgetful = new ByokLedger({ persist: false })
    forgetful.record({ model: 'm' })
    expect(forgetful.entries().length).toBe(0)
    const file = `/tmp/byok-ledger-test-${Date.now()}.jsonl`
    const disk = new ByokLedger({ persist: true, file })
    disk.record({ userId: 'u1', taskId: 't9', model: 'glm-5.1' })
    const reloaded = new ByokLedger({ persist: true, file })
    expect(reloaded.entries({ taskId: 't9' }).length).toBe(1)
  })

  test('runs table renders rows, totals and escapes html', async () => {
    const { renderRunsTable } = await import('../src/runs-ui')
    const html = renderRunsTable([
      { id: '1', ts: '2026-09-05T19:00:00Z', userId: 'u1', taskId: '<задача>', sessionId: '', model: 'kimi-k2.6', providerHost: 'api.moonshot.ai', inputTokens: 120, outputTokens: 30, cacheReadTokens: null, cacheWriteTokens: null, totalTokens: 150, costUsd: 0.0031, durationMs: 1400, ok: true },
      { id: '2', ts: '2026-09-05T19:01:00Z', userId: 'u1', taskId: 't', sessionId: '', model: 'x', providerHost: '', inputTokens: null, outputTokens: null, cacheReadTokens: null, cacheWriteTokens: null, totalTokens: null, costUsd: null, durationMs: 500, ok: false, error: 'boom' },
    ], { calls: 2, inputTokens: 120, outputTokens: 30, costUsd: 0.0031, costUsdKnown: true })
    expect(html).toContain('&lt;задача&gt;')
    expect(html).toContain('2 прогонов')
    expect(html).toContain('byok-runs__row--error')
    expect(renderRunsTable([])).toContain('byok-empty')
  })
})
