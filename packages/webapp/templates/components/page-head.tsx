/** @jsxImportSource ../../src/jsx */
import Kicker from "./kicker";

interface Props {
  kicker: string;
  heading: string;
  subtitle?: string;
}

export default function PageHead({ kicker, heading, subtitle }: Props) {
  return (
    <section class="page-head">
      <Kicker text={kicker} />
      <h1>{heading}</h1>
      {subtitle && <p class="sub">{subtitle}</p>}
    </section>
  );
}
