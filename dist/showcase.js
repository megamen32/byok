// src/showcase.ts
import fallbackData from "./data/models.json";
var BYOK_PROVIDERS = {
  qwen: { label: "Qwen / Alibaba", baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", apiFormat: "chat-completions" },
  anthropic: { label: "Anthropic", baseUrl: "https://api.anthropic.com/v1", apiFormat: "anthropic" },
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", apiFormat: "responses" },
  google: { label: "Google AI Studio", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", apiFormat: "chat-completions" },
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com", apiFormat: "chat-completions" },
  moonshotai: { label: "Kimi / Moonshot", baseUrl: "https://api.moonshot.ai/v1", apiFormat: "chat-completions" },
  MiniMax: { label: "MiniMax", baseUrl: "https://api.minimax.io/anthropic/v1", apiFormat: "anthropic" },
  "z-ai": { label: "Z.ai", baseUrl: "https://api.z.ai/api/paas/v4", apiFormat: "chat-completions" },
  "x-ai": { label: "xAI", baseUrl: "https://api.x.ai/v1", apiFormat: "chat-completions" },
  mistralai: { label: "Mistral", baseUrl: "https://api.mistral.ai/v1", apiFormat: "chat-completions" },
  cohere: { label: "Cohere", baseUrl: "https://api.cohere.com/compatibility/v1", apiFormat: "chat-completions" },
  perplexity: { label: "Perplexity", baseUrl: "https://api.perplexity.ai", apiFormat: "chat-completions" },
  stepfun: { label: "StepFun", baseUrl: "https://api.stepfun.com/v1", apiFormat: "chat-completions" },
  baidu: { label: "Baidu", baseUrl: "https://qianfan.baidubce.com/v2", apiFormat: "chat-completions" },
  tencent: { label: "Tencent", baseUrl: "https://api.lkeap.cloud.tencent.com/v1", apiFormat: "chat-completions" },
  bytedance: { label: "ByteDance Volcano", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", apiFormat: "chat-completions" },
  xiaomi: { label: "Xiaomi", baseUrl: "https://api.xiaomi.com/v1", apiFormat: "chat-completions" },
  yandex: { label: "Yandex Cloud AI", baseUrl: "https://llm.api.cloud.yandex.net/v1", apiFormat: "chat-completions" },
  upstage: { label: "Upstage", baseUrl: "https://api.upstage.ai/v1/solar", apiFormat: "chat-completions" },
  writer: { label: "Writer", baseUrl: "https://api.writer.com/v1", apiFormat: "chat-completions" },
  nvidia: { label: "NVIDIA NIM", baseUrl: "https://integrate.api.nvidia.com/v1", apiFormat: "chat-completions" },
  meta: { label: "Llama", baseUrl: "", apiFormat: "chat-completions", note: "Открытые веса: доступ через Together/Groq/свой gateway." },
  "meta-llama": { label: "Llama", baseUrl: "", apiFormat: "chat-completions", note: "Открытые веса: доступ через Together/Groq/свой gateway." },
  microsoft: { label: "Microsoft", baseUrl: "", apiFormat: "chat-completions", note: "Модели Microsoft доступны через Azure OpenAI." },
  amazon: { label: "Amazon", baseUrl: "", apiFormat: "chat-completions", note: "Модели Amazon доступны через AWS Bedrock." }
};
function buildShowcasePresets(options = {}, data = fallbackData) {
  const byId = new Map(data.models.map((row) => [row.id, row]));
  const ordered = [];
  if (options.ids) {
    for (const id of options.ids) {
      const row = byId.get(id);
      if (row)
        ordered.push(row);
    }
  } else if (options.chartTop !== false) {
    for (const id of data.chart) {
      const row = byId.get(id);
      if (row)
        ordered.push(row);
    }
  }
  const seen = new Set(ordered.map((row) => row.id));
  if (options.limit) {
    for (const row of data.models) {
      if (ordered.length >= options.limit)
        break;
      if (!seen.has(row.id)) {
        ordered.push(row);
        seen.add(row.id);
      }
    }
  }
  return ordered.map((row) => {
    const provider = BYOK_PROVIDERS[row.vendor];
    return {
      id: row.id,
      label: row.display,
      description: provider ? `${provider.label}${row.reasoning ? " · reasoning" : ""}${row.vision ? " · vision" : ""} · ${row.inputRub.toFixed(0)}₽/${row.outputRub.toFixed(0)}₽ за 1M` : row.vendor,
      apiFormat: provider?.apiFormat ?? "chat-completions",
      baseUrl: provider?.baseUrl ?? "",
      modelId: row.display,
      contextWindow: row.context,
      maxInputTokens: null,
      maxOutputTokens: null,
      inputPricePerMillionUsd: row.inputUsd,
      cacheReadPricePerMillionUsd: null,
      cacheWritePricePerMillionUsd: null,
      outputPricePerMillionUsd: row.outputUsd,
      inputTypes: row.vision ? ["text", "image"] : ["text"],
      outputTypes: ["text"],
      note: provider?.note || (provider ? undefined : "Прямого публичного API нет — укажите gateway провайдера вручную.")
    };
  });
}
export {
  buildShowcasePresets,
  BYOK_PROVIDERS
};
