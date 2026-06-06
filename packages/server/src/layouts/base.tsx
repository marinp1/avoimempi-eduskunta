// @ts-nocheck
/** @jsxImportSource ../jsx */
import i18next from "i18next";
import Banner from "./banner";
import Footer from "./footer";
import Masthead from "./masthead";
import Timeline from "./timeline";
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
    "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800;900&family=Hanken+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

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
