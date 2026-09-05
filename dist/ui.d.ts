import type { ByokPresetPreview } from './catalog.js';
export type ByokPresetCardOptions = {
    selectedId?: string;
    showContext?: boolean;
    emptyHint?: string;
};
/** Card grid as an HTML string; pure and framework-agnostic by design. */
export declare function renderPresetCards(previews: ByokPresetPreview[], options?: ByokPresetCardOptions): string;
export declare const BYOK_PRESET_CARDS_CSS = "\n.byok-cards { display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); font: inherit; }\n.byok-card { display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 8px 10px; border: 1px solid var(--byok-border, #2b3554); border-radius: 10px; background: var(--byok-card-bg, transparent); color: inherit; cursor: pointer; }\n.byok-card:hover { border-color: var(--byok-accent, #6d7cff); }\n.byok-card--selected { border-color: var(--byok-accent, #6d7cff); background: var(--byok-selected-bg, rgba(109, 124, 255, .12)); }\n.byok-card__head { display: flex; align-items: center; gap: 6px; font-size: 13px; }\n.byok-card__note { cursor: help; }\n.byok-card__model { font-size: 11px; opacity: .75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n.byok-card__prices { font-size: 10px; opacity: .6; }\n.byok-card__context { font-size: 10px; opacity: .6; }\n.byok-empty { font-size: 12px; opacity: .6; }\n";
/**
 * Per-API-format form fields — the schema host UIs build their key/model
 * forms from, so every project asks for exactly the same things.
 */
export type ByokFormField = {
    name: 'base_url' | 'model_id' | 'api_key' | 'max_output_tokens' | 'reasoning_effort';
    label: string;
    placeholder: string;
    kind: 'text' | 'password' | 'number' | 'select';
    options?: string[];
    optional?: boolean;
};
export declare const BYOK_FORM_FIELDS: Record<string, ByokFormField[]>;
/** Registers <byok-preset-picker presets='[...]' selected-id='...'>; opt-in. */
export declare function defineByokPresetPicker(customElements?: CustomElementRegistry): void;
