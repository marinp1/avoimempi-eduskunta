/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import Kicker from "../components/kicker";
import Tag from "../components/tag";
import { cite, sourceNote } from "../components/provenance";
import { esc, formatDate, pctNum } from "../helpers";

export interface PersonProfileData {
  person: {
    id: number;
    firstName: string;
    lastName: string;
    initials: string;
    partyCode: string;
    partyName: string;
    partyColor: string;
    isInGovernment: boolean;
    currentDistrict: string;
    birthYear: number | null;
    age: string;
    profession: string;
    memberSince: string;
  };
  stats: {
    participationPct: string;
    nTotal: number;
    nCast: number;
    nYes: number;
    nNo: number;
    nEmpty: number;
    nAbsent: number;
    nInitiatives: number;
    nWrittenQuestions: number;
  };
  dissents: Array<{
    votingId: number;
    startTime: string;
    title: string;
    sectionTitle: string;
    mpVote: string;
    majorityVote: string;
    partyName: string;
  }>;
  initiatives: Array<{
    documentId?: number;
    parliamentIdentifier: string;
    initiativeTypeCode: string;
    initiativeTypeLabel: string;
    title: string | null;
    submissionDate: string | null;
    relationRole: string;
  }>;
  questions: Array<{
    documentId?: number;
    questionKind: string;
    questionKindLabel: string;
    parliamentIdentifier: string;
    title: string | null;
    submissionDate: string | null;
  }>;
  committees: Array<{
    committeeCode: string;
    committeeName: string;
    role: string;
    startDate: string;
    endDate: string | null;
  }>;
  focusAreas: Array<{
    label: string;
    weight: number;
  }>;
  speeches: Array<{
    sectionTitle: string | null;
    startTime: string | null;
    speechType: string | null;
  }>;
  baselines: {
    speech: { own: number; partyAvg: number; parliamentAvg: number };
    initiative: { own: number; partyAvg: number; parliamentAvg: number };
    writtenQuestion: { own: number; partyAvg: number; parliamentAvg: number };
    participation: { own: string; partyAvg: string; parliamentAvg: string };
  } | null;
  hasAiSummary: boolean;
  fetchedAt: string;
}

interface Props {
  data: PersonProfileData;
}

