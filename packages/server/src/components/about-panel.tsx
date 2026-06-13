/** @jsxImportSource ../../src/jsx */

export interface AboutPanelModel {
  barLabel: string;
  closeAria: string;
  kicker: string;
  title: string;
  writerName: string;
  writerRole: string;
  writerDate: string;
  bodyParagraphs: string[];
  signature: string;
  signatureMetaHtml: string;
  portraitUrl?: string;
  colophonSourceLabel: string;
  colophonLinkUrl: string;
  colophonLinkText: string;
  colophonIndependent: string;
}

/** Editorial side panel ("Toimitukselta") — server-rendered shell content.
 *  Renders the full about panel markup, initially hidden.
 *  Open/close is handled client-side by about-island.ts. */
export default function AboutPanel({
  barLabel,
  closeAria,
  kicker,
  title,
  writerName,
  writerRole,
  writerDate,
  bodyParagraphs,
  portraitUrl,
  colophonSourceLabel,
  colophonLinkUrl,
  colophonLinkText,
}: AboutPanelModel) {
  return (
    <aside
      class="about"
      role="dialog"
      aria-label={barLabel}
      aria-modal="true"
      hidden
    >
      <div class="about__bar">
        <span class="lbl">{barLabel}</span>
        <button class="about__close" type="button" aria-label={closeAria}>
          ×
        </button>
      </div>
      <div class="about__scroll">
        <p class="kicker kicker--red">
          <span class="dot"></span>
          {kicker}
        </p>
        <h1 class="about__title">{title}</h1>
        <div class="about__writer">
          <div class="about__portrait">
            {portraitUrl ? <img src={portraitUrl} alt="" /> : null}
          </div>
          <div class="about__byline">
            <div class="name">{writerName}</div>
            <div class="role">{writerRole}</div>
            <div class="date">{writerDate}</div>
          </div>
        </div>
        <div class="about__body">
          {bodyParagraphs.map((p) => (
            <p>{p}</p>
          ))}
        </div>
        {/*
        <div class="about__sig">
          <div class="about__sig-mark">{signature}</div>
          <div class="about__sig-meta">{signatureMetaHtml}</div>
        </div>
        */}
        <div class="about__colophon">
          {colophonSourceLabel}
          <a href={colophonLinkUrl} target="_blank" rel="noopener">
            {colophonLinkText}
          </a>
          {/*
          <br />
          {colophonIndependent}
          */}
        </div>
      </div>
    </aside>
  );
}
