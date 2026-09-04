import { Resolver } from 'node:dns/promises'
import { generateText, type ModelMessage } from 'ai'
import { createAnthropic, type AnthropicLanguageModelOptions } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenResponses, type OpenResponsesLanguageModelOptions } from '@ai-sdk/open-responses'
import ipaddr from 'ipaddr.js'
import { Agent, fetch as undiciFetch } from 'undici'
import { z } from 'zod'

export const byokApiFormats = ['anthropic', 'chat-completions', 'responses'] as const
export const reasoningEfforts = ['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const

export const byokConfigSchema = z.object({
  apiFormat: z.enum(byokApiFormats),
  baseUrl: z.string().trim().min(1).max(2048),
  apiKey: z.string().trim().min(1).max(4096),
  modelId: z.string().trim().min(1).max(256),
  reasoningEffort: z.enum(reasoningEfforts).default('default'),
  maxOutputTokens: z.coerce.number().int().min(1).max(1_048_576).default(4096),
})

export type ByokConfig = z.infer<typeof byokConfigSchema>
type LookupAddress = { address: string; family: number }
export type ByokLookup = (hostname: string) => Promise<LookupAddress[]>

const publicResolver = new Resolver()
publicResolver.setServers(['1.1.1.1', '8.8.8.8'])
const defaultLookup: ByokLookup = async (hostname) => {
  const [ipv4, ipv6] = await Promise.allSettled([publicResolver.resolve4(hostname), publicResolver.resolve6(hostname)])
  const addresses: LookupAddress[] = [
    ...(ipv4.status === 'fulfilled' ? ipv4.value.map((address) => ({ address, family: 4 })) : []),
    ...(ipv6.status === 'fulfilled' ? ipv6.value.map((address) => ({ address, family: 6 })) : []),
  ]
  if (!addresses.length) throw new Error(`Unable to resolve ${hostname} through public DNS`)
  return addresses
}

const blockedHostSuffixes = ['.localhost', '.local', '.internal', '.home', '.lan']

function normalizedIp(address: string) {
  const withoutBrackets = address.replace(/^\[|\]$/g, '').split('%')[0]
  if (!ipaddr.isValid(withoutBrackets)) return null
  const parsed = ipaddr.parse(withoutBrackets)
  const maybeIpv6 = parsed as typeof parsed & { isIPv4MappedAddress?: () => boolean; toIPv4Address?: () => typeof parsed }
  return parsed.kind() === 'ipv6' && maybeIpv6.isIPv4MappedAddress?.() && maybeIpv6.toIPv4Address ? maybeIpv6.toIPv4Address() : parsed
}

function isPublicIp(address: string) {
  const parsed = normalizedIp(address)
  return parsed !== null && parsed.range() === 'unicast'
}

export function publicLookupResult(addresses: LookupAddress[], all: boolean) {
  const publicAddresses = addresses.filter(({ address }) => isPublicIp(address))
  if (!publicAddresses.length) throw new Error('Provider DNS resolved to a non-public address')
  return all ? publicAddresses : publicAddresses[0]
}

export async function assertSafeProviderUrl(value: string, lookup: ByokLookup = defaultLookup) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Base URL должен быть корректным внешним HTTPS URL')
  }

  if (url.protocol !== 'https:') throw new Error('Base URL должен использовать HTTPS')
  if (url.username || url.password) throw new Error('Base URL не должен содержать логин или пароль')
  if (url.search || url.hash) throw new Error('Base URL не должен содержать query или hash')

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (hostname === 'localhost' || blockedHostSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    throw new Error('Локальные адреса запрещены')
  }

  const literalIp = normalizedIp(hostname)
  if (literalIp && !isPublicIp(hostname)) throw new Error('Base URL должен указывать на публичный адрес')

  let addresses: LookupAddress[]
  try {
    addresses = literalIp ? [{ address: hostname, family: literalIp.kind() === 'ipv4' ? 4 : 6 }] : await lookup(hostname)
  } catch {
    throw new Error('Не удалось проверить DNS Base URL')
  }
  if (!addresses.some(({ address }) => isPublicIp(address))) {
    throw new Error('Base URL должен указывать хотя бы на один публичный адрес')
  }

  url.pathname = url.pathname.replace(/\/+$/, '') || ''
  return url.toString().replace(/\/$/, '')
}

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function createPinnedFetch(lookup: ByokLookup) {
  const dispatcher = new Agent({
    connect: {
      lookup(hostname, options, callback) {
        void lookup(hostname).then((addresses) => {
          const selected = publicLookupResult(addresses, Boolean(options.all))
          if (Array.isArray(selected)) callback(null, selected)
          else callback(null, selected.address, selected.family)
        }, (error) => callback(error as Error, '', 0))
      },
    },
  })
  const fetch: typeof globalThis.fetch = async (input, init) => undiciFetch(input as Parameters<typeof undiciFetch>[0], {
    ...init,
    dispatcher,
    redirect: 'manual',
  } as Parameters<typeof undiciFetch>[1]) as unknown as Response
  const close = async () => {
    const closable = dispatcher as unknown as { close?: () => Promise<void> | void }
    if (typeof closable.close === 'function') await closable.close()
  }
  return { fetch, close }
}

