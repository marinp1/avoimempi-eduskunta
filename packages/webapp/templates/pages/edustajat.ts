import { html } from "../../html";

export const EDUSTAJAT_TITLE = "Edustajat";

export function renderEdustajat(): string {
  return html`<title>Edustajat — Eduskuntapeili</title>
<section class="page-head wrap">
    <h1>Edustajat</h1>
    <p class="sub">Kansanedustajien tiedot, toimikaudet ja äänestyshistoria.</p>
</section>`;
}
