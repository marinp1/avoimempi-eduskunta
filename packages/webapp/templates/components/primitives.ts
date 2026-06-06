import { html } from "../../html";

const esc = (s: string | number) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type KickerModifier = "red" | "blue";
export function kicker(
  text: string,
  modifier?: KickerModifier,
  dot = false,
): string {
  const cls = modifier ? ` kicker--${modifier}` : "";
  const dotHtml = dot ? `<span class="dot"></span>` : "";
  return html`<p class="kicker${cls}">${dotHtml}${esc(text)}</p>`;
}

export type RuleVariant = "ink" | "soft" | "default";
export function rule(variant: RuleVariant = "default"): string {
  if (variant === "ink") return html`<hr class="rule-ink" />`;
  if (variant === "soft") return html`<hr class="rule-soft" />`;
  return html`<hr class="rule" />`;
}

export type TagModifier = "hall" | "opp" | "ghost";
export function tag(text: string, modifier: TagModifier): string {
  return html`<span class="tag tag--${modifier}">${esc(text)}</span>`;
}

export type SpillModifier = "live" | "done" | "draft";
export function spill(text: string, modifier: SpillModifier): string {
  const dot = modifier === "live" ? `<span class="ld"></span>` : "";
  return html`<span class="spill spill--${modifier}">${dot}${esc(text)}</span>`;
}

export interface StatOptions {
  label: string;
  value: string | number;
  modifier?: "hall" | "opp";
}
export function stat({ label, value, modifier }: StatOptions): string {
  const cls = modifier ? ` ${modifier}` : "";
  return html`<div class="stat">
  <div class="stat__label">${esc(label)}</div>
  <div class="stat__value${cls}">${esc(value)}</div>
</div>`;
}

export function statRow(stats: StatOptions[]): string {
  return html`<div class="stat-row">${stats.map(stat).join("")}</div>`;
}

export function btn(
  text: string,
  opts?: { href?: string; modifier?: "ghost" },
): string {
  const cls = opts?.modifier ? ` btn--${opts.modifier}` : "";
  if (opts?.href) {
    return html`<a class="btn${cls}" href="${esc(opts.href)}">${text}</a>`;
  }
  return html`<button class="btn${cls}">${text}</button>`;
}

export function linkArrow(text: string, href?: string): string {
  if (href) {
    return html`<a class="link-arrow" href="${esc(href)}">${esc(text)}</a>`;
  }
  return html`<span class="link-arrow">${esc(text)}</span>`;
}
