import { html } from "../../html";

export const MUUTOKSET_TITLE = "Muutokset";

export function renderMuutokset(): string {
  return html`<title>Muutokset — Eduskuntapeili</title>
<section class="page-hero">
    <h1>Muutokset</h1>
    <p class="page-lead">Tietokantaan tuodut päivitykset ja muutosloki.</p>
</section>`;
}
