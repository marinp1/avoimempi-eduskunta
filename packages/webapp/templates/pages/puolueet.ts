import { html } from "../../html";

export const PUOLUEET_TITLE = "Puolueet";

export function renderPuolueet(): string {
  return html`<title>Puolueet — Eduskuntapeili</title>
<section class="page-head wrap">
    <h1>Puolueet</h1>
    <p class="sub">Eduskuntapuolueet, ryhmäkoko ja äänestysyhtenäisyys.</p>
</section>`;
}
