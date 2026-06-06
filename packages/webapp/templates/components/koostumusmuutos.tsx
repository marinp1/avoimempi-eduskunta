/** @jsxImportSource ../../src/jsx */

export interface CompositionChangeRow {
  person_id: number;
  first_name: string;
  last_name: string;
  party: string | null;
  change_type: string;
  description: string | null;
  replacement_person: string | null;
}

interface Props {
  date: string;
  rows: CompositionChangeRow[];
}

function partyShort(p: string | null): string {
  return p ?? "";
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

export default function Koostumusmuutos({ date, rows }: Props) {
  const joined = rows.filter((r) => r.change_type === "join");
  const left = rows.filter((r) => r.change_type === "leave");

  if (rows.length === 0) {
    return (
      <div
        id="comp-detail"
        class="comp-detail wrap"
        hx-get="/koostumusmuutos"
        hx-trigger="tl:ready from:document, tl:commit from:document"
        hx-include="#tl-date-input"
        hx-swap="outerHTML"
        hx-indicator="#comp-detail"
      >
        <div class="htmx-indicator loading-spinner">Ladataan…</div>
        <div class="comp-detail__head">
          <span class="comp-detail__kicker">Kokoonpanomuutokset</span>
          <span class="comp-detail__date">{date ? formatDate(date) : ""}</span>
          <span class="comp-detail__summary comp-detail__summary--empty">
            Ei muutoksia tänä päivänä
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="comp-detail"
      class="comp-detail wrap"
      hx-get="/koostumusmuutos"
      hx-trigger="tl:ready from:document, tl:commit from:document"
      hx-include="#tl-date-input"
      hx-swap="outerHTML"
      hx-indicator="#comp-detail"
    >
      <div class="htmx-indicator loading-spinner">Ladataan…</div>
      <div class="comp-detail__head">
        <span class="comp-detail__kicker">Kokoonpanomuutokset</span>
        <span class="comp-detail__date">{formatDate(date)}</span>
        <span class="comp-detail__summary">
          {joined.length > 0 && `${joined.length} liittyi`}
          {joined.length > 0 && left.length > 0 && ", "}
          {left.length > 0 && `${left.length} jätti`}
        </span>
      </div>

      {joined.length > 0 && (
        <div class="comp-detail__group">
          <h3 class="comp-detail__grouptitle">Saapuneet edustajat</h3>
          <ul class="comp-detail__list">
            {joined.map((r) => (
              <li class="comp-detail__item">
                <a href={`/edustaja/${r.person_id}`} class="comp-detail__name">
                  {r.last_name}, {r.first_name}
                </a>
                <span class="comp-detail__party">{partyShort(r.party)}</span>
                {r.replacement_person && (
                  <span class="comp-detail__repl">
                    → korvasi {r.replacement_person}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {left.length > 0 && (
        <div class="comp-detail__group">
          <h3 class="comp-detail__grouptitle">Lähteneet edustajat</h3>
          <ul class="comp-detail__list">
            {left.map((r) => (
              <li class="comp-detail__item">
                <a href={`/edustaja/${r.person_id}`} class="comp-detail__name">
                  {r.last_name}, {r.first_name}
                </a>
                <span class="comp-detail__party">{partyShort(r.party)}</span>
                {r.replacement_person && (
                  <span class="comp-detail__repl">
                    → korvattiin: {r.replacement_person}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
