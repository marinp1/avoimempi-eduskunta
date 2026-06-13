/** @jsxImportSource ../../../jsx */
import i18next from "i18next";
import PageHead from "#server/components/page-head";
import QualityStatusFragment from "../fragments/status.fragment";
import type { QualityViewModel } from "./quality.view-model";

export default function QualityPage({ vm }: { vm: QualityViewModel }) {
  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: i18next.t("quality:title"),
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <PageHead
          kicker={i18next.t("quality:kicker")}
          heading={i18next.t("quality:heading")}
          subtitle={i18next.t("quality:subtitle")}
        />
        <QualityStatusFragment vm={vm} />
      </div>
    </>
  );
}
