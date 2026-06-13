// @ts-nocheck
/** @jsxImportSource ../jsx */
import i18next from "i18next";
import Banner from "./banner";
import Footer from "./footer";
import Masthead from "./masthead";
import Timeline from "./timeline";
import AboutPanel from "../components/about-panel";
import type { LayoutOptions } from "../eta";

/** Options passed to the root HTML layout template. Extends the public
 *  {@link LayoutOptions} with fields needed for full-page rendering. */
export interface LayoutProps extends LayoutOptions {
  /** Pre-rendered page content fragment inserted into `<main>`. */
  content: string;
  /** Today's date formatted in Finnish locale, shown in the masthead. */
  finnishDate: string;
}

/** Root HTML document shell: `<head>`, masthead, `<main>`, and footer. */
export default function Layout({
  content,
  activePath,
  title,
  assetVersion,
  finnishDate,
  timelineData,
  periodData,
}: LayoutProps) {
  const v = assetVersion ? `?v=${assetVersion}` : "";
  const brandName = i18next.t("common:brand_name");
  const pageTitle = title ? `${title} — ${brandName}` : brandName;
  const fontsHref =
    "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800;900&family=Hanken+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Mr+Dafoe&display=swap";

  return (
    "<!DOCTYPE html>" +
    (
      <html lang="fi">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>{pageTitle}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
          <link href={fontsHref} rel="stylesheet" />
          <link rel="stylesheet" href={`/webapp/styles.css${v}`} />
          <script src={`/webapp/setup.js${v}`} defer></script>
        </head>
        <body>
          <AboutPanel
            barLabel={i18next.t("components:about.bar_label")}
            closeAria={i18next.t("components:about.close_aria")}
            kicker={i18next.t("components:about.kicker")}
            title={i18next.t("components:about.title")}
            writerName={i18next.t("components:about.writer_name")}
            writerRole={i18next.t("components:about.writer_role")}
            writerDate={i18next.t("components:about.writer_date")}
            bodyParagraphs={[
              i18next.t("components:about.body_p1"),
              i18next.t("components:about.body_p2"),
              i18next.t("components:about.body_p3"),
            ]}
            signature={i18next.t("components:about.signature")}
            signatureMetaHtml={i18next.t(
              "components:about.signature_meta_html",
            )}
            colophonSourceLabel={i18next.t(
              "components:about.colophon_source_label",
            )}
            colophonLinkUrl={i18next.t("components:about.colophon_link_url")}
            colophonLinkText={i18next.t("components:about.colophon_link_text")}
            colophonIndependent={i18next.t(
              "components:about.colophon_independent",
            )}
          />
          <div class="about-scrim" data-about-scrim hidden></div>
          <button
            type="button"
            class="trace-fab"
            data-trace-open
            hx-get="/api/trace"
            hx-target="#trace-overlay-root"
            hx-swap="innerHTML transition:false"
            aria-label={i18next.t("components:trace.button")}
            title={i18next.t("components:trace.button")}
          >
            <span class="dot"></span>
            <span class="trace-fab__label">
              {i18next.t("components:trace.button")}
            </span>
          </button>
          <div id="trace-overlay-root"></div>
          <Banner />
          <div class="wrap">
            <header class="masthead">
              <Masthead
                finnishDate={finnishDate}
                activePath={activePath}
                periodData={periodData}
              />
            </header>
            {timelineData && (
              <>
                <Timeline data={timelineData} />
                <hr class="rule" />
              </>
            )}
          </div>
          <main id="main-content">{content}</main>
          <div class="wrap">
            <Footer />
          </div>
        </body>
      </html>
    )
  );
}