export interface RunByokOptions {
  system?: string
  prompt?: string
  messages?: ModelMessage[]
}

export interface ByokUsage {
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
}

export interface ByokRunResult {
  text: string
  usage: ByokUsage
}

function normalizeUsage(usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined): ByokUsage {
  const inputTokens = typeof usage?.inputTokens === 'number' ? usage.inputTokens : null
  const outputTokens = typeof usage?.outputTokens === 'number' ? usage.outputTokens : null
  const totalTokens = typeof usage?.totalTokens === 'number' ? usage.totalTokens : (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null)
  return { inputTokens, outputTokens, totalTokens }
}

export async function runByokModelDetailed(
  rawConfig: ByokConfig,
  input: string | RunByokOptions,
  dependencies: { fetch?: typeof globalThis.fetch; lookup?: ByokLookup } = {},
) {
  const config = byokConfigSchema.parse(rawConfig)
  const lookup = dependencies.lookup ?? defaultLookup
  const baseUrl = await assertSafeProviderUrl(config.baseUrl, lookup)
  const pinned = dependencies.fetch ? null : createPinnedFetch(lookup)
  const transport = dependencies.fetch ?? pinned!.fetch
  const safeFetch: typeof globalThis.fetch = async (request, init) => {
    await assertSafeProviderUrl(String(request), lookup)
    return transport(request, { ...init, redirect: 'manual' })
  }
  const effort = config.reasoningEffort === 'default' ? undefined : config.reasoningEffort
  const options = typeof input === 'string' ? { prompt: input } : input
  const messageInstructions = options.messages
    ?.filter((message) => message.role === 'system')
    .map((message) => typeof message.content === 'string' ? message.content : JSON.stringify(message.content))
    .join('\n\n')
  const generationInput = options.messages
    ? {
        instructions: messageInstructions || options.system,
        messages: options.messages.filter((message) => message.role !== 'system'),
      }
    : { instructions: options.system, prompt: options.prompt || '' }

  try {
    if (config.apiFormat === 'anthropic') {
      const anthropic = createAnthropic({ apiKey: config.apiKey, baseURL: baseUrl, fetch: safeFetch })
      const anthropicOptions: AnthropicLanguageModelOptions | undefined = effort === 'none'
        ? { thinking: { type: 'disabled' } }
        : effort
          ? { effort: effort === 'minimal' ? 'low' : effort }
          : undefined
      const result = await generateText({
        model: anthropic(config.modelId),
        ...generationInput,
        maxOutputTokens: config.maxOutputTokens,
        providerOptions: anthropicOptions ? ({ anthropic: anthropicOptions } as never) : undefined,
      })
      if (!result.text.trim()) throw new Error('Provider returned an empty answer')
      return { text: result.text.trim(), usage: normalizeUsage(result.usage) }
    }

    if (config.apiFormat === 'responses') {
      const responses = createOpenResponses({ name: 'byok', apiKey: config.apiKey, url: endpoint(baseUrl, 'responses'), fetch: safeFetch })
      const result = await generateText({
        model: responses(config.modelId),
        ...generationInput,
        maxOutputTokens: config.maxOutputTokens,
        providerOptions: effort ? { byok: { reasoningEffort: effort } satisfies OpenResponsesLanguageModelOptions } : undefined,
      })
      if (!result.text.trim()) throw new Error('Provider returned an empty answer')
      return { text: result.text.trim(), usage: normalizeUsage(result.usage) }
    }

    const chat = createOpenAICompatible({ name: 'byok', apiKey: config.apiKey, baseURL: baseUrl, fetch: safeFetch })
    const result = await generateText({
      model: chat.chatModel(config.modelId),
      ...generationInput,
      maxOutputTokens: config.maxOutputTokens,
      providerOptions: effort ? { byok: { reasoningEffort: effort } } : undefined,
    })
    if (!result.text.trim()) throw new Error('Provider returned an empty answer')
    return { text: result.text.trim(), usage: normalizeUsage(result.usage) }
  } finally {
    await pinned?.close()
  }
}

export async function runByokModel(
  rawConfig: ByokConfig,
  input: string | RunByokOptions,
  dependencies: { fetch?: typeof globalThis.fetch; lookup?: ByokLookup } = {},
): Promise<string> {
  return (await runByokModelDetailed(rawConfig, input, dependencies)).text
}
