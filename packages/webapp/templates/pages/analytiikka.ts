import { html } from "../../html";

export const ANALYTIIKKA_TITLE = "Analytiikka";

export function renderAnalytiikka(): string {
  return html`<title>Analytiikka — Eduskuntapeili</title>
<section class="page-hero">
    <h1>Analytiikka</h1>
    <p class="page-lead">Tilastot, trendit ja data-analyysit eduskunnan toiminnasta.</p>
</section>`;
}
