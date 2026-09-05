import type { ByokApiFormat, ByokPreset } from './catalog.js';
type ModelRow = {
    id: string;
    display: string;
    vendor: string;
    inputUsd: number;
    outputUsd: number;
    inputRub: number;
    outputRub: number;
    context: number;
    reasoning: boolean;
    vision: boolean;
};
type Provider = {
    label: string;
    baseUrl: string;
    apiFormat: ByokApiFormat;
    note?: string;
};
/** Direct public BYOK endpoints; empty baseUrl means "bring your own gateway". */
export declare const BYOK_PROVIDERS: Record<string, Provider>;
export type ShowcaseOptions = {
    /** Model ids (vendor/model) in the exact order to show them. */
    ids?: string[];
    /** Limit the result; default: the compareai chart top list. */
    limit?: number;
    /** Include the compareai chart top models first (default true). */
    chartTop?: boolean;
};
/** Convert showcase rows into ready-to-use BYOK presets with ruble prices. */
export declare function buildShowcasePresets(options?: ShowcaseOptions, data?: {
    models: ModelRow[];
    chart: string[];
}): ByokPreset[];
export {};
