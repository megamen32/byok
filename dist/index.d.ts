import { type ModelMessage } from 'ai';
import { z } from 'zod';
export declare const byokApiFormats: readonly ["anthropic", "chat-completions", "responses"];
export declare const reasoningEfforts: readonly ["default", "none", "minimal", "low", "medium", "high", "xhigh", "max"];
export declare const byokConfigSchema: z.ZodObject<{
    apiFormat: z.ZodEnum<{
        anthropic: "anthropic";
        "chat-completions": "chat-completions";
        responses: "responses";
    }>;
    baseUrl: z.ZodString;
    apiKey: z.ZodString;
    modelId: z.ZodString;
    reasoningEffort: z.ZodDefault<z.ZodEnum<{
        default: "default";
        none: "none";
        minimal: "minimal";
        low: "low";
        medium: "medium";
        high: "high";
        xhigh: "xhigh";
        max: "max";
    }>>;
    maxOutputTokens: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type ByokConfig = z.infer<typeof byokConfigSchema>;
type LookupAddress = {
    address: string;
    family: number;
};
export type ByokLookup = (hostname: string) => Promise<LookupAddress[]>;
export declare function publicLookupResult(addresses: LookupAddress[], all: boolean): LookupAddress | LookupAddress[];
export declare function assertSafeProviderUrl(value: string, lookup?: ByokLookup): Promise<string>;
export interface RunByokOptions {
    system?: string;
    prompt?: string;
    messages?: ModelMessage[];
}
export interface ByokUsage {
    inputTokens: number | null;
    noCacheInputTokens: number | null;
    cacheReadTokens: number | null;
    cacheWriteTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
}
export interface ByokRunResult {
    text: string;
    usage: ByokUsage;
}
export declare function runByokModelDetailed(rawConfig: ByokConfig, input: string | RunByokOptions, dependencies?: {
    fetch?: typeof globalThis.fetch;
    lookup?: ByokLookup;
    timeoutMs?: number;
}): Promise<{
    text: string;
    usage: ByokUsage;
}>;
export declare function runByokModel(rawConfig: ByokConfig, input: string | RunByokOptions, dependencies?: {
    fetch?: typeof globalThis.fetch;
    lookup?: ByokLookup;
    timeoutMs?: number;
}): Promise<string>;
export {};
