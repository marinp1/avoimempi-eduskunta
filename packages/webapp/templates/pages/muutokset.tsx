/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";

interface Props {
  title?: string;
}

export default function Muutokset({ title }: Props) {
  return (
    <>
      <title>{title} — Eduskuntapeili</title>
      <section class="page-head wrap">
        <Kicker text="Muutokset" />
        <h1>Muutokset</h1>
        <p class="sub">Palvelun ja datan päivityshistoria. Tulossa pian.</p>
      </section>
    </>
  );
}
