/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import Kicker from "#server/components/kicker";
import i18next from "i18next";
import type { SingleVoteData } from "../pages/detail.view-model";

interface Props {
  mpVotes: SingleVoteData["mpVotes"];
}

export default function VotingMapFragment({ mpVotes }: Props) {
  const nYes = mpVotes.filter((m) => m.vote === "jaa").length;
  const nNo = mpVotes.filter((m) => m.vote === "ei").length;
  const nEmpty = mpVotes.filter((m) => m.vote === "tyhjaa").length;
  const nAbsent = mpVotes.filter((m) => m.vote === "poissa").length;
  const nUnknown = mpVotes.filter((m) => m.vote === "tuntematon").length;

  return (
    <section id="kartta" class="ph mt-28" style="scroll-margin-top:14px">
      <Kicker text={i18next.t("votings:detail.section_map_kicker")} dot />
      <div class="ph__head">
        <h2>{i18next.t("votings:detail.section_map_title")}</h2>
        <span class="meta">{mpVotes.length} edustajaa · ryhmittäin</span>
      </div>
      <p class="ph__intro">{i18next.t("votings:detail.section_map_intro")}</p>
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
                      : mp.vote === "tuntematon"
                        ? "var(--faint)"
                        : "transparent";
              return (
                <span
                  class={clsx(
                    "seat",
                    mp.vote === "poissa" && "absent",
                    mp.vote === "tuntematon" && "unknown-vote",
                  )}
                  style={`--p:${seatColor}`}
                  title={`${mp.firstName} ${mp.lastName} (${mp.partyCode}) — ${mp.vote === "jaa" ? "Jaa" : mp.vote === "ei" ? "Ei" : mp.vote === "tyhjaa" ? "Tyhjää" : mp.vote === "poissa" ? "Poissa" : "Tuntematon"}`}
                ></span>
              );
            })}
          </div>
          <div class="seat-legend">
            <div class="it">
              <span class="d" style="background:var(--hall)"></span>
              {i18next.t("common:yes")} {nYes}
            </div>
            <div class="it">
              <span class="d" style="background:var(--red)"></span>
              {i18next.t("common:no")} {nNo}
            </div>
            {nEmpty > 0 && (
              <div class="it">
                <span class="d" style="background:var(--opp)"></span>
                {i18next.t("common:empty")} {nEmpty}
              </div>
            )}
            <div class="it">
              <span class="d ring"></span>
              {i18next.t("common:absent")} {nAbsent}
            </div>
            {nUnknown > 0 && (
              <div
                class="it"
                title="Ääniarvo ei vastaa tunnettuja arvoja — datalaatuvirheen merkki"
              >
                <span class="d unknown-vote-swatch"></span>
                Tuntematon {nUnknown}
              </div>
            )}
          </div>
        </div>
        <div class="mlookup">
          <label class="search mb-0">
            <span class="ic">⌕</span>
            <input
              id="mp-search"
              type="search"
              placeholder={i18next.t("votings:detail.search_mp")}
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
                  {mp.firstName} {mp.lastName}
                  <small>{mp.partyCode}</small>
                </span>
                <span
                  class={clsx(
                    "mb",
                    mp.vote === "jaa" && "j",
                    mp.vote === "ei" && "e",
                    mp.vote === "tyhjaa" && "tyh",
                    mp.vote === "poissa" && "out",
                    mp.vote === "tuntematon" && "unk",
                  )}
                >
                  {mp.vote === "jaa"
                    ? i18next.t("common:yes_uppercase")
                    : mp.vote === "ei"
                      ? i18next.t("common:no_uppercase")
                      : mp.vote === "tyhjaa"
                        ? i18next.t("common:empty_uppercase")
                        : mp.vote === "tuntematon"
                          ? "?"
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
