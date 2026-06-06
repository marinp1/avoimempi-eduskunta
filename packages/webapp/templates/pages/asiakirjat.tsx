/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";

interface Props {
  /** Page `<title>` suffix. */
  title?: string;
}

/** Documents page (placeholder — not yet implemented). */
export default function Asiakirjat({ title }: Props) {
  return (
    <>
      <title>{title} — Eduskuntapeili</title>
      <section class="page-head wrap">
        <Kicker text="Asiakirjat" />
        <h1>Asiakirjat</h1>
        <p class="sub">
          Lakiehdotukset, kirjalliset kysymykset ja muut parlamenttiasiakirjat.
          Tulossa pian.
        </p>
      </section>
    </>
  );
}
