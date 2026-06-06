import { html } from "../../html";

export const HOME_TITLE = "Etusivu";

export function renderHome(): string {
  return html`<title>Etusivu — Eduskuntapeili</title>
<section class="page-hero">
    <h1>Eduskuntapeili</h1>
    <p class="page-lead">Avoin näkymä Suomen eduskunnan toimintaan &mdash; edustajat, äänestykset, istunnot ja asiakirjat.</p>
</section>`;
}
