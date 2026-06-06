/** @jsxImportSource ../src/jsx */
import Footer from "./partials/footer";
import Masthead from "./partials/masthead";
import { timeline, type TimelineData } from "./partials/timeline";

/** Options passed to the root HTML layout template. */
export interface LayoutOptions {
  /** Pre-rendered page content fragment inserted into `<main>`. */
  content: string;
  /** Current navigation path for active-link highlighting. */
  activePath: string;
  /** Page title shown in the browser tab. */
  title?: string;
  /** Version string appended to asset URLs for cache busting. */
  assetVersion?: string;
  /** Today's date formatted in Finnish locale, shown in the masthead. */
  finnishDate: string;
  /** When provided, renders the time scrubber after the masthead. */
  timelineData?: TimelineData;
}

/** Root HTML document shell: `<head>`, masthead, `<main>`, and footer. */
export default function Layout({
  content,
  activePath,
  title,
  assetVersion,
  finnishDate,
  timelineData,
}: LayoutOptions) {
  const v = assetVersion ? `?v=${assetVersion}` : "";
  const pageTitle = title ? `${title} — Eduskuntapeili` : "Eduskuntapeili";
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
          <div class="wrap">
            <header class="masthead">
              <Masthead finnishDate={finnishDate} activePath={activePath} />
            </header>
            {timelineData ? timeline(timelineData) + '<hr class="rule">' : ""}
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
