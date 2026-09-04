# @bezrabotnyi/byok

Reusable **Bring Your Own Key** layer for Node.js AI applications.

It provides:

- SSRF-safe external provider URLs: HTTPS-only, blocks localhost/private ranges, public-DNS validation, pinned DNS transport, no redirects.
- AI SDK adapters for Anthropic Messages, OpenAI-compatible Chat Completions and Responses APIs.
- Provider/model presets with live `models.dev` metadata support and local fallbacks.
- Context/output limits and input/output token prices.
- A small cost estimator.

## Install from GitHub

```bash
bun add @bezrabotnyi/byok@github:megamen32/byok#v1.0.0
```

## Run a model

```ts
import { runByokModel } from '@bezrabotnyi/byok'

const text = await runByokModel({
  apiFormat: 'anthropic',
  baseUrl: 'https://api.minimax.io/anthropic/v1',
  apiKey: process.env.MINIMAX_API_KEY!,
  modelId: 'MiniMax-M3',
  reasoningEffort: 'default',
  maxOutputTokens: 4096,
}, {
  system: 'Answer concisely.',
  prompt: 'Hello!',
})
```

## Presets and prices

```ts
import {
  MODELS_DEV_URL,
  buildByokPresetsFromModelsDev,
  estimateCostUsd,
} from '@bezrabotnyi/byok/catalog'

const catalog = await fetch(MODELS_DEV_URL).then(r => r.json())
const presets = buildByokPresetsFromModelsDev(catalog)

const minimax = presets.find(p => p.id === 'minimax')!
const estimatedUsd = estimateCostUsd(10_000, 2_000, minimax)
```

Pricing metadata is an estimate, not billing authority. Providers can change prices; refresh from `models.dev` or verify against the provider before relying on it for billing.

## Security note

API keys are caller-owned values. This package does not persist them. Do not expose server-side keys to browser bundles.

## License

MIT
