import { html } from "../../html";

export const AANESTYKSET_TITLE = "Äänestykset";

export function renderAanestykset(): string {
  return html`<title>Äänestykset — Eduskuntapeili</title>
<section class="page-head wrap">
    <h1>Äänestykset</h1>
    <p class="sub">Täysistuntojen äänestystulokset ja edustajien äänestyskäyttäytyminen.</p>
</section>`;
}
