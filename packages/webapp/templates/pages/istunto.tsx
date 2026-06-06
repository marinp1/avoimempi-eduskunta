/** @jsxImportSource ../../src/jsx */
import type {
  SessionDetailData,
  AgendaSectionData,
  AgendaItemData,
  VoteResultData,
  AbsenteeGroup,
} from "./istunto-view-model";

interface Props {
  data: SessionDetailData;
}

const REASON_LABEL: Record<string, string> = {
  e: "e",
  h: "h",
  "-": "–",
};

export default function Istunto({ data }: Props) {
  const s = data.session;
  return (
    <>
      <title>{s.title} — Eduskuntapeili</title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a href="/istunnot" style="color:var(--blue)">
            Istunnot
          </a>
          &nbsp;›&nbsp; <span>{s.title}</span>
        </div>

        <section class="doc-head">
          <div class="doc-head__top">
            <span class="doc-id">{s.ptkId}</span>
            <span class="doc-type">{s.typeLabel}</span>
            <span class={`sess-state ${s.stateClass}`} style="margin-left:auto">
              {s.stateLabel}
            </span>
          </div>
          <h1>{s.title}</h1>
          <div class="sess-meta">
            <span>
              <b>{s.dateLabel}</b>
            </span>
            <span class="sep"></span>
            <span>{s.timeRange}</span>
            <span class="sep"></span>
            <span>
              kesto <b>{s.duration}</b>
            </span>
            <span class="sep"></span>
            <span>
              <b>{s.itemCount}</b> asiakohtaa
            </span>
            <span class="sep"></span>
            <span>
              <b>{s.votingCount}</b> äänestystä
            </span>
            <span class="sep"></span>
            <span>
              <b>{s.speechCount}</b> puheenvuoroa
            </span>
          </div>
        </section>

        <div class="doc-toolbar">
          <a href="#" class="tbtn">
            <span class="ic">↗</span> Pöytäkirja (PDF)
          </a>
          <a href="#" class="tbtn">
            <span class="ic">▤</span> Päiväjärjestys
          </a>
          <a href="#paatosasiat" class="tbtn">
            <span class="ic">⚖</span> Äänestykset
          </a>
          <span class="grow"></span>
          <button class="tbtn">
            <span class="ic">⧉</span> Jaa
          </button>
        </div>

        <nav class="sess-jump">
          <a href="#lasnaolo">Läsnäolo</a>
          <a href="#paatosasiat">Päätösasiat · {s.votingCount} äänestystä</a>
          <a href="#keskustelut">Keskustelut</a>
          <a href="#poydalle">Pöydälle pannut</a>
        </nav>

        <div class="summary">
          <div class="summary__bar">
            <span class="l">
              <span class="spark">✦</span>
              <span class="lbl">Tekoälykooste · koko istunto</span>
            </span>
            <span class="read">
              {s.itemCount} asiakohtaa · {s.votingCount} äänestystä ·{" "}
              {s.speechCount} puheenvuoroa
            </span>
          </div>
          <div class="summary__in">
            <div class="summary__q">Mitä istunnossa tapahtui?</div>
            <p class="summary__lead">
              Tekoälykoostetta ei ole vielä saatavilla tälle istunnolle.
            </p>
          </div>
        </div>
      </div>

      {data.attendance && (
        <div class="wrap">
          <AttendanceSection attendance={data.attendance} />
        </div>
      )}

      {data.votingSections.length > 0 && (
        <div class="wrap">
          <VotingSections sections={data.votingSections} />
        </div>
      )}

      {data.discussionSections.length > 0 && (
        <div class="wrap">
          <DiscussionSections sections={data.discussionSections} />
        </div>
      )}

      {data.tabledItems.length > 0 && (
        <div class="wrap">
          <TabledSection items={data.tabledItems} />
        </div>
      )}
    </>
  );
}

