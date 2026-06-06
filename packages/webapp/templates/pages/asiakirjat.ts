import { html } from "../../html";

export const ASIAKIRJAT_TITLE = "Asiakirjat";

export function renderAsiakirjat(): string {
  return html`<title>Asiakirjat — Eduskuntapeili</title>
<section class="page-head wrap">
    <h1>Asiakirjat</h1>
    <p class="sub">Hallituksen esitykset, lakialoitteet, kirjalliset kysymykset ja lausunnot.</p>
</section>`;
}
