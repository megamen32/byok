// Reusable preset UI: pure renderers + an opt-in Web Component.
//
// Projects keep their own design systems; this layer only removes the
// reinvented part — preset cards, price lines and per-format form fields.
// Theming is done with CSS custom properties (see demo/index.html), so the
// component inherits whatever the host page looks like.
import type { ByokPresetPreview } from './catalog.js'

export type ByokPresetCardOptions = {
  selectedId?: string
  showContext?: boolean
  emptyHint?: string
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string)
}

/** Card grid as an HTML string; pure and framework-agnostic by design. */
export function renderPresetCards(previews: ByokPresetPreview[], options: ByokPresetCardOptions = {}): string {
  if (!previews.length) return `<p class="byok-empty">${esc(options.emptyHint ?? 'Нет доступных пресетов')}</p>`
  const cards = previews.map((preset) => {
    const context = options.showContext && preset.contextWindow
      ? `<span class="byok-card__context" title="Контекст">${(preset.contextWindow / 1000).toLocaleString('ru-RU')}K контекст</span>`
      : ''
    const note = preset.note ? `<span class="byok-card__note" title="${esc(preset.note)}">!</span>` : ''
    return `
      <button type="button" class="byok-card${options.selectedId === preset.id ? ' byok-card--selected' : ''}" data-byok-preset-id="${esc(preset.id)}" title="${esc(preset.description)}">
        <span class="byok-card__head"><b>${esc(preset.label)}</b>${note}</span>
        <span class="byok-card__model">${esc(preset.modelId || preset.description)}</span>
        <span class="byok-card__prices">${esc(preset.priceLabel)}</span>
        ${context}
      </button>`
  })
  return `<div class="byok-cards" role="listbox" aria-label="Пресеты LLM">${cards.join('')}</div>`
}

export const BYOK_PRESET_CARDS_CSS = `
.byok-cards { display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); font: inherit; }
.byok-card { display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 8px 10px; border: 1px solid var(--byok-border, #2b3554); border-radius: 10px; background: var(--byok-card-bg, transparent); color: inherit; cursor: pointer; }
.byok-card:hover { border-color: var(--byok-accent, #6d7cff); }
.byok-card--selected { border-color: var(--byok-accent, #6d7cff); background: var(--byok-selected-bg, rgba(109, 124, 255, .12)); }
.byok-card__head { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.byok-card__note { cursor: help; }
.byok-card__model { font-size: 11px; opacity: .75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.byok-card__prices { font-size: 10px; opacity: .6; }
.byok-card__context { font-size: 10px; opacity: .6; }
.byok-empty { font-size: 12px; opacity: .6; }
`

/**
 * Per-API-format form fields — the schema host UIs build their key/model
 * forms from, so every project asks for exactly the same things.
 */
export type ByokFormField = {
  name: 'base_url' | 'model_id' | 'api_key' | 'max_output_tokens' | 'reasoning_effort'
  label: string
  placeholder: string
  kind: 'text' | 'password' | 'number' | 'select'
  options?: string[]
  optional?: boolean
}

export const BYOK_FORM_FIELDS: Record<string, ByokFormField[]> = {
  'chat-completions': [
    { name: 'base_url', label: 'Base URL', placeholder: 'https://api.deepseek.com/v1', kind: 'text' },
    { name: 'model_id', label: 'Model ID', placeholder: 'deepseek-v4-pro', kind: 'text' },
    { name: 'api_key', label: 'API key', placeholder: 'sk-…', kind: 'password' },
  ],
  anthropic: [
    { name: 'base_url', label: 'Base URL', placeholder: 'https://api.minimax.io/anthropic/v1', kind: 'text' },
    { name: 'model_id', label: 'Model ID', placeholder: 'MiniMax-M3', kind: 'text' },
    { name: 'api_key', label: 'API key', placeholder: 'sk-…', kind: 'password' },
  ],
  responses: [
    { name: 'base_url', label: 'Base URL', placeholder: 'https://api.openai.com/v1', kind: 'text' },
    { name: 'model_id', label: 'Model ID', placeholder: 'gpt-5.5-pro', kind: 'text' },
    { name: 'api_key', label: 'API key', placeholder: 'sk-…', kind: 'password' },
  ],
  _advanced: [
    { name: 'max_output_tokens', label: 'Max output tokens', placeholder: '4096', kind: 'number', optional: true },
    { name: 'reasoning_effort', label: 'Reasoning effort', placeholder: 'default', kind: 'select', options: ['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'], optional: true },
  ],
}

type PickerElement = HTMLElement & {
  presets: string
  selectedId: string
  connectedCallback(): void
}

/** Registers <byok-preset-picker presets='[...]' selected-id='...'>; opt-in. */
export function defineByokPresetPicker(customElements?: CustomElementRegistry): void {
  const registry = customElements ?? (typeof customElements !== 'undefined' ? (customElements as unknown as CustomElementRegistry) : undefined)
  const target = registry ?? (typeof globalThis !== 'undefined' ? (globalThis as { customElements?: CustomElementRegistry }).customElements : undefined)
  if (!target || target.get('byok-preset-picker')) return

  class ByokPresetPicker extends (typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement)) implements PickerElement {
    static get observedAttributes() { return ['presets', 'selected-id'] }
    get presets(): string { return this.getAttribute('presets') || '[]' }
    get selectedId(): string { return this.getAttribute('selected-id') || '' }
    connectedCallback() { this.render(); this.addEventListener('click', this.onClick) }
    attributeChangedCallback() { if (this.isConnected) this.render() }
    disconnectedCallback() { this.removeEventListener('click', this.onClick) }
    private onClick = (event: MouseEvent) => {
      const card = (event.target as HTMLElement | null)?.closest?.('[data-byok-preset-id]') as HTMLElement | null
      if (!card) return
      const presetId = card.getAttribute('data-byok-preset-id') || ''
      const preview = this.currentPreviews().find((item) => item.id === presetId)
      if (!preview) return
      this.setAttribute('selected-id', presetId)
      this.dispatchEvent(new CustomEvent('byok-select', { detail: preview, bubbles: true, composed: true }))
    }
    private currentPreviews(): ByokPresetPreview[] {
      try { const parsed = JSON.parse(this.presets); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
    }
    private render() {
      this.innerHTML = `<style>${BYOK_PRESET_CARDS_CSS}</style>` + renderPresetCards(this.currentPreviews(), { selectedId: this.selectedId, showContext: true })
    }
  }
  target.define('byok-preset-picker', ByokPresetPicker as unknown as CustomElementConstructor)
}
