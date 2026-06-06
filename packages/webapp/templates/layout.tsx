/** @jsxImportSource ../src/jsx */
import Footer from "./partials/footer";
import Masthead from "./partials/masthead";

export interface LayoutOptions {
  content: string;
  activePath: string;
  title?: string;
  assetVersion?: string;
  finnishDate: string;
}

export default function Layout({
  content,
  activePath,
  title,
  assetVersion,
  finnishDate,
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
