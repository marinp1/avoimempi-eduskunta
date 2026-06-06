import { html } from "../../html";

export const ANALYTIIKKA_TITLE = "Analytiikka";

export function renderAnalytiikka(): string {
  return html`<title>Analytiikka — Eduskuntapeili</title>
<div class="wrap"><section class="page-head">
    <h1>Analytiikka</h1>
    <p class="sub">Tilastot, trendit ja data-analyysit eduskunnan toiminnasta.</p>
</section></div>`;
}
