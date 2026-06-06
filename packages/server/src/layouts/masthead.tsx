/** @jsxImportSource ../../src/jsx */
import i18next from "i18next";
import Nav from "./nav";
import PeriodSelector from "./period-selector";
import Rule from "../components/rule";
import type { PeriodSelectorData } from "../helpers/period-selector-data";

interface Props {
  /** Today's date formatted in Finnish locale. */
  finnishDate: string;
  /** Current navigation path for active-link highlighting. */
  activePath: string;
  /** When provided, renders the period selector menu with pre-checked state. */
  periodData?: PeriodSelectorData;
}

/** Page masthead — brand, date, period selector, and navigation. */
export default function Masthead({
  finnishDate,
  activePath,
  periodData,
}: Props) {
  return (
    <>
      <div class="masthead__top">
        <div>
          <div class="brand__name">{i18next.t("common:brand_name")}</div>

          <div class="brand__tag">{i18next.t("common:brand_tagline")}</div>
        </div>

        <div class="masthead__meta">
          <span class="masthead__date">{finnishDate}</span>
          {<PeriodSelector periodData={periodData} />}
        </div>
      </div>

      <Rule variant="ink" />

      <Nav activePath={activePath} />

      <Rule />
    </>
  );
}
