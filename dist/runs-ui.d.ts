import type { ByokLedgerRecord, ByokLedgerTotals } from './ledger.js';
export declare function renderRunsTable(runs: ByokLedgerRecord[], totals?: ByokLedgerTotals, options?: {
    emptyHint?: string;
}): string;
export declare const BYOK_RUNS_CSS = "\n.byok-runs { font: inherit; color: inherit; }\n.byok-runs__totals { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; opacity: .85; padding: 6px 0; }\n.byok-runs__table { width: 100%; border-collapse: collapse; font-size: 12px; }\n.byok-runs__table th { text-align: left; font-weight: 600; opacity: .6; padding: 4px 8px 4px 0; border-bottom: 1px solid var(--byok-border, #2b3554); }\n.byok-runs__table td { padding: 4px 8px 4px 0; border-bottom: 1px solid color-mix(in srgb, var(--byok-border, #2b3554) 50%, transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }\n.byok-runs__row--error td { color: var(--byok-error, #ff6b6b); }\n.byok-runs__ts, .byok-runs__num { opacity: .75; font-variant-numeric: tabular-nums; }\n.byok-empty { font-size: 12px; opacity: .6; }\n";
/** Registers <byok-runs-view runs='[...]' totals='{...}'>; opt-in. */
export declare function defineByokRunsView(customElements?: CustomElementRegistry): void;
