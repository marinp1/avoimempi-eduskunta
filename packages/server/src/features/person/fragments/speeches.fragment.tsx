/** @jsxImportSource ../../../jsx */
import Kicker from "#server/components/kicker";
import { sourceNote } from "#server/components/provenance";
import { esc, formatDate } from "#server/helpers/template-helpers";
import i18next from "i18next";
import type { PersonSpeechesData } from "../pages/profile.view-model";

interface Props {
  data: PersonSpeechesData;
}

export default function SpeechesFragment({ data }: Props) {
  if (data.speeches.length === 0) return <></>;

  return (
    <div class="rail__item">
      <Kicker text={i18next.t("persons:profile.recent_speeches_kicker")} />
      <p class="psec__desc psec__desc--tight">
        {i18next.t("persons:profile.recent_speeches_subtitle")}
      </p>
      {data.speeches.map((sp) => (
        <div class="spoke-row">
          <div class="st">{esc(sp.sectionTitle ?? "")}</div>
          <div class="sd">
            {sp.startTime
              ? `${formatDate(sp.startTime)}${sp.speechType ? ` · ${esc(sp.speechType)}` : ""}`
              : sp.speechType
                ? esc(sp.speechType)
                : ""}
          </div>
        </div>
      ))}
      {sourceNote({
        dataset: `Speech · ${data.personName}`,
        fetchedAt: data.fetchedAt,
      })}
    </div>
  );
}
