export type ByokApiFormat = 'anthropic' | 'chat-completions' | 'responses';
export type ByokPreset = {
    id: string;
    label: string;
    description: string;
    apiFormat: ByokApiFormat;
    baseUrl: string;
    modelId: string;
    contextWindow: number | null;
    maxInputTokens: number | null;
    maxOutputTokens: number | null;
    inputPricePerMillionUsd: number | null;
    cacheReadPricePerMillionUsd: number | null;
    cacheWritePricePerMillionUsd: number | null;
    outputPricePerMillionUsd: number | null;
    inputTypes: string[];
    outputTypes: string[];
    note?: string;
    catalogProviderId?: string;
    catalogModelId?: string;
};
export type ByokCatalogResponse = {
    presets: ByokPreset[];
    source: 'models.dev' | 'bundled-fallback' | 'fallback';
    sourceUrl: string;
    fetchedAt: string;
    degraded?: boolean;
};
export declare const MODELS_DEV_URL = "https://models.dev/api.json";
export declare const fallbackByokPresets: ByokPreset[];
export declare function buildByokPresetsFromModelsDev(payload: unknown): ByokPreset[];
export declare function estimateCostUsd(inputTokens: number, outputTokens: number, preset: Pick<ByokPreset, 'inputPricePerMillionUsd' | 'outputPricePerMillionUsd'>): number | null;
export declare function calculateUsageCostUsd(usage: {
    inputTokens: number | null;
    noCacheInputTokens?: number | null;
    cacheReadTokens?: number | null;
    cacheWriteTokens?: number | null;
    outputTokens: number | null;
}, prices: Pick<ByokPreset, 'inputPricePerMillionUsd' | 'cacheReadPricePerMillionUsd' | 'cacheWritePricePerMillionUsd' | 'outputPricePerMillionUsd'>): number | null;
export declare function calculateAvailableInputTokens(values: {
    contextWindow: number | null;
    maxInputTokens: number | null;
    requestedOutputTokens: number;
}): number | null;
export type ByokPresetPreview = {
    id: string;
    label: string;
    description: string;
    apiFormat: ByokApiFormat;
    baseUrl: string;
    modelId: string;
    contextWindow: number | null;
    inputPricePerMillionUsd: number | null;
    cacheReadPricePerMillionUsd: number | null;
    outputPricePerMillionUsd: number | null;
    priceLabel: string;
    note?: string;
};
/** Project presets into compact UI cards with a human price line. */
export declare function previewByokPresets(presets: ByokPreset[]): ByokPresetPreview[];
/** Fetch the models.dev catalog (cached) and fall back to bundled presets. */
export declare function fetchByokCatalogResponse(ttlMs?: number, fetcher?: (url: string) => Promise<unknown>): Promise<ByokCatalogResponse>;
