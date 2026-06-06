import { html } from "../../html";

export const PUOLUEET_TITLE = "Puolueet";

export function renderPuolueet(): string {
  return html`<title>Puolueet — Eduskuntapeili</title>
<section class="page-hero">
    <h1>Puolueet</h1>
    <p class="page-lead">Eduskuntapuolueet, ryhmäkoko ja äänestysyhtenäisyys.</p>
</section>`;
}
