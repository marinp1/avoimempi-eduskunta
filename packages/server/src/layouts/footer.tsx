/** @jsxImportSource ../../src/jsx */
import i18next from "i18next";

/** Page footer — period info, legal text, and data source attribution. */
export default function Footer() {
  return (
    <footer class="foot">
      <div class="foot__period">
        <span class="pk">{i18next.t("components:footer.period_label")}</span>
        <span class="pv" data-period-label></span>
        <span class="pbadge" data-period-badge-foot></span>
        <span class="pdetail" data-period-detail></span>
      </div>
      <div id="js-ai-status" class="foot__ai" hidden></div>
      <div class="foot__legal">
        <span>
          {i18next.t("components:footer.brand_tag")} ·{" "}
          <a
            href="https://avoindata.eduskunta.fi/"
            target="_blank"
            rel="noopener"
          >
            avoindata.eduskunta.fi
          </a>
        </span>
        <span>{i18next.t("components:footer.not_official_cc")}</span>
      </div>
    </footer>
  );
}
