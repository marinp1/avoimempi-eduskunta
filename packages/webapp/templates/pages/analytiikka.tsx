/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";

interface Props {
  title?: string;
}

export default function Analytiikka({ title }: Props) {
  return (
    <>
      <title>{title} — Eduskuntapeili</title>
      <section class="page-head wrap">
        <Kicker text="Analytiikka" />
        <h1>Analytiikka</h1>
        <p class="sub">
          Tilastot ja analyysit parlamentin toiminnasta. Tulossa pian.
        </p>
      </section>
    </>
  );
}
