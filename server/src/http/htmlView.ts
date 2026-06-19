import type { Handover, HandoverItem } from '../core/types.js';

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

function item(i: HandoverItem): string {
  const tag = i.flagType ? ` [${i.flagType}]` : '';
  const reason = i.reason ? `<div class="reason">${esc(i.reason)}</div>` : '';
  return `<li><b>${esc(i.title)}</b> <span class="meta">(${i.status}/${i.classification}${tag})</span>${reason}<div class="src">src: ${i.sourceIds.join(', ')}</div></li>`;
}

function section(title: string, items: HandoverItem[]): string {
  return `<h2>${title} (${items.length})</h2><ul>${items.map(item).join('') || '<li class="meta">None.</li>'}</ul>`;
}

export function renderHandoverHtml(h: Handover): string {
  return `<!doctype html><meta charset="utf-8"><title>Handover ${esc(h.hotel)} ${esc(h.date)}</title>
<style>body{font:14px system-ui;max-width:720px;margin:2rem auto;padding:0 1rem}h1{margin:0}.meta{color:#777}.src{color:#999;font-size:12px}.reason{color:#555}li{margin:.4rem 0}</style>
<h1>Night-Shift Handover</h1><p class="meta">${esc(h.hotel)} · morning ${esc(h.date)} · ${h.meta.eventsConsidered} events${h.meta.proseNightIngested ? '' : ' · prose night not yet ingested'}</p>
${section('Critical', h.buckets.critical)}${section('Pending', h.buckets.pending)}${section('Flags', h.buckets.flags)}${section('Info', h.buckets.info)}`;
}