export default function Edustaja({ data }: Props) {
  const p = data.person;
  const s = data.stats;
  const blocTag = p.isInGovernment ? "hall" : "opp";
  const blocLabel = p.isInGovernment ? "Hallitus" : "Oppositio";
  const topicLgThreshold =
    data.focusAreas.length > 0
      ? Math.max(2, Math.max(...data.focusAreas.map((a) => a.weight)) * 0.35)
      : 99;

  return (
    <>
      <title>
        {esc(p.firstName)} {esc(p.lastName)} — Eduskuntapeili
      </title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a href="/edustajat" style="color:var(--blue)">
            Kansanedustajat
          </a>
          &nbsp;›&nbsp;{" "}
          <span>
            {esc(p.firstName)} {esc(p.lastName)}
          </span>
        </div>

        <section class="bio-head">
          <div class="bio-portrait">
            <span class="initials">{esc(p.initials)}</span>
            <span class="pbar" style={`background:${p.partyColor}`}></span>
          </div>
          <div class="bio-head__main">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px">
              <Tag text={blocLabel} modifier={blocTag} />
              <span class="tag">
                <span
                  style={`width:9px;height:9px;border-radius:50%;background:${p.partyColor};display:inline-block`}
                ></span>
                {esc(p.partyName)}
              </span>
            </div>
            <h1 class="bio-name">
              {esc(p.firstName)} {esc(p.lastName)}
            </h1>
            <div class="bio-meta">
              <span>{esc(p.currentDistrict)}</span>
              {p.birthYear ? (
                <>
                  <span class="sep"></span>
                  <span>
                    s. {p.birthYear} · {esc(p.age)} v.
                  </span>
                </>
              ) : null}
              {p.profession ? (
                <>
                  <span class="sep"></span>
                  <span>{esc(p.profession)}</span>
                </>
              ) : null}
              {p.memberSince ? (
                <>
                  <span class="sep"></span>
                  <span>kansanedustaja {esc(p.memberSince)}</span>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <div class="bio-stats">
          <div class="bio-stat">
            <div class="k">Osallistui äänestyksiin</div>
            <div class="v">
              {s.nTotal > 0
                ? cite(`${s.participationPct}<small>%</small>`, {
                    value: `${s.participationPct} % (${s.nCast} / ${s.nTotal})`,
                    caption: "Osallistuminen täysistuntoäänestyksiin",
                    set: "Eduskunnan avoin data · Vote",
                    table: "Vote",
                    record: `annetut ${s.nCast} · poissa ${s.nAbsent}`,
                    markText: "*",
                  })
                : "—"}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">Äänesti "ei"</div>
            <div class="v">
              {s.nNo > 0
                ? cite(`${s.nNo}<small>×</small>`, {
                    value: `${s.nNo} kertaa`,
                    caption: "Ei-äänet annetuista äänistä",
                    set: "Eduskunnan avoin data · Vote",
                    table: "Vote",
                    record: `${s.nNo} Ei · ${s.nEmpty} Tyhjää · ${s.nYes} Jaa`,
                    markText: "*",
                  })
                : "—"}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">Omia aloitteita</div>
            <div class="v">
              {s.nInitiatives > 0
                ? cite(String(s.nInitiatives), {
                    value: `${s.nInitiatives} aloitetta`,
                    caption: "Aloitteet ensimmäisenä allekirjoittajana",
                    set: "Eduskunnan avoin data · VaskiData",
                    table: "LegislativeInitiative",
                    record: `${s.nInitiatives} aloitetta ensimmäisenä allekirjoittajana`,
                    markText: "*",
                  })
                : "—"}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">Kirjallisia kysymyksiä</div>
            <div class="v">
              {s.nWrittenQuestions > 0
                ? cite(String(s.nWrittenQuestions), {
                    value: `${s.nWrittenQuestions} kysymystä`,
                    caption: "Kirjalliset kysymykset ministerille",
                    set: "Eduskunnan avoin data · VaskiData",
                    table: "WrittenQuestion",
                    record: `${s.nWrittenQuestions} kysymystä`,
                    markText: "*",
                  })
                : "—"}
            </div>
          </div>
        </div>

        <div class="bio-grid">
          <div>
            <div class="ai">
              <div class="ai__head">
                <span class="ai__spark">✦</span>
                <span class="ai__label">
                  Tekoälykooste · mitä edustaja on tehnyt
                </span>
              </div>
              {data.hasAiSummary ? null : (
                <p class="ai__body">
                  <span style="color:var(--muted)">
                    AI-yhteenvedot tulossa — tämä kooste tuotetaan
                    automaattisesti, kun edustajan äänestys-, aloite- ja
                    puheenvuorotiedot on käsitelty.
                  </span>
                </p>
              )}
            </div>

            <section class="psec">
              <Kicker text="Äänestyskäyttäytyminen · kuluva kausi" />
              <div class="psec__h">
                <h2>Miten edustaja äänesti</h2>
                <span class="meta">{s.nTotal} äänestystä</span>
              </div>
              <p class="psec__intro">
                {esc(p.firstName)} antoi äänensä {s.nCast} äänestyksessä (
                {s.participationPct} %).
                {s.nYes > 0 ? ` Jaa-ääniä ${s.nYes}.` : ""}
                {s.nNo > 0 ? ` Ei-ääniä ${s.nNo}.` : ""}
                {s.nEmpty > 0 ? ` Tyhjiä ${s.nEmpty}.` : ""}
                {s.nAbsent > 0
                  ? ` Poissa ${s.nAbsent} äänestyksestä.`
                  : ""}{" "}
                Alla erittely ja ne kerrat, jolloin edustaja poikkesi ryhmänsä
                enemmistöstä.
              </p>
              <div class="vote-bar">
                {s.nYes > 0 ? (
                  <span
                    class="v-jaa"
                    style={`width:${pctNum(s.nYes, s.nTotal)}%`}
                  >
                    Jaa {s.nYes}
                  </span>
                ) : null}
                {s.nAbsent > 0 ? (
                  <span
                    class="v-poi"
                    style={`width:${pctNum(s.nAbsent, s.nTotal)}%`}
                  >
                    Poissa {s.nAbsent}
                  </span>
                ) : null}
                {s.nNo > 0 ? (
                  <span
                    class="v-ei"
                    style={`width:${pctNum(s.nNo, s.nTotal)}%`}
                  ></span>
                ) : null}
              </div>
              <div class="vote-legend">
                <div class="vl">
                  <span class="sw" style="background:var(--hall)"></span>
                  <div>
                    <span class="vk">Jaa</span>
                    <span class="vv">{s.nYes}</span>
                  </div>
                </div>
                <div class="vl">
                  <span class="sw" style="background:var(--red)"></span>
                  <div>
                    <span class="vk">Ei</span>
                    <span class="vv">{s.nNo}</span>
                  </div>
                </div>
                <div class="vl">
                  <span class="sw" style="background:var(--opp)"></span>
                  <div>
                    <span class="vk">Tyhjää</span>
                    <span class="vv">{s.nEmpty}</span>
                  </div>
                </div>
                <div class="vl">
                  <span class="sw" style="background:var(--paper-3)"></span>
                  <div>
                    <span class="vk">Poissa</span>
                    <span class="vv">{s.nAbsent}</span>
                  </div>
                </div>
              </div>
              {data.dissents.length > 0 ? (
                <div class="dissent">
                  <div class="dissent__lead mt-24">
                    <span
                      class="tag tag--opp"
                      style="border-color:transparent;background:var(--red);color:#fff"
                    >
                      {data.dissents[0].mpVote === "Jaa"
                        ? "Jaa-äänet"
                        : data.dissents[0].mpVote === "Tyhjää"
                          ? "Tyhjää"
                          : "Ei-äänet"}
                    </span>{" "}
                    <b>
                      Kaikki {data.dissents.length} kertaa, jolloin edustaja
                      poikkesi ryhmänsä enemmistöstä
                    </b>
                  </div>
                  {data.dissents.map((d) => (
                    <div class="vote-row">
                      <div class="vote-row__badge">{esc(d.mpVote)}</div>
                      <div>
                        <div class="vote-row__title">
                          {esc(d.title || d.sectionTitle)}
                        </div>
                        <div class="vote-row__sub">
                          {d.startTime ? (
                            <span class="date">{formatDate(d.startTime)}</span>
                          ) : null}
                          {d.sectionTitle ? (
                            <>
                              <span>·</span>
                              <span>{esc(d.sectionTitle)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {sourceNote({
                dataset: "Eduskunnan avoin data · Vote",
                fetchedAt: data.fetchedAt,
              })}
            </section>

            {data.initiatives.length > 0 || data.questions.length > 0 ? (
              <section class="psec">
                <Kicker text="Aloitteet &amp; kysymykset · kuluva kausi" />
                <div class="psec__h">
                  <h2>Mitä edustaja on nostanut esiin</h2>
                  <span class="meta">
                    {s.nInitiatives} aloitetta · {s.nWrittenQuestions} kysymystä
                  </span>
                </div>
                <p class="psec__intro">
                  Edustajan omat aloitteet (ensimmäisenä allekirjoittajana) ja
                  kirjalliset kysymykset ministereille — konkreettinen jälki
                  siitä, mihin hän on halunnut vaikuttaa.
                </p>
                {data.initiatives.slice(0, 5).map((init) => (
                  <a class="act-row" href={`/asiakirja/${init.documentId}`}>
                    <div class="act-row__id">
                      {esc(init.parliamentIdentifier)}
                    </div>
                    <div>
                      <div class="act-row__title">{esc(init.title ?? "")}</div>
                      <div class="act-row__sub">
                        {esc(init.initiativeTypeLabel)}
                        {init.relationRole === "first_signer"
                          ? " · ensimmäinen allekirjoittaja"
                          : " · allekirjoittaja"}
                      </div>
                    </div>
                    <div class="act-row__date">
                      {init.submissionDate
                        ? formatDate(init.submissionDate)
                        : ""}
                    </div>
                  </a>
                ))}
                {data.questions.slice(0, 5).map((q) => (
                  <a
                    class="act-row"
                    href={
                      q.documentId ? `/asiakirja/${q.documentId}` : undefined
                    }
                  >
                    <div class="act-row__id">{esc(q.parliamentIdentifier)}</div>
                    <div>
                      <div class="act-row__title">{esc(q.title ?? "")}</div>
                      <div class="act-row__sub">{esc(q.questionKindLabel)}</div>
                    </div>
                    <div class="act-row__date">
                      {q.submissionDate ? formatDate(q.submissionDate) : ""}
                    </div>
                  </a>
                ))}
                {sourceNote({
                  dataset: "Eduskunnan avoin data · VaskiData",
                  fetchedAt: data.fetchedAt,
                })}
              </section>
            ) : null}

            {data.committees.length > 0 ? (
              <section class="psec">
                <Kicker text="Valiokunnat &amp; toimielimet" />
                <div class="psec__h">
                  <h2>Jäsenyydet</h2>
                  <span class="meta">
                    {data.committees.filter((c) => !c.endDate).length} voimassa
                  </span>
                </div>
                <div class="committee-list">
                  {data.committees.map((c) => (
                    <div class="committee-row">
                      <span class="cname">{esc(c.committeeName)}</span>
                      <span
                        class={clsx("crole", {
                          lead: [
                            "jäsen",
                            "puheenjohtaja",
                            "varapuheenjohtaja",
                          ].includes(c.role.toLowerCase()),
                        })}
                      >
                        {esc(c.role)}
                        {c.startDate
                          ? ` · alkaen ${formatDate(c.startDate)}`
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
                {sourceNote({
                  dataset: "Eduskunnan avoin data · Committee",
                  fetchedAt: data.fetchedAt,
                })}
              </section>
            ) : null}
          </div>

          <aside>
            {data.focusAreas.length > 0 ? (
              <div class="rail__item" style="padding-top:0">
                <Kicker text="Teemat · mistä edustaja puhuu ja kysyy" />
                <p style="font-size:13px;color:var(--muted);margin:0 0 14px">
                  Kirjallisten kysymysten ja puheenvuorojen aiheet —
                  painotettuna kuinka usein.
                </p>
                <div class="topics">
                  {data.focusAreas.map((area) => (
                    <span
                      class={clsx("topic-tag", {
                        lg: area.weight >= topicLgThreshold,
                      })}
                    >
                      {esc(area.label)}
                      <span class="tc">{area.weight}</span>
                    </span>
                  ))}
                </div>
                {sourceNote({
                  dataset: "Eduskunnan avoin data · WrittenQuestion, Speech",
                  fetchedAt: data.fetchedAt,
                })}
              </div>
            ) : null}

            {data.speeches.length > 0 ? (
              <div class="rail__item">
                <Kicker text="Viimeisimmät puheenvuorot" />
                <p style="font-size:13px;color:var(--muted);margin:0 0 6px">
                  Mistä asioista
                </p>
                {data.speeches.map((sp) => (
                  <div class="spoke-row">
                    <div class="st">{esc(sp.sectionTitle ?? "")}</div>
                    <div class="sd">
                      {sp.startTime
                        ? `${formatDate(sp.startTime)}${sp.speechType ? ` · ${esc(sp.speechType)}` : ""}`
                        : sp.speechType
                          ? esc(sp.speechType)
                          : ""}
                    </div>
                  </div>
                ))}
                {sourceNote({
                  dataset: `Speech · ${p.firstName} ${p.lastName}`,
                  fetchedAt: data.fetchedAt,
                })}
              </div>
            ) : null}

            <div class="rail__item">
              <Kicker text="Perustiedot" />
              <dl style="display:grid;grid-template-columns:auto 1fr;gap:9px 18px;margin:6px 0 0">
                {p.birthYear ? (
                  <>
                    <dt style="font-size:13px;color:var(--muted)">Ikä</dt>
                    <dd style="margin:0;font-size:14px;color:var(--ink)">
                      {esc(p.age)} v. (s. {p.birthYear})
                    </dd>
                  </>
                ) : null}
                <dt style="font-size:13px;color:var(--muted)">Vaalipiiri</dt>
                <dd style="margin:0;font-size:14px;color:var(--ink)">
                  {esc(p.currentDistrict)}
                </dd>
                {p.profession ? (
                  <>
                    <dt style="font-size:13px;color:var(--muted)">Ammatti</dt>
                    <dd style="margin:0;font-size:14px;color:var(--ink)">
                      {esc(p.profession)}
                    </dd>
                  </>
                ) : null}
                <dt style="font-size:13px;color:var(--muted)">Ryhmä</dt>
                <dd style="margin:0;font-size:14px;color:var(--ink)">
                  {esc(p.partyName)}
                </dd>
                {p.memberSince ? (
                  <>
                    <dt style="font-size:13px;color:var(--muted)">
                      Eduskunnassa
                    </dt>
                    <dd style="margin:0;font-size:14px;color:var(--ink)">
                      {esc(p.memberSince)}
                    </dd>
                  </>
                ) : null}
                <dt style="font-size:13px;color:var(--muted)">Asema</dt>
                <dd
                  style={`margin:0;font-size:14px;color:${p.isInGovernment ? "var(--hall)" : "var(--opp)"}`}
                >
                  {blocLabel}
                </dd>
              </dl>
              {sourceNote({
                dataset: `MemberOfParliament · ${p.id}`,
                fetchedAt: data.fetchedAt,
              })}
            </div>

            {data.baselines ? (
              <div class="rail__item">
                <Kicker text="Vertailu keskiarvoihin" />
                <p style="font-size:13px;color:var(--muted);margin:0 0 6px">
                  Edustajan luvut vs. eduskunnan ja puolueen keskiarvot
                </p>
                <dl style="display:grid;grid-template-columns:auto 1fr;gap:6px 18px;margin:6px 0 0">
                  <dt style="font-size:12.5px;color:var(--muted)">
                    Puheenvuorot
                  </dt>
                  <dd style="margin:0;font-size:13px;color:var(--ink)">
                    {data.baselines.speech.own} (edusk.{" "}
                    {data.baselines.speech.parliamentAvg.toFixed(0)}, puol.{" "}
                    {data.baselines.speech.partyAvg.toFixed(0)})
                  </dd>
                  <dt style="font-size:12.5px;color:var(--muted)">Aloitteet</dt>
                  <dd style="margin:0;font-size:13px;color:var(--ink)">
                    {data.baselines.initiative.own} (edusk.{" "}
                    {data.baselines.initiative.parliamentAvg.toFixed(0)}, puol.{" "}
                    {data.baselines.initiative.partyAvg.toFixed(0)})
                  </dd>
                  <dt style="font-size:12.5px;color:var(--muted)">
                    Kysymykset
                  </dt>
                  <dd style="margin:0;font-size:13px;color:var(--ink)">
                    {data.baselines.writtenQuestion.own} (edusk.{" "}
                    {data.baselines.writtenQuestion.parliamentAvg.toFixed(0)},
                    puol. {data.baselines.writtenQuestion.partyAvg.toFixed(0)})
                  </dd>
                  <dt style="font-size:12.5px;color:var(--muted)">
                    Osallistuminen
                  </dt>
                  <dd style="margin:0;font-size:13px;color:var(--ink)">
                    {data.baselines.participation.own} % (edusk.{" "}
                    {data.baselines.participation.parliamentAvg} %, puol.{" "}
                    {data.baselines.participation.partyAvg} %)
                  </dd>
                </dl>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}
