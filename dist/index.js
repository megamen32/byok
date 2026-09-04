// src/index.ts
import { Resolver } from "node:dns/promises";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenResponses } from "@ai-sdk/open-responses";
import ipaddr from "ipaddr.js";
import { Agent, fetch as undiciFetch } from "undici";
import { z } from "zod";
var byokApiFormats = ["anthropic", "chat-completions", "responses"];
var reasoningEfforts = ["default", "none", "minimal", "low", "medium", "high", "xhigh", "max"];
var byokConfigSchema = z.object({
  apiFormat: z.enum(byokApiFormats),
  baseUrl: z.string().trim().min(1).max(2048),
  apiKey: z.string().trim().min(1).max(4096),
  modelId: z.string().trim().min(1).max(256),
  reasoningEffort: z.enum(reasoningEfforts).default("default"),
  maxOutputTokens: z.coerce.number().int().min(1).max(1048576).default(4096)
});
var publicResolver = new Resolver;
publicResolver.setServers(["1.1.1.1", "8.8.8.8"]);
var defaultLookup = async (hostname) => {
  const [ipv4, ipv6] = await Promise.allSettled([publicResolver.resolve4(hostname), publicResolver.resolve6(hostname)]);
  const addresses = [
    ...ipv4.status === "fulfilled" ? ipv4.value.map((address) => ({ address, family: 4 })) : [],
    ...ipv6.status === "fulfilled" ? ipv6.value.map((address) => ({ address, family: 6 })) : []
  ];
  if (!addresses.length)
    throw new Error(`Unable to resolve ${hostname} through public DNS`);
  return addresses;
};
var blockedHostSuffixes = [".localhost", ".local", ".internal", ".home", ".lan"];
function normalizedIp(address) {
  const withoutBrackets = address.replace(/^\[|\]$/g, "").split("%")[0];
  if (!ipaddr.isValid(withoutBrackets))
    return null;
  const parsed = ipaddr.parse(withoutBrackets);
  const maybeIpv6 = parsed;
  return parsed.kind() === "ipv6" && maybeIpv6.isIPv4MappedAddress?.() && maybeIpv6.toIPv4Address ? maybeIpv6.toIPv4Address() : parsed;
}
function isPublicIp(address) {
  const parsed = normalizedIp(address);
  return parsed !== null && parsed.range() === "unicast";
}
function publicLookupResult(addresses, all) {
  const publicAddresses = addresses.filter(({ address }) => isPublicIp(address));
  if (!publicAddresses.length)
    throw new Error("Provider DNS resolved to a non-public address");
  return all ? publicAddresses : publicAddresses[0];
}
async function assertSafeProviderUrl(value, lookup = defaultLookup) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Base URL должен быть корректным внешним HTTPS URL");
  }
  if (url.protocol !== "https:")
    throw new Error("Base URL должен использовать HTTPS");
  if (url.username || url.password)
    throw new Error("Base URL не должен содержать логин или пароль");
  if (url.search || url.hash)
    throw new Error("Base URL не должен содержать query или hash");
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || blockedHostSuffixes.some((suffix) => hostname.endsWith(suffix))) {
    throw new Error("Локальные адреса запрещены");
  }
  const literalIp = normalizedIp(hostname);
  if (literalIp && !isPublicIp(hostname))
    throw new Error("Base URL должен указывать на публичный адрес");
  let addresses;
  try {
    addresses = literalIp ? [{ address: hostname, family: literalIp.kind() === "ipv4" ? 4 : 6 }] : await lookup(hostname);
  } catch {
    throw new Error("Не удалось проверить DNS Base URL");
  }
  if (!addresses.some(({ address }) => isPublicIp(address))) {
    throw new Error("Base URL должен указывать хотя бы на один публичный адрес");
  }
  url.pathname = url.pathname.replace(/\/+$/, "") || "";
  return url.toString().replace(/\/$/, "");
}
function endpoint(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
function createPinnedFetch(lookup) {
  const dispatcher = new Agent({
    connect: {
      lookup(hostname, options, callback) {
        lookup(hostname).then((addresses) => {
          const selected = publicLookupResult(addresses, Boolean(options.all));
          if (Array.isArray(selected))
            callback(null, selected);
          else
            callback(null, selected.address, selected.family);
        }, (error) => callback(error, "", 0));
      }
    }
  });
  const fetch = async (input, init) => undiciFetch(input, {
    ...init,
    dispatcher,
    redirect: "manual"
  });
  const close = async () => {
    const closable = dispatcher;
    if (typeof closable.close === "function")
      await closable.close();
  };
  return { fetch, close };
}
async function runByokModel(rawConfig, input, dependencies = {}) {
  const config = byokConfigSchema.parse(rawConfig);
  const lookup = dependencies.lookup ?? defaultLookup;
  const baseUrl = await assertSafeProviderUrl(config.baseUrl, lookup);
  const pinned = dependencies.fetch ? null : createPinnedFetch(lookup);
  const transport = dependencies.fetch ?? pinned.fetch;
  const safeFetch = async (request, init) => {
    await assertSafeProviderUrl(String(request), lookup);
    return transport(request, { ...init, redirect: "manual" });
  };
  const effort = config.reasoningEffort === "default" ? undefined : config.reasoningEffort;
  const options = typeof input === "string" ? { prompt: input } : input;
  const messageInstructions = options.messages?.filter((message) => message.role === "system").map((message) => typeof message.content === "string" ? message.content : JSON.stringify(message.content)).join(`

`);
  const generationInput = options.messages ? {
    instructions: messageInstructions || options.system,
    messages: options.messages.filter((message) => message.role !== "system")
  } : { instructions: options.system, prompt: options.prompt || "" };
  try {
    if (config.apiFormat === "anthropic") {
      const anthropic = createAnthropic({ apiKey: config.apiKey, baseURL: baseUrl, fetch: safeFetch });
      const anthropicOptions = effort === "none" ? { thinking: { type: "disabled" } } : effort ? { effort: effort === "minimal" ? "low" : effort } : undefined;
      const { text: text2 } = await generateText({
        model: anthropic(config.modelId),
        ...generationInput,
        maxOutputTokens: config.maxOutputTokens,
        providerOptions: anthropicOptions ? { anthropic: anthropicOptions } : undefined
      });
      if (!text2.trim())
        throw new Error("Provider returned an empty answer");
      return text2.trim();
    }
    if (config.apiFormat === "responses") {
      const responses = createOpenResponses({ name: "byok", apiKey: config.apiKey, url: endpoint(baseUrl, "responses"), fetch: safeFetch });
      const { text: text2 } = await generateText({
        model: responses(config.modelId),
        ...generationInput,
        maxOutputTokens: config.maxOutputTokens,
        providerOptions: effort ? { byok: { reasoningEffort: effort } } : undefined
      });
      if (!text2.trim())
        throw new Error("Provider returned an empty answer");
      return text2.trim();
    }
    const chat = createOpenAICompatible({ name: "byok", apiKey: config.apiKey, baseURL: baseUrl, fetch: safeFetch });
    const { text } = await generateText({
      model: chat.chatModel(config.modelId),
      ...generationInput,
      maxOutputTokens: config.maxOutputTokens,
      providerOptions: effort ? { byok: { reasoningEffort: effort } } : undefined
    });
    if (!text.trim())
      throw new Error("Provider returned an empty answer");
    return text.trim();
  } finally {
    await pinned?.close();
  }
}
export {
  runByokModel,
  reasoningEfforts,
  publicLookupResult,
  byokConfigSchema,
  byokApiFormats,
  assertSafeProviderUrl
};
