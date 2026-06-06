/** @jsxImportSource ../../src/jsx */
import Nav from "./nav";
import PeriodSelector from "./period-selector";

interface Props {
  /** Today's date formatted in Finnish locale. */
  finnishDate: string;
  /** Current navigation path for active-link highlighting. */
  activePath: string;
}

/** Page masthead — brand, date, period selector, and navigation. */
export default function Masthead({ finnishDate, activePath }: Props) {
  return (
    <>
      <div class="masthead__top">
        <div>
          <div class="brand__name">Eduskuntapeili</div>

          <div class="brand__tag">
            Eduskunnan avoin data, luettavassa muodossa
          </div>
        </div>

        <div class="masthead__meta">
          <span class="masthead__date">{finnishDate}</span>
          {<PeriodSelector />}
        </div>
      </div>

      <hr class="rule-ink" />

      <Nav activePath={activePath} />

      <hr class="rule" />
    </>
  );
}
