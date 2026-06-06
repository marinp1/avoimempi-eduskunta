/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";

interface Props {
  title?: string;
}

export default function Hallitukset({ title }: Props) {
  return (
    <>
      <title>{title} — Eduskuntapeili</title>
      <section class="page-head wrap">
        <Kicker text="Hallitukset" />
        <h1>Hallitukset</h1>
        <p class="sub">
          Suomen hallitusten kokoonpanot ja kaudet. Tulossa pian.
        </p>
      </section>
    </>
  );
}
