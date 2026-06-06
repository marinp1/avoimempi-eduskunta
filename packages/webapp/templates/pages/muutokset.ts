import { html } from "../../html";

export const MUUTOKSET_TITLE = "Muutokset";

export function renderMuutokset(): string {
  return html`<title>Muutokset — Eduskuntapeili</title>
<section class="page-head wrap">
    <h1>Muutokset</h1>
    <p class="sub">Tietokantaan tuodut päivitykset ja muutosloki.</p>
</section>`;
}
