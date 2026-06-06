import { html } from "../../html";

export const ISTUNNOT_TITLE = "Istunnot";

export function renderIstunnot(): string {
  return html`<title>Istunnot — Eduskuntapeili</title>
<div class="wrap"><section class="page-head">
    <h1>Istunnot</h1>
    <p class="sub">Täysistunnot, esityslista, puheenvuorot ja äänestykset.</p>
</section></div>`;
}