interface AttendanceSectionData {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalMembers: number;
  parties: {
    code: string;
    label: string;
    color: string;
    total: number;
    absent: number;
    bloc: string;
  }[];
  absenteesByParty: AbsenteeGroup[];
  rollCallTitle: string | null;
  rollCallTime: string | null;
}

function AttendanceSection({
  attendance,
}: {
  attendance: AttendanceSectionData;
}) {
  const presentPct =
    attendance.totalMembers > 0
      ? (attendance.totalPresent / attendance.totalMembers) * 100
      : 0;
  const absentPct =
    attendance.totalMembers > 0
      ? (attendance.totalAbsent / attendance.totalMembers) * 100
      : 0;
  return (
    <section class="attend" id="lasnaolo">
      <p class="kicker" style="margin:30px 0 6px">
        Läsnäolo · nimenhuuto{" "}
        {attendance.rollCallTime
          ? `klo ${attendance.rollCallTime.slice(11, 16)}`
          : ""}
      </p>
      <div class="psec__h" style="margin-bottom:18px">
        <h2>Ketkä olivat paikalla</h2>
        <span class="meta">asiakohta 1 · KOKNHU</span>
      </div>

      <div class="attend__grid">
        <div class="attend__sum">
          <div class="att-big">
            <span class="n">{attendance.totalPresent}</span>
            <span class="of">/ {attendance.totalMembers} läsnä</span>
          </div>
          <div class="att-cap">
            Nimenhuudossa kirjattu läsnäolo istunnon alkaessa.
          </div>
          <div class="att-bar">
            <span class="pres" style={`width:${presentPct.toFixed(0)}%`}></span>
            <span class="abs" style={`width:${absentPct.toFixed(0)}%`}></span>
          </div>
          <div class="att-chips">
            <div class="att-chip">
              <span class="sw" style="background:var(--hall)"></span>
              Läsnä <b>{attendance.totalPresent}</b>
            </div>
            <div class="att-chip">
              <span class="sw ring"></span>
              Poissa <b>{attendance.totalAbsent}</b>
            </div>
            {attendance.totalLate > 0 && (
              <div class="att-chip">
                <span class="sw" style="background:var(--opp)"></span>
                Saapui myöhässä <b>{attendance.totalLate}</b>
              </div>
            )}
          </div>
        </div>

        <div class="seatwrap">
          <SeatGrid
            parties={attendance.parties}
            totalPresent={attendance.totalPresent}
            totalAbsent={attendance.totalAbsent}
          />
          <SeatLegend parties={attendance.parties} />
        </div>
      </div>

      <div class="absentees">
        <div class="psec__h" style="margin-bottom:6px">
          <h3 style="font-size:var(--fs-h3)">Poissa olleet edustajat</h3>
          <span class="meta">
            {attendance.totalAbsent} poissa
            {attendance.totalLate > 0
              ? ` · ${attendance.totalLate} myöhässä`
              : ""}
          </span>
        </div>
        {attendance.absenteesByParty
          .filter((g) => g.members.length > 0)
          .map((group) => (
            <div class="abs-row">
              <div class="abs-row__p">
                <span class="d" style={`background:${group.color}`}></span>
                {group.partyCode} <small>{group.members.length}</small>
              </div>
              <div class="abs-names">
                {group.members.map((m, i) => (
                  <span class="nm">
                    {i > 0 && <span> &nbsp;·&nbsp; </span>}
                    {m.lastName} {m.firstName}
                    {m.isLate ? (
                      <span class="r"> myöhässä</span>
                    ) : (
                      <span class="r">
                        {REASON_LABEL[m.reason] ?? m.reason}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        <div class="source-note">
          <span>Lähde:</span>
          <span class="dset">Eduskunnan avoin data · RollCallReport</span>
          <span>·</span>
          <span>
            poissaolon syy: <b>e</b> eduskuntatyö · <b>h</b> hyväksytty
            poissaolo · <b>–</b> ei ilmoitettu
          </span>
        </div>
      </div>
    </section>
  );
}

function SeatGrid({
  parties,
  totalPresent,
  totalAbsent,
}: {
  parties: {
    code: string;
    color: string;
    label: string;
    total: number;
    absent: number;
  }[];
  totalPresent: number;
  totalAbsent: number;
}) {
  return (
    <div
      class="seatgrid"
      role="img"
      aria-label={`${totalPresent} läsnä ja ${totalAbsent} poissa, puolueittain väritettynä`}
    >
      {parties
        .filter((p) => p.total > 0)
        .map((p) => {
          const present = p.total - p.absent;
          const seats: string[] = [];
          for (let i = 0; i < present; i++) seats.push("pres");
          for (let i = 0; i < p.absent; i++) seats.push("abs");
          return seats.map((kind) => (
            <span
              class={`seat${kind === "abs" ? " absent" : ""}`}
              style={`--p:${p.color}`}
              title={`${p.label}${kind === "abs" ? " · poissa" : " · läsnä"}`}
            ></span>
          ));
        })}
    </div>
  );
}

function SeatLegend({
  parties,
}: {
  parties: { code: string; color: string; total: number }[];
}) {
  return (
    <div class="seat-legend">
      {parties
        .filter((p) => p.total > 0)
        .map((p) => (
          <span class="it">
            <span class="d" style={`background:${p.color}`}></span>
            {p.code}
          </span>
        ))}
      <span class="it">
        <span class="d ring"></span>poissa
      </span>
    </div>
  );
}

function VotingSections({ sections }: { sections: AgendaSectionData[] }) {
  const totalVotes = sections.reduce(
    (sum, s) =>
      sum + s.items.reduce((a, i) => a + (i.votingPhase?.votes.length ?? 0), 0),
    0,
  );
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  return (
    <section class="ph" id="paatosasiat">
      <p class="kicker kicker--blue">
        <span class="dot"></span>Päätösasiat · toinen käsittely
      </p>
      <div class="ph__head">
        <h2>Mistä äänestettiin</h2>
        <span class="meta">
          {totalItems} asiaa · {totalVotes} äänestystä
        </span>
      </div>
      <p class="ph__intro">
        Toisen käsittelyn lopulliset äänestykset. Jokaisessa äänestyksessä JAA
        on valiokunnan mietinnön tai lakiehdotuksen kanta.
      </p>

      {sections.map((s) =>
        s.items.map((item) => (
          <AgendaItemComponent item={item} isVoting={true} />
        )),
      )}

      <div class="source-note">
        <span>Lähde:</span>
        <span class="dset">Eduskunnan avoin data · Voting</span>
        <span>·</span>
        <span class="fresh">haettu</span>
      </div>
    </section>
  );
}

function DiscussionSections({ sections }: { sections: AgendaSectionData[] }) {
  const totalSpeeches = sections.reduce(
    (sum, s) =>
      sum + s.items.reduce((a, i) => a + (i.activity?.speechCount ?? 0), 0),
    0,
  );
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  return (
    <section class="ph" id="keskustelut">
      <p class="kicker">
        <span class="dot" style="background:var(--opp)"></span>Keskustelut ja
        käsittelyt
      </p>
      <div class="ph__head">
        <h2>Mistä keskusteltiin</h2>
        <span class="meta">
          {totalItems} asiaa · {totalSpeeches} puheenvuoroa
        </span>
      </div>
      <p class="ph__intro">
        Lähete- ja ainoan käsittelyn keskustelut sekä ensimmäiset käsittelyt.
        Puheenvuorojen määrä kertoo, kuinka vilkasta keskustelu oli.
      </p>

      {sections.map((s) =>
        s.items.map((item) => (
          <AgendaItemComponent item={item} isVoting={false} />
        )),
      )}

      <div class="source-note">
        <span>Lähde:</span>
        <span class="dset">Eduskunnan avoin data · Speech + Section</span>
        <span>·</span>
        <span class="fresh">haettu</span>
      </div>
    </section>
  );
}

function TabledSection({ items }: { items: AgendaSectionData[] }) {
  return (
    <section class="ph" id="poydalle">
      <p class="kicker">
        <span class="dot" style="background:var(--faint)"></span>Pöydälle pannut
        asiat
      </p>
      <div class="ph__head">
        <h2>Siirtyivät seuraavaan istuntoon</h2>
        <span class="meta">
          {items.reduce((s, g) => s + g.items.length, 0)} asiaa · ei keskustelua
        </span>
      </div>
      <p class="ph__intro">
        Valiokuntien mietinnöt pantiin pöydälle ja niistä päätetään seuraavissa
        täysistunnoissa.
      </p>

      {items.map((g) =>
        g.items.map((item) => (
          <AgendaItemComponent item={item} isVoting={false} isTabled={true} />
        )),
      )}

      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:22px;padding-top:16px;border-top:1px solid var(--rule)">
        <div style="font-family:var(--mono);font-size:var(--fs-mono);color:var(--muted)"></div>
        <a href="/istunnot" class="link-arrow">
          ← Takaisin istuntoihin
        </a>
      </div>
    </section>
  );
}

function AgendaItemComponent({
  item,
  isVoting,
  isTabled,
}: {
  item: AgendaItemData;
  isVoting: boolean;
  isTabled?: boolean;
}) {
  const phaseIcon = isTabled ? "tabled" : isVoting ? "vote" : "talk";
  return (
    <div class="ag-item">
      <div class="ag-num">{String(item.number).padStart(2, "0")}</div>
      <div class="ag-body">
        {item.votingPhase && (
          <div class="ag-phase">
            <span class={`pk ${phaseIcon}`}></span>
            {item.votingPhase.label} · {item.votingPhase.votes.length}{" "}
            äänestystä
          </div>
        )}
        {!item.votingPhase && (
          <div class="ag-phase">
            <span class={`pk ${phaseIcon}`}></span>
            {isTabled ? "Pöydällepano" : "Keskustelu"}
          </div>
        )}

        {item.titleHref ? (
          <a href={item.titleHref} class="ag-title">
            {item.title}
          </a>
        ) : (
          <span class="ag-title">{item.title}</span>
        )}

        {item.documents.length > 0 && (
          <div class="ag-docs">
            {item.documents.map((doc) =>
              doc.documentId ? (
                <a
                  class={`ag-doc${doc.isCommittee ? " cmt" : ""}`}
                  href={`/asiakirja/${doc.documentId}`}
                >
                  {doc.tunnus}
                </a>
              ) : (
                <span class={`ag-doc${doc.isCommittee ? " cmt" : ""}`}>
                  {doc.tunnus}
                </span>
              ),
            )}
          </div>
        )}

        {item.votingPhase && item.votingPhase.votes.length > 0 && (
          <VoteList votes={item.votingPhase.votes} />
        )}

        {item.activity && !item.votingPhase && (
          <div class="ag-activity">
            <span class="ag-badge talk">
              <span class="i">🗣</span> {item.activity.speechCount} puheenvuoroa
            </span>
            {!item.activity.hasVotings && (
              <span class="ag-badge none">ei äänestyksiä</span>
            )}
          </div>
        )}

        {item.speakers && item.speakers.length > 0 && (
          <div class="ag-speakers">
            {item.speakers.map((sp) => (
              <span class="spk">
                <span class="d" style={`background:${sp.partyColor}`}></span>
                {sp.firstName} {sp.lastName} <small>{sp.party}</small>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VoteList({ votes }: { votes: VoteResultData[] }) {
  return (
    <div class="ag-votes">
      {votes.map((v) => (
        <div class="agvote">
          <div class="agvote__t">{v.title}</div>
          <div class="agvote__bar">
            <span class="j" style={`width:${v.yesPct.toFixed(1)}%`}></span>
            <span class="e" style={`width:${v.noPct.toFixed(1)}%`}></span>
          </div>
          <div class="agvote__n">
            <span class="j">{v.nYes}</span>–<span class="e">{v.nNo}</span>
            <span class={`out ${v.outcomeClass}`}>{v.outcome}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
