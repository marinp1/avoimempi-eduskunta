import { html } from "../../html";

export const ASIAKIRJAT_TITLE = "Asiakirjat";

export function renderAsiakirjat(): string {
  return html`<title>Asiakirjat — Eduskuntapeili</title>
<section class="page-hero">
    <h1>Asiakirjat</h1>
    <p class="page-lead">Hallituksen esitykset, lakialoitteet, kirjalliset kysymykset ja lausunnot.</p>
</section>`;
}
