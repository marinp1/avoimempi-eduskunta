import { html } from "../../html";

export const HOME_TITLE = "Etusivu";

export function renderHome(): string {
  return html`<title>Etusivu — Eduskuntapeili</title>
<section class="lead wrap">
    <p class="kicker kicker--red"><span class="dot"></span>Eduskunta juuri nyt</p>
    <h1>Avoin näkymä Suomen parlamentin toimintaan</h1>
    <div class="lead__meta">
        <span>Edustajat · äänestykset · istunnot · asiakirjat</span>
    </div>
</section>`;
}
