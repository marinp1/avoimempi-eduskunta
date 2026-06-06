/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";

interface Props {
  /** Page `<title>` suffix. */
  title?: string;
}

/** Sessions page (placeholder — not yet implemented). */
export default function Istunnot({ title }: Props) {
  return (
    <>
      <title>{title} — Eduskuntapeili</title>
      <section class="page-head wrap">
        <Kicker text="Istunnot" />
        <h1>Istunnot</h1>
        <p class="sub">
          Täysistuntojen pöytäkirjat, puheenvuorot ja äänestykset. Tulossa pian.
        </p>
      </section>
    </>
  );
}
