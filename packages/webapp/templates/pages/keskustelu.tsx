/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";
import type {
  DebateData,
  SpeechEntry,
  VoteResultData,
  DocLink,
} from "./keskustelu-view-model";

interface Props {
  data: DebateData;
}

export default function Keskustelu({ data }: Props) {
  const d = data;
  const sec = d.section;
  const ses = d.session;

  return (
    <>
      <title>{sec.title} — Keskustelu — Eduskuntapeili</title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a href="/istunnot" style="color:var(--blue)">
            Istunnot
          </a>
          &nbsp;›&nbsp;{" "}
          <a href={`/istunto/${ses.key}`} style="color:var(--blue)">
            {ses.title}
          </a>
          &nbsp;›&nbsp;{" "}
          <span>
            Keskustelu
            {sec.itemNumber ? ` · asiakohta ${sec.itemNumber}` : ""}
          </span>
        </div>

        <DebateHead data={data} />
        <DocToolbar docs={d.relatedDocs} sessionKey={ses.key} />
        <AiSummaryBlock
          groupSpeechCount={sec.groupSpeechCount}
          totalSpeeches={sec.totalSpeeches}
        />
        <ContextSection data={data} />
        <FilterToolbar
          groupCount={sec.groupSpeechCount}
          blocStats={d.blocStats}
        />
        <SpeechTranscript speeches={d.speeches} section={sec} />
        {d.responseSpeeches.length > 0 && (
          <MoreSpeeches
            speeches={d.responseSpeeches}
            total={d.blocStats.totalReply}
            sessionKey={ses.key}
          />
        )}
        {d.votings.length > 0 && (
          <VoteOutcome votings={d.votings} fetchedAt={d.fetchedAt} />
        )}
        <SpeechSourceNote fetchedAt={d.fetchedAt} />
      </div>

      <script>{`(function(){
  var rows=[].slice.call(document.querySelectorAll('.speech'));
  var chips=[].slice.call(document.querySelectorAll('.fchip'));
  var search=document.getElementById('sp-search');
  var countE=document.getElementById('sp-count');
  var empty=document.getElementById('sp-empty');
  var filter='all';
  function apply(){
    var q=(search.value||'').trim().toLowerCase();
    var shown=0;
    rows.forEach(function(r){
      var okB=filter==='all'||r.getAttribute('data-bloc')===filter;
      var okT=!q||(r.getAttribute('data-text')||'').indexOf(q)!==-1;
      var show=okB&&okT;
      r.style.display=show?'':'none';
      if(show)shown++;
    });
    countE.textContent=shown;
    empty.hidden=shown!==0;
  }
  chips.forEach(function(c){
    c.addEventListener('click',function(){
      chips.forEach(function(x){x.classList.remove('is-active')});
      c.classList.add('is-active');
      filter=c.getAttribute('data-filter');
      apply();
    });
  });
  if(search) search.addEventListener('input',apply);
})();`}</script>
    </>
  );
}

function DebateHead({ data }: Props) {
  const sec = data.section;
  const ses = data.session;

  return (
    <section class="doc-head">
      <div class="doc-head__top">
        {sec.itemNumber && (
          <span class="doc-id">Asiakohta {sec.itemNumber}</span>
        )}
        <span class="doc-type">
          Täysistuntokeskustelu
          {sec.processingTitle ? ` · ${sec.processingTitle}` : ""}
        </span>
        {sec.identifier && (
          <span class="tag tag--ghost" style="margin-left:auto">
            {sec.identifier}
          </span>
        )}
      </div>
      <h1>Keskustelu{sec.title ? `: ${sec.title.toLowerCase()}` : ""}</h1>
      <div class="debate-meta">
        <span>
          <b>{ses.dateLabel}</b>
        </span>
        <span class="sep"></span>
        {sec.timeRange && (
          <>
            <span>{sec.timeRange}</span>
            <span class="sep"></span>
          </>
        )}
        <span>
          <b>{sec.totalSpeeches}</b> puheenvuoroa
        </span>
        <span class="sep"></span>
        <span>
          <b>{sec.groupSpeechCount}</b> ryhmäpuheenvuoroa
        </span>
        <span class="sep"></span>
        <a href={`/istunto/${ses.key}`} style="color:var(--blue)">
          Avaa istunto ↗
        </a>
      </div>
    </section>
  );
}

function DocToolbar({
  docs,
  sessionKey,
}: {
  docs: DocLink[];
  sessionKey: string;
}) {
  if (docs.length === 0) return null;

  return (
    <div class="doc-toolbar">
      {docs.map((doc) =>
        doc.documentId ? (
          <a href={`/asiakirja/${doc.documentId}`} class="tbtn">
            <span class="ic">
              {doc.typeName?.includes("mietint") ? "▤" : "↗"}
            </span>{" "}
            {doc.label ?? doc.tunnus}
          </a>
        ) : (
          <span class="tbtn">
            <span class="ic">▤</span> {doc.tunnus}
          </span>
        ),
      )}
      <a href={`/istunto/${sessionKey}`} class="tbtn">
        <span class="ic">⚖</span> Istunnon äänestykset
      </a>
      <span class="grow"></span>
      <button class="tbtn">
        <span class="ic">⧉</span> Jaa
      </button>
    </div>
  );
}

