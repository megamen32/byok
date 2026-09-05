// Run trajectory view: one table any host can drop in to show BYOK runs
// (model, task, tokens, cost) plus totals — the wallet's favourite screen.
import type { ByokLedgerRecord, ByokLedgerTotals } from './ledger.js'

function esc(value: string): string {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string)
}

const money = (usd: number | null) => usd == null ? '—' : `$${usd < 0.01 && usd > 0 ? usd.toFixed(4) : usd.toFixed(2)}`
const tokens = (value: number | null) => value == null ? '—' : value.toLocaleString('ru-RU')

export function renderRunsTable(runs: ByokLedgerRecord[], totals?: ByokLedgerTotals, options: { emptyHint?: string } = {}): string {
  if (!runs.length) return `<p class="byok-empty">${esc(options.emptyHint ?? 'Прогонов пока нет')}</p>`
  const head = totals
    ? `<div class="byok-runs__totals">
        <span>${totals.calls} прогонов</span>
        <span>${tokens(totals.inputTokens)} in / ${tokens(totals.outputTokens)} out</span>
        <span>${money(totals.costUsd)}${totals.costUsdKnown ? '' : ' (часть без цен)'}</span>
      </div>`
    : ''
  const rows = runs.map((run) => `
    <tr class="${run.ok ? '' : 'byok-runs__row--error'}" title="${esc(run.error || run.promptPreview || '')}">
      <td class="byok-runs__ts">${esc(run.ts.slice(5, 16).replace('T', ' '))}</td>
      <td class="byok-runs__model">${esc(run.model)}</td>
      <td class="byok-runs__task">${esc(run.taskId || run.userId || '—')}</td>
      <td class="byok-runs__num">${tokens(run.inputTokens)}</td>
      <td class="byok-runs__num">${tokens(run.outputTokens)}</td>
      <td class="byok-runs__num">${money(run.costUsd)}</td>
      <td class="byok-runs__num">${(run.durationMs / 1000).toFixed(1)}s</td>
    </tr>`).join('')
  return `
    <div class="byok-runs">
      ${head}
      <table class="byok-runs__table">
        <thead><tr><th>когда</th><th>модель</th><th>задача</th><th>in</th><th>out</th><th>$</th><th>t</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

export const BYOK_RUNS_CSS = `
.byok-runs { font: inherit; color: inherit; }
.byok-runs__totals { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; opacity: .85; padding: 6px 0; }
.byok-runs__table { width: 100%; border-collapse: collapse; font-size: 12px; }
.byok-runs__table th { text-align: left; font-weight: 600; opacity: .6; padding: 4px 8px 4px 0; border-bottom: 1px solid var(--byok-border, #2b3554); }
.byok-runs__table td { padding: 4px 8px 4px 0; border-bottom: 1px solid color-mix(in srgb, var(--byok-border, #2b3554) 50%, transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }
.byok-runs__row--error td { color: var(--byok-error, #ff6b6b); }
.byok-runs__ts, .byok-runs__num { opacity: .75; font-variant-numeric: tabular-nums; }
.byok-empty { font-size: 12px; opacity: .6; }
`

type RunsElement = HTMLElement & { runs: string; totals: string }

/** Registers <byok-runs-view runs='[...]' totals='{...}'>; opt-in. */
export function defineByokRunsView(customElements?: CustomElementRegistry): void {
  const target = customElements ?? (typeof globalThis !== 'undefined' ? (globalThis as { customElements?: CustomElementRegistry }).customElements : undefined)
  if (!target || target.get('byok-runs-view')) return

  class ByokRunsView extends (typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement)) implements RunsElement {
    static get observedAttributes() { return ['runs', 'totals'] }
    get runs(): string { return this.getAttribute('runs') || '[]' }
    get totals(): string { return this.getAttribute('totals') || '' }
    connectedCallback() { this.render() }
    attributeChangedCallback() { if (this.isConnected) this.render() }
    private render() {
      let parsedRuns: ByokLedgerRecord[] = []
      let parsedTotals: ByokLedgerTotals | undefined
      try { const value = JSON.parse(this.runs); if (Array.isArray(value)) parsedRuns = value } catch { /* empty */ }
      try { const value = JSON.parse(this.totals); if (value && typeof value === 'object') parsedTotals = value } catch { /* empty */ }
      this.innerHTML = `<style>${BYOK_RUNS_CSS}</style>` + renderRunsTable(parsedRuns, parsedTotals)
    }
  }
  target.define('byok-runs-view', ByokRunsView as unknown as CustomElementConstructor)
}
