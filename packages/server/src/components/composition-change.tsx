/** @jsxImportSource ../../src/jsx */
import i18next from "i18next";
import { formatDate } from "#server/helpers/template-helpers";
import { partyShortName } from "#server/domain";

export interface PersonChangeRow {
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
  rows: PersonChangeRow[];
}

function partyShort(p: string | null): string {
  return p ? partyShortName(p, p) : "";
}

export default function CompositionChange({ date, rows }: Props) {
  const joined = rows.filter((r) => r.change_type === "join");
  const left = rows.filter((r) => r.change_type === "leave");

  if (rows.length === 0) {
    return (
      <div
        id="comp-detail"
        class="comp-detail wrap"
        hx-get="/koostumusmuutos"
        hx-trigger="tl:ready from:document, tl:commit from:document"
        hx-include="#tl-date-input, #tl-period-input"
        hx-swap="outerHTML"
        hx-indicator="#comp-detail"
      >
        <div class="htmx-indicator loading-spinner">
          {i18next.t("common:loading")}
        </div>
        <div class="comp-detail__head">
          <span class="comp-detail__kicker">
            {i18next.t("components:composition.kicker")}
          </span>
          <span class="comp-detail__date">{date ? formatDate(date) : ""}</span>
          <span class="comp-detail__summary comp-detail__summary--empty">
            {i18next.t("components:composition.empty")}
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
      hx-include="#tl-date-input, #tl-period-input"
      hx-swap="outerHTML"
      hx-indicator="#comp-detail"
    >
      <div class="htmx-indicator loading-spinner">
        {i18next.t("common:loading")}
      </div>
      <div class="comp-detail__head">
        <span class="comp-detail__kicker">
          {i18next.t("components:composition.kicker")}
        </span>
        <span class="comp-detail__date">{formatDate(date)}</span>
        <span class="comp-detail__summary">
          {joined.length > 0 &&
            i18next.t("components:composition.joined_count", {
              count: joined.length,
            })}
          {joined.length > 0 && left.length > 0 && ", "}
          {left.length > 0 &&
            i18next.t("components:composition.left_count", {
              count: left.length,
            })}
        </span>
      </div>

      {joined.length > 0 && (
        <div class="comp-detail__group">
          <h3 class="comp-detail__grouptitle">
            {i18next.t("components:composition.joined_label")}
          </h3>
          <ul class="comp-detail__list">
            {joined.map((r) => (
              <li class="comp-detail__item">
                <a href={`/edustaja/${r.person_id}`} class="comp-detail__name">
                  {r.last_name}, {r.first_name}
                </a>
                <span class="comp-detail__party">{partyShort(r.party)}</span>
                {r.replacement_person && (
                  <span class="comp-detail__repl">
                    →{" "}
                    {i18next.t("components:composition.replaced", {
                      name: r.replacement_person,
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {left.length > 0 && (
        <div class="comp-detail__group">
          <h3 class="comp-detail__grouptitle">
            {i18next.t("components:composition.left_label")}
          </h3>
          <ul class="comp-detail__list">
            {left.map((r) => (
              <li class="comp-detail__item">
                <a href={`/edustaja/${r.person_id}`} class="comp-detail__name">
                  {r.last_name}, {r.first_name}
                </a>
                <span class="comp-detail__party">{partyShort(r.party)}</span>
                {r.replacement_person && (
                  <span class="comp-detail__repl">
                    →{" "}
                    {i18next.t("components:composition.replaced_by", {
                      name: r.replacement_person,
                    })}
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
