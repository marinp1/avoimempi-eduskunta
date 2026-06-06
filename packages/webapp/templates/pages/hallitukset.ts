import { html } from "../../html";

export const HALLITUKSET_TITLE = "Hallitukset";

export function renderHallitukset(): string {
  return html`<title>Hallitukset — Eduskuntapeili</title>
<div class="wrap"><section class="page-head">
    <h1>Hallitukset</h1>
    <p class="sub">Hallituskaudet, ministerit ja hallitusohjelmien toteutuminen.</p>
</section></div>`;
}
