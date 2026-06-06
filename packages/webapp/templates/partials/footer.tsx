/** @jsxImportSource ../../src/jsx */

/** Page footer — period info, legal text, and data source attribution. */
export default function Footer() {
  return (
    <footer class="foot">
      <div class="foot__period">
        <span class="pk">Tietojakso</span>
        <span class="pv" data-period-label></span>
        <span class="pbadge" data-period-badge-foot></span>
        <span class="pdetail" data-period-detail></span>
      </div>
      <div class="foot__legal">
        <span>
          Eduskuntapeili — avoin parlamenttidata ·{" "}
          <a
            href="https://avoindata.eduskunta.fi/"
            target="_blank"
            rel="noopener"
          >
            avoindata.eduskunta.fi
          </a>
        </span>
        <span>Ei virallinen · data Creative Commons BY 4.0</span>
      </div>
    </footer>
  );
}