function AiSummaryBlock({
  groupSpeechCount,
  totalSpeeches,
}: {
  groupSpeechCount: number;
  totalSpeeches: number;
}) {
  return (
    <div class="summary">
      <div class="summary__bar">
        <span class="l">
          <span class="spark">✦</span>
          <span class="lbl">Tekoälykooste · keskustelu</span>
        </span>
        <span class="read">
          {groupSpeechCount} ryhmäpuheenvuoroa · {totalSpeeches} puheenvuoroa
          yhteensä
        </span>
      </div>
      <div class="summary__in">
        <div class="summary__q">Mistä keskusteltiin?</div>
        <p class="summary__lead">
          Tekoälykoostetta ei ole vielä saatavilla tälle keskustelulle.
        </p>
        <div class="summary__foot">
          <span class="summary__disc">
            Koneellisesti tuotettu kooste ryhmäpuheenvuoroista. Lue alkuperäiset
            puheenvuorot alta tai pöytäkirjasta.
          </span>
        </div>
      </div>
    </div>
  );
}

function ContextSection({ data }: Props) {
  const sec = data.section;
  const ses = data.session;

  return (
    <section class="ph" id="asiayhteys" style="margin-top:30px">
      <Kicker
        text="Asiayhteys · mistä keskustelussa on kyse"
        modifier="blue"
        dot
      />
      <div class="ph__head">
        <h2>{sec.title}</h2>
        {sec.identifier && <span class="meta">{sec.identifier}</span>}
      </div>
      <div class="ctx-grid">
        <div class="ctx-box">
          <h3>Keskustelun tiedot</h3>
          <ul class="ctx-themes">
            <li>
              <b>Täysistunto:</b>{" "}
              <a href={`/istunto/${ses.key}`} style="color:var(--blue)">
                {ses.key}
              </a>
            </li>
            <li>
              <b>Ajankohta:</b> {ses.dateLabel}
            </li>
            <li>
              <b>Puheenvuoroja:</b> {sec.totalSpeeches} ({sec.groupSpeechCount}{" "}
              ryhmäpuheenvuoroa)
            </li>
            {sec.processingTitle && (
              <li>
                <b>Käsittelyvaihe:</b> {sec.processingTitle}
              </li>
            )}
          </ul>
        </div>
        <div class="ctx-box">
          <h3>
            {sec.identifier ? "Asiakirja" : "Lisätiedot"}
            <small>Tietoja keskustelun kohteesta</small>
          </h3>
          <ul class="ctx-list">
            {sec.identifier && (
              <li>
                <span class="n">1</span>Asiakirjatunnus: <b>{sec.identifier}</b>
              </li>
            )}
            <li>
              <span class="n">{sec.identifier ? "2" : "1"}</span>
              Tietolähde: <b>Eduskunnan avoin data</b>
            </li>
          </ul>
          <div class="ctx-src">
            Lähde: Speech + Section · avoindata.eduskunta.fi
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterToolbar({
  groupCount,
}: {
  groupCount: number;
  blocStats?: { groupGov: number; groupOpp: number };
}) {
  return (
    <>
      <div class="toolbar">
        <label class="search">
          <span class="ic">⌕</span>
          <input
            id="sp-search"
            type="text"
            placeholder="Hae puhujalla tai puolueella…"
          />
        </label>
        <span class="count">
          <b id="sp-count">{groupCount}</b> ryhmäpuheenvuoroa
        </span>
      </div>
      <div class="fchips">
        <button class="fchip is-active" data-filter="all">
          Kaikki
        </button>
        <button class="fchip" data-filter="hallitus">
          <span class="pdot" style="background:var(--hall)"></span>Hallitus
        </button>
        <button class="fchip" data-filter="oppositio">
          <span class="pdot" style="background:var(--opp)"></span>Oppositio
        </button>
      </div>
    </>
  );
}

function SpeechTranscript({
  speeches,
}: {
  speeches: SpeechEntry[];
  section?: { itemNumber: string | null };
}) {
  return (
    <>
      <p class="kicker" style="margin:26px 0 14px">
        Ryhmäpuheenvuorot · puhejärjestyksessä
      </p>
      <div class="transcript" id="transcript">
        {speeches.map((sp) => (
          <SpeechCard speech={sp} />
        ))}
      </div>
      <div
        id="sp-empty"
        hidden
        style="text-align:center;color:var(--muted);padding:34px 0"
      >
        Ei puheenvuoroja näillä hakuehdoilla.
      </div>
    </>
  );
}

function SpeechCard({ speech: sp }: { speech: SpeechEntry }) {
  return (
    <article class="speech" data-bloc={sp.bloc} data-text={sp.searchText}>
      <div class="speech__av">
        <span>{sp.initials}</span>
        <span class="pbar" style={`background:${sp.partyColor}`}></span>
      </div>
      <div class="speech__main">
        <div class="speech__head">
          <span class="speech__name">
            {sp.firstName} {sp.lastName}
          </span>
          <span class="tag">
            <span
              style={`width:9px;height:9px;border-radius:50%;background:${sp.partyColor};display:inline-block`}
            ></span>{" "}
            {sp.partyName}
          </span>
          <span class={`speech__role ${sp.roleClass}`}>{sp.roleLabel}</span>
          <span class="speech__time">
            {sp.timeLabel}
            {sp.durationLabel ? ` · ${sp.durationLabel}` : ""}
          </span>
        </div>
        {sp.summary && (
          <div class="speech__sum">
            <span class="sp">✦</span>
            <span>{sp.summary}</span>
          </div>
        )}
        <div class="speech__body">
          {sp.contentPreview && (
            <p>
              {sp.contentPreview}
              {sp.contentTruncated && <span class="speech__cont">…</span>}
            </p>
          )}
        </div>
        <div class="speech__foot">
          <a href="#" class="link-arrow">
            Lue koko puheenvuoro (PTK) ↗
          </a>
          <span class="meta">
            {sp.contentLength.toLocaleString("fi-FI")} merkkiä · suomi
          </span>
        </div>
      </div>
    </article>
  );
}

function MoreSpeeches({
  speeches,
  total,
  sessionKey,
}: {
  speeches: SpeechEntry[];
  total: number;
  sessionKey: string;
}) {
  if (speeches.length === 0) return null;
  const sample = speeches.slice(0, 8);

  return (
    <div class="more-speeches">
      <h4>Ryhmäpuheenvuorojen jälkeen</h4>
      <p style="font-size:14.5px;line-height:1.55;color:var(--body);margin:0">
        Ryhmäpuheenvuorokierroksen jälkeen käytiin debatti, jossa pidettiin{" "}
        <b style="color:var(--ink)">{total} vastaus- ja muuta puheenvuoroa</b>.
      </p>
      {sample.map((sp) => (
        <div class="reply-row">
          <span class="d" style={`background:${sp.partyColor}`}></span>
          <span class="nm">
            {sp.firstName} {sp.lastName} <small>{sp.partyName}</small>
          </span>
          <span class="tm">{sp.timeLabel}</span>
        </div>
      ))}
      {speeches.length > 8 && (
        <div class="reply-row">
          <span class="d" style="background:var(--faint)"></span>
          <span class="nm">
            <small>…ja {speeches.length - 8} muuta puheenvuoroa</small>
          </span>
          <span class="tm"></span>
        </div>
      )}
      <div style="margin-top:14px;display:flex;gap:16px;flex-wrap:wrap">
        <a href={`/istunto/${sessionKey}`} class="link-arrow">
          Näytä kaikki {total} puheenvuoroa pöytäkirjasta ↗
        </a>
        <a href={`/istunto/${sessionKey}`} class="link-arrow">
          Takaisin istuntoon →
        </a>
      </div>
    </div>
  );
}

function VoteOutcome({
  votings,
  fetchedAt,
}: {
  votings: VoteResultData[];
  fetchedAt: string;
}) {
  const mainVote = votings[0]!;
  const hasMultiple = votings.length > 1;

  return (
    <section class="ph" id="paatos">
      <Kicker text="Päätös · ainoa käsittely" modifier="blue" dot />
      <div class="ph__head">
        <h2>Miten asia ratkesi</h2>
        <span class="meta">{votings.length} äänestystä</span>
      </div>
      <p class="ph__intro">
        Keskustelun jälkeen asiasta äänestettiin.{" "}
        {hasMultiple ? "Äänestyksiä oli useita." : ""}
      </p>
      <div class="ag-votes" style="margin-top:8px">
        {votings.map((v) => (
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
      <div class="decision" style="margin-top:18px">
        <div class="decision__icon">
          {mainVote.outcomeClass === "ok" ? "✓" : "✗"}
        </div>
        <div class="decision__main">
          <div class="t">
            {mainVote.outcomeClass === "ok"
              ? `Eduskunta hyväksyi kannanoton, ${mainVote.nYes}–${mainVote.nNo}`
              : `Kannanotto hylättiin, ${mainVote.nYes}–${mainVote.nNo}`}
          </div>
          <div class="s">
            Äänestystulos: JAA {mainVote.nYes}, EI {mainVote.nNo}.
          </div>
        </div>
      </div>
      <div class="source-note">
        <span>Lähde:</span>
        <span class="dset">Eduskunnan avoin data · Voting</span>
        <span>·</span>
        <span class="fresh">haettu {fetchedAt}</span>
      </div>
    </section>
  );
}

function SpeechSourceNote({ fetchedAt }: { fetchedAt: string }) {
  return (
    <div class="source-note" style="margin-top:32px">
      <span>Lähde:</span>
      <span class="dset">Eduskunnan avoin data · Speech + SpeechContent</span>
      <span>·</span>
      <span class="fresh">haettu {fetchedAt}</span>
    </div>
  );
}
