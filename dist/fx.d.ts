export declare const CBR_DAILY_URL = "https://www.cbr-xml-daily.ru/daily_json.js";
export type ByokFxRate = {
    usdRub: number;
    fetchedAt: string;
    source: 'cbr' | 'cache' | 'fallback';
};
type FxCache = ByokFxRate & {
    stale?: boolean;
};
export declare function readFxCache(file?: string): FxCache | null;
export declare function usdRubRate(options?: {
    file?: string;
    ttlMs?: number;
    fetcher?: (url: string) => Promise<unknown>;
}): Promise<ByokFxRate>;
export declare function usdToRub(costUsd: number | null, rate: number | null): number | null;
/** Test hook: drop the in-memory rate cache. */
export declare function resetFxCache(): void;
export {};
