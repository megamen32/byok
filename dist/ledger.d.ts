import { type ByokConfig, type ByokUsage, type RunByokOptions } from './index.js';
export type ByokPricing = {
    inputPricePerMillionUsd: number | null;
    cacheReadPricePerMillionUsd: number | null;
    cacheWritePricePerMillionUsd: number | null;
    outputPricePerMillionUsd: number | null;
};
export type ByokLedgerRecord = {
    id: string;
    ts: string;
    userId: string;
    taskId: string;
    sessionId: string;
    model: string;
    providerHost: string;
    inputTokens: number | null;
    outputTokens: number | null;
    cacheReadTokens: number | null;
    cacheWriteTokens: number | null;
    totalTokens: number | null;
    costUsd: number | null;
    costRub: number | null;
    fxRate: number | null;
    durationMs: number;
    ok: boolean;
    error?: string;
    promptPreview?: string;
    completionPreview?: string;
    /** Full transcript (persistFull, on by default). */
    system?: string;
    prompt?: string;
    reasoning?: string;
    completion?: string;
};
export type ByokLedgerOptions = {
    /** Запоминать прогоны или нет (default true). */
    persist: boolean;
    /** JSONL file used when persist is true. */
    file?: string;
    /** How many records to keep loaded/returned (default 500). */
    keep?: number;
    /** Preview trimming for prompt/completion (default 200 chars). */
    maxPreviewChars?: number;
    /** Store full transcripts (system/prompt/reasoning/completion). Default true. */
    persistFull?: boolean;
    /** USD→RUB cache file for the daily CBR rate. */
    fxFile?: string;
};
export type ByokLedgerFilter = {
    userId?: string;
    taskId?: string;
    sessionId?: string;
    limit?: number;
};
export type ByokLedgerTotals = {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    costUsdKnown: boolean;
    costRub: number;
    fxRate: number | null;
};
/** Auto-pricing from the bundled compareai dataset; fuzzy on naming
 * ("MiniMax-M3" ≈ "minimax-m3" ≈ "MiniMax: MiniMax M3"). Cache reads are
 * conservatively priced as full input until the dataset carries cache rates. */
export declare function findShowcasePricing(modelId: string): ByokPricing | null;
export declare class ByokLedger {
    private readonly options;
    private records;
    private loaded;
    constructor(options?: ByokLedgerOptions);
    record(entry: {
        userId?: string;
        taskId?: string;
        sessionId?: string;
        model: string;
        providerHost?: string;
        usage?: ByokUsage | null;
        pricing?: ByokPricing | null;
        durationMs?: number;
        ok?: boolean;
        error?: string;
        system?: string;
        prompt?: string;
        completion?: string;
        reasoning?: string;
        ts?: string;
        fxRate?: number | null;
    }): Promise<ByokLedgerRecord>;
    entries(filter?: ByokLedgerFilter): ByokLedgerRecord[];
    totals(filter?: ByokLedgerFilter): ByokLedgerTotals;
    private ensureLoaded;
}
/** A ledger that forgets everything — «не запоминать сессию». */
export declare function nullLedger(): ByokLedger;
export type ByokRunContext = {
    userId?: string;
    taskId?: string;
    sessionId?: string;
    /** Explicit per-million prices; auto-priced from the dataset when omitted. */
    pricing?: ByokPricing;
    ledger?: ByokLedger;
    fetch?: typeof globalThis.fetch;
    timeoutMs?: number;
};
/** runByokModel that records usage and cost with user/task attribution. */
export declare function runByokModelTracked(config: ByokConfig, input: string | RunByokOptions, context?: ByokRunContext): Promise<{
    text: string;
    usage: ByokUsage;
    costUsd: number | null;
    record: ByokLedgerRecord;
}>;
