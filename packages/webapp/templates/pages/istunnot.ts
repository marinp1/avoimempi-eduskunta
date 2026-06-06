import { html } from "../../html";

export const ISTUNNOT_TITLE = "Istunnot";

export function renderIstunnot(): string {
  return html`<title>Istunnot — Eduskuntapeili</title>
<section class="page-hero">
    <h1>Istunnot</h1>
    <p class="page-lead">Täysistunnot, esityslista, puheenvuorot ja äänestykset.</p>
</section>`;
}
