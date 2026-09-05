// src/ledger.ts
import { randomUUID } from "node:crypto";
import { usdRubRate, usdToRub } from "./fx.js";
import { appendFileSync, readFileSync } from "node:fs";
import { runByokModelDetailed } from "./index.js";
import { calculateUsageCostUsd } from "./catalog.js";
import modelsData from "./data/models.json";
var pricingKey = (value) => value.toLowerCase().replace(/^[a-z0-9 .:-]+:\s*/, "").replace(/[^a-z0-9]/g, "");
var showcasePricingIndex = new Map(modelsData.models.map((row) => [pricingKey(row.display), row]));
function findShowcasePricing(modelId) {
  const row = showcasePricingIndex.get(pricingKey(modelId));
  return row ? { inputPricePerMillionUsd: row.inputUsd, cacheReadPricePerMillionUsd: row.inputUsd, cacheWritePricePerMillionUsd: row.inputUsd, outputPricePerMillionUsd: row.outputUsd } : null;
}

class ByokLedger {
  options;
  records = [];
  loaded = false;
  constructor(options = { persist: true }) {
    this.options = { keep: 500, maxPreviewChars: 200, persistFull: true, ...options };
  }
  async record(entry) {
    const usage = entry.usage ?? { inputTokens: null, noCacheInputTokens: null, cacheReadTokens: null, cacheWriteTokens: null, outputTokens: null, totalTokens: null };
    const pricing = entry.pricing ?? findShowcasePricing(entry.model);
    const costUsd = pricing ? calculateUsageCostUsd({
      inputTokens: usage.inputTokens,
      noCacheInputTokens: usage.noCacheInputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      outputTokens: usage.outputTokens
    }, {
      inputPricePerMillionUsd: pricing.inputPricePerMillionUsd,
      cacheReadPricePerMillionUsd: pricing.cacheReadPricePerMillionUsd,
      cacheWritePricePerMillionUsd: pricing.cacheWritePricePerMillionUsd,
      outputPricePerMillionUsd: pricing.outputPricePerMillionUsd
    }) : null;
    let fxRate = entry.fxRate ?? null;
    if (costUsd != null && fxRate === null && this.options.fxFile !== undefined) {
      fxRate = (await usdRubRate({ file: this.options.fxFile })).usdRub;
    }
    const preview = (value) => value ? value.slice(0, this.options.maxPreviewChars) : undefined;
    const full = this.options.persistFull ? {
      system: entry.system,
      prompt: entry.prompt,
      reasoning: entry.reasoning,
      completion: entry.completion
    } : {};
    const record = {
      id: randomUUID(),
      ts: entry.ts ?? new Date().toISOString(),
      userId: entry.userId ?? "",
      taskId: entry.taskId ?? "",
      sessionId: entry.sessionId ?? "",
      model: entry.model,
      providerHost: entry.providerHost ?? "",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      totalTokens: usage.totalTokens,
      costUsd,
      costRub: usdToRub(costUsd, fxRate),
      fxRate,
      durationMs: entry.durationMs ?? 0,
      ok: entry.ok ?? true,
      error: entry.error,
      promptPreview: preview(entry.prompt),
      completionPreview: preview(entry.completion),
      ...full
    };
    if (this.options.persist) {
      this.ensureLoaded();
      this.records.unshift(record);
      if (this.records.length > this.options.keep)
        this.records.length = this.options.keep;
      if (this.options.file)
        appendFileSync(this.options.file, JSON.stringify(record) + `
`);
    }
    return record;
  }
  entries(filter = {}) {
    if (!this.options.persist)
      return [];
    this.ensureLoaded();
    let list = this.records;
    if (filter.userId)
      list = list.filter((item) => item.userId === filter.userId);
    if (filter.taskId)
      list = list.filter((item) => item.taskId === filter.taskId);
    if (filter.sessionId)
      list = list.filter((item) => item.sessionId === filter.sessionId);
    return list.slice(0, filter.limit ?? 100);
  }
  totals(filter = {}) {
    const list = this.entries({ ...filter, limit: undefined });
    const known = list.filter((item) => item.costUsd != null);
    const rubKnown = list.filter((item) => item.costRub != null);
    return {
      calls: list.length,
      inputTokens: list.reduce((sum, item) => sum + (item.inputTokens ?? 0), 0),
      outputTokens: list.reduce((sum, item) => sum + (item.outputTokens ?? 0), 0),
      costUsd: known.reduce((sum, item) => sum + (item.costUsd ?? 0), 0),
      costUsdKnown: list.length > 0 && known.length === list.length,
      costRub: rubKnown.reduce((sum, item) => sum + (item.costRub ?? 0), 0),
      fxRate: list.find((item) => item.fxRate != null)?.fxRate ?? null
    };
  }
  ensureLoaded() {
    if (this.loaded || !this.options.file) {
      this.loaded = true;
      return;
    }
    this.loaded = true;
    try {
      const lines = readFileSync(this.options.file, "utf8").split(`
`).filter(Boolean).slice(-this.options.keep);
      this.records = lines.map((line) => JSON.parse(line)).reverse();
    } catch {}
  }
}
function nullLedger() {
  return new ByokLedger({ persist: false });
}
async function runByokModelTracked(config, input, context = {}) {
  const ledger = context.ledger ?? new ByokLedger({ persist: false });
  const started = Date.now();
  const asOptions = typeof input === "string" ? { prompt: input } : input;
  const prompt = asOptions.prompt ?? "";
  const system = asOptions.system ?? (asOptions.messages ?? []).find((message) => message.role === "system");
  const systemText = typeof system === "string" ? system : system && typeof system === "object" && ("content" in system) ? String(system.content) : "";
  try {
    const result = await runByokModelDetailed(config, input, { fetch: context.fetch, timeoutMs: context.timeoutMs });
    const cost = context.pricing ?? findShowcasePricing(config.modelId);
    const costUsd = cost ? calculateUsageCostUsd({
      inputTokens: result.usage.inputTokens,
      noCacheInputTokens: result.usage.noCacheInputTokens,
      cacheReadTokens: result.usage.cacheReadTokens,
      cacheWriteTokens: result.usage.cacheWriteTokens,
      outputTokens: result.usage.outputTokens
    }, cost) : null;
    const think = result.text.match(/<think>([\s\S]*?)<\/think>/);
    const reasoning = think ? think[1].trim() : undefined;
    const cleanText = think ? result.text.replace(/<think>[\s\S]*?<\/think>/, "").trim() : result.text;
    const record = await ledger.record({
      userId: context.userId,
      taskId: context.taskId,
      sessionId: context.sessionId,
      model: config.modelId,
      providerHost: new URL(config.baseUrl).hostname,
      usage: result.usage,
      pricing: context.pricing ?? null,
      durationMs: Date.now() - started,
      ok: true,
      system: systemText || undefined,
      prompt: prompt || undefined,
      reasoning,
      completion: cleanText
    });
    return { text: result.text, usage: result.usage, costUsd, record };
  } catch (error) {
    await ledger.record({
      userId: context.userId,
      taskId: context.taskId,
      sessionId: context.sessionId,
      model: config.modelId,
      providerHost: (() => {
        try {
          return new URL(config.baseUrl).hostname;
        } catch {
          return "";
        }
      })(),
      usage: null,
      pricing: context.pricing ?? null,
      durationMs: Date.now() - started,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      system: systemText || undefined,
      prompt: prompt || undefined
    });
    throw error;
  }
}
export {
  runByokModelTracked,
  nullLedger,
  findShowcasePricing,
  ByokLedger
};
