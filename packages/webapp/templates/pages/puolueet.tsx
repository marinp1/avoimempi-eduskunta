/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";

interface Props {
  /** Page `<title>` suffix. */
  title?: string;
}

/** Parties page (placeholder — not yet implemented). */
export default function Puolueet({ title }: Props) {
  return (
    <>
      <title>{title} — Eduskuntapeili</title>
      <section class="page-head wrap">
        <Kicker text="Puolueet" />
        <h1>Puolueet</h1>
        <p class="sub">Eduskuntaryhmien tiedot ja tilastot. Tulossa pian.</p>
      </section>
    </>
  );
}
