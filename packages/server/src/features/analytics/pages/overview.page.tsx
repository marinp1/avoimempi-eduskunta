/** @jsxImportSource ../../../jsx */
import i18next from "i18next";
import PageHead from "#server/components/page-head";

interface Props {
  /** Page `<title>` suffix. */
  title?: string;
}

/** Analytics page (placeholder — not yet implemented). */
export default function Analytiikka({ title }: Props) {
  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: title || "",
          brand: i18next.t("common:brand_name"),
        })}
      </title>
      <div class="wrap">
        <PageHead
          kicker={i18next.t("nav:analytics")}
          heading={i18next.t("nav:analytics")}
          subtitle={i18next.t("errors:analytiikka.body")}
        />
      </div>
    </>
  );
}
