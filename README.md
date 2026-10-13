# @bezrabotnyi/byok

Reusable **Bring Your Own Key** layer for Node.js AI applications.

It provides:

- SSRF-safe external provider URLs: HTTPS-only, blocks localhost/private ranges, public-IP validation through the system resolver, pinned DNS transport, no redirects.
- AI SDK adapters for Anthropic Messages, OpenAI-compatible Chat Completions and Responses APIs.
- Provider/model presets with live `models.dev` metadata support and local fallbacks.
- Context/output limits and input/output token prices.
- A small cost estimator.

## Install from GitHub

```bash
bun add @bezrabotnyi/byok@github:megamen32/byok#v1.8.4
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

## DNS behaviour

BYOK uses the operating system resolver (`dns.lookup`), respecting host/network
DNS configuration and regional CDN answers. It does not select1.1.1.1,8.8.8.8
or any other external DNS server and does not edit host DNS settings.
HTTPS, public-IP validation, connection-time public-address filtering and
redirect rejection remain in place. A caller can still supply an explicit
`dependencies.lookup` for its own tested environment; it is never imposed.

Release1.8.4 fixes MiniMax reachability where forced public DNS selected an
unreachable CDN route while the host resolver returned a reachable public IP.
