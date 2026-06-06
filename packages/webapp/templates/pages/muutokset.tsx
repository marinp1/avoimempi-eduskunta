/** @jsxImportSource ../../src/jsx */
import i18next from "i18next";
import Kicker from "../components/kicker";

interface Props {
  /** Page `<title>` suffix. */
  title?: string;
}

/** Changelog / updates page (placeholder — not yet implemented). */
export default function Muutokset({ title }: Props) {
  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: title || "",
          brand: i18next.t("common:brand_name"),
        })}
      </title>
      <section class="page-head wrap">
        <Kicker text={i18next.t("nav:changes")} />
        <h1>{i18next.t("nav:changes")}</h1>
        <p class="sub">{i18next.t("errors:muutokset.body")}</p>
      </section>
    </>
  );
}
