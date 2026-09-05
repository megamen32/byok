// src/fx.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
var CBR_DAILY_URL = "https://www.cbr-xml-daily.ru/daily_json.js";
var FALLBACK_USD_RUB = 80;
var memory = null;
function readFxCache(file) {
  if (memory)
    return memory;
  if (!file)
    return null;
  try {
    memory = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    memory = null;
  }
  return memory;
}
function usdRubRate(options = {}) {
  const ttl = options.ttlMs ?? 24 * 60 * 60 * 1000;
  const fetcher = options.fetcher ?? ((url) => fetch(url).then((response) => response.json()));
  const cached = readFxCache(options.file);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < ttl && !cached.stale) {
    return Promise.resolve({ usdRub: cached.usdRub, fetchedAt: cached.fetchedAt, source: "cbr" });
  }
  return (async () => {
    try {
      const payload = await fetcher(CBR_DAILY_URL);
      const value = payload?.Valute?.USD?.Value;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
        throw new Error("bad CBR payload");
      const rate = { usdRub: value, fetchedAt: new Date().toISOString(), source: "cbr" };
      memory = { ...rate };
      if (options.file) {
        try {
          mkdirSync(dirname(options.file), { recursive: true });
          writeFileSync(options.file, JSON.stringify(rate));
        } catch {}
      }
      return rate;
    } catch {
      if (cached)
        return { usdRub: cached.usdRub, fetchedAt: cached.fetchedAt, source: "cache" };
      return { usdRub: FALLBACK_USD_RUB, fetchedAt: new Date(0).toISOString(), source: "fallback" };
    }
  })();
}
function usdToRub(costUsd, rate) {
  return costUsd == null || rate == null ? null : Math.round(costUsd * rate * 1e4) / 1e4;
}
function resetFxCache() {
  memory = null;
}
export {
  usdToRub,
  usdRubRate,
  resetFxCache,
  readFxCache,
  CBR_DAILY_URL
};
