/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import { esc } from "#server/helpers/template-helpers";
import i18next from "i18next";
import type { SingleVoteData } from "../pages/detail.view-model";

interface Props {
  mpVotes: SingleVoteData["mpVotes"];
}

export default function KarttaFragment({ mpVotes }: Props) {
  return (
    <section id="kartta" class="mt-28" style="scroll-margin-top:14px">
      <div class="attend__grid mt-14">
        <div class="seatwrap">
          <div class="seatgrid" id="vote-seatgrid">
            {mpVotes.map((mp) => {
              const seatColor =
                mp.vote === "jaa"
                  ? "var(--hall)"
                  : mp.vote === "ei"
                    ? "var(--red)"
                    : mp.vote === "tyhjaa"
                      ? "var(--opp)"
                      : "transparent";
              return (
                <span
                  class={clsx("seat", mp.vote === "poissa" && "absent")}
                  style={`--p:${seatColor}`}
                  title={`${esc(mp.firstName)} ${esc(mp.lastName)} (${esc(mp.partyCode)})`}
                ></span>
              );
            })}
          </div>
          <div class="seat-legend">
            <div class="it">
              <span class="d" style="background:var(--hall)"></span>
              {i18next.t("common:yes")}
            </div>
            <div class="it">
              <span class="d" style="background:var(--red)"></span>
              {i18next.t("common:no")}
            </div>
            <div class="it">
              <span class="d" style="background:var(--opp)"></span>
              {i18next.t("common:empty")}
            </div>
            <div class="it">
              <span class="d ring"></span>
              {i18next.t("common:absent")}
            </div>
          </div>
        </div>
        <div class="mlookup">
          <label class="search mb-0">
            <span class="ic">⌕</span>
            <input
              id="mp-search"
              type="search"
              placeholder={i18next.t("aanestykset:detail.search_mp")}
              data-mp-search
              autocomplete="off"
            />
          </label>
          <div class="mlist" id="mp-list">
            {mpVotes.map((mp) => (
              <div
                class="mvote"
                data-search={`${mp.firstName} ${mp.lastName} ${mp.partyCode}`.toLowerCase()}
              >
                <span class="mn">
                  {esc(mp.firstName)} {esc(mp.lastName)}
                  <small>{esc(mp.partyCode)}</small>
                </span>
                <span
                  class={clsx(
                    "mb",
                    mp.vote === "jaa" && "j",
                    mp.vote === "ei" && "e",
                    mp.vote === "tyhjaa" && "tyh",
                    mp.vote === "poissa" && "out",
                  )}
                >
                  {mp.vote === "jaa"
                    ? i18next.t("common:yes_uppercase")
                    : mp.vote === "ei"
                      ? i18next.t("common:no_uppercase")
                      : mp.vote === "tyhjaa"
                        ? i18next.t("common:empty_uppercase")
                        : i18next.t("common:absent_uppercase")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
