/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";

interface Props {
  title?: string;
}

export default function Aanestykset({ title }: Props) {
  return (
    <>
      <title>{title} — Eduskuntapeili</title>
      <section class="page-head wrap">
        <Kicker text="Äänestykset" />
        <h1>Äänestykset</h1>
        <p class="sub">
          Eduskunnan äänestystulokset ja äänestyshistoria. Tulossa pian.
        </p>
      </section>
    </>
  );
}
