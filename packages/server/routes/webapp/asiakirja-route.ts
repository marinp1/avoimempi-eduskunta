import Asiakirja, {
  type AsiakirjaViewModel,
  type TextSection,
  type Signatory,
  type Law,
} from "../../../webapp/templates/pages/asiakirja";
import { partyColor } from "../../../webapp/templates/helpers";
import { richTextToHtml } from "../../../webapp/templates/components/rich-text";
import { renderFullPage } from "../../../webapp/eta";
import { page, getTimelineData } from "./helpers";
import type { WebappDeps } from "./deps";

const KIND_TO_LABEL: Record<string, string> = {
  kk: "Kirjallinen kysymys",
  suullinen: "Suullinen kysymys",
  valikysymys: "Välikysymys",
  he: "Hallituksen esitys",
  aloite: "Lakialoite",
  mietinto: "Mietintö",
  vastaus: "Kirjallinen vastaus",
  "vastaus-edk": "Eduskunnan vastaus",
};

const LA_LABELS: Record<string, string> = {
  LA: "Lakialoite",
  TPA: "Toimenpidealoite",
  RA: "Rahoitusaloite",
  A: "Aloite",
};

const REPORT_LABELS: Record<string, string> = {
  M: "Mietintö",
  L: "Lausunto",
};

export function createAsiakirjaRoute(deps: WebappDeps) {
  return {
    "/asiakirja/:id": {
      GET: (req: Request) => {
        const rawId = (req as any).params.id;
        if (!rawId || !/^\d+$/.test(rawId)) {
          return notFoundResponse(req);
        }
        const id = rawId;

        const url = new URL(req.url);
        const kind = url.searchParams.get("kind") ?? "kk";

        const builder = KIND_BUILDERS[kind];
        const data = builder ? builder(id, deps) : null;
        if (!data) return notFoundResponse(req);

        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        return page(
          req,
          Asiakirja({ data }),
          "/asiakirjat",
          data.identifier,
          tlData,
        );
      },
    },
  } as const;
}

type BuilderFn = (id: string, deps: WebappDeps) => AsiakirjaViewModel | null;

function notFoundResponse(req: Request): Response {
  const isHtmx = req.headers.get("HX-Request") === "true";
  const fragment = `<title>Sivua ei löydy — Eduskuntapeili</title>
<div class="wrap">
  <section class="page-head">
    <h1>Sivua ei löydy</h1>
    <p class="sub">Asiakirjaa ei löytynyt tietokannasta.</p>
    <p><a href="/asiakirjat" style="color:var(--blue)">Palaa asiakirjoihin</a></p>
  </section>
</div>`;
  const body = isHtmx
    ? fragment
    : renderFullPage(fragment, {
        activePath: "/asiakirjat",
        title: "Sivua ei löydy",
      });
  return new Response(body, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", Vary: "HX-Request" },
  });
}

const KIND_BUILDERS: Record<string, BuilderFn> = {
  kk: buildWrittenQuestion,
  suullinen: buildOralQuestion,
  valikysymys: buildInterpellation,
  he: buildGovernmentProposal,
  aloite: buildLegislativeInitiative,
  mietinto: buildCommitteeReport,
  vastaus: buildWrittenQuestion,
  "vastaus-edk": buildParliamentAnswer,
};

// ─── Shared helpers ───────────────────────────────────────

function formatFi(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

function authorsByName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first, last].filter(Boolean).join(" ") || "Tuntematon";
}

function initialsFrom(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return (
    `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase() || "?"
  );
}

function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  const parts = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()].filter(Boolean);
}

function buildTextSection(
  heading: string,
  plainText: string | null | undefined,
  richTextJson: string | null | undefined,
): TextSection | null {
  const html = richTextToHtml(richTextJson);
  const paragraphs = splitParagraphs(plainText);
  if (!html && paragraphs.length === 0) return null;
  return { heading, paragraphs, html: html || null };
}

function textCharCount(sections: TextSection[]): number {
  return sections.reduce(
    (sum, s) => sum + s.paragraphs.reduce((ss, p) => ss + p.length, 0),
    0,
  );
}

function fetchedAt(): string {
  return new Date().toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapSessions(detail: any): AsiakirjaViewModel["sessions"] {
  return ((detail as any).sessions ?? []).map((s: any) => ({
    sessionKey: s.session_key,
    sessionDate: s.session_date,
    sessionNumber: s.session_number,
    sessionYear: s.session_year,
    sectionTitle: s.section_title ?? null,
  }));
}

function mapSubjects(detail: any): string[] {
  const raw = (detail as any).subjects;
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.map((s: any) => s.subject_text ?? s).filter(Boolean);
  if (typeof raw === "string") return raw.split("||").filter(Boolean);
  return [];
}

function stagesFromDb(detail: any): any[] {
  return (detail as any).stages ?? [];
}

function buildLifecycleFromStages(
  stages: any[],
  extras?: Array<{ label: string; date: string | null; tag?: string }>,
): AsiakirjaViewModel["lifecycleStages"] {
  const result: AsiakirjaViewModel["lifecycleStages"] = [];
  for (const s of stages) {
    result.push({
      step: result.length + 1,
      label: s.stage_title || s.event_title || "Käsittelyvaihe",
      date: s.event_date ?? null,
      done: true,
    });
  }
  if (extras) {
    for (const e of extras) {
      result.push({
        step: result.length + 1,
        label: e.label,
        date: e.date,
        done: true,
        tag: e.tag,
      });
    }
  }
  return result;
}

function mpDistrict(
  personId: number | null | undefined,
  deps: WebappDeps,
): string | null {
  if (!personId) return null;
  const districts = deps.personRepository.fetchRepresentativeDistricts({
    id: String(personId),
  });
  const current = districts.find((d) => !d.end_date);
  return (
    (current?.district_name ?? districts[0]?.district_name ?? null)
      ?.replace(/ vaalipiiri$/, "")
      ?.replace(/n$/, "") ?? null
  );
}

// ─── Kind-specific builders ────────────────────────────────

function buildWrittenQuestion(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchWrittenQuestionById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const answerDate = detail.answer_date ?? null;
  const stages = stagesFromDb(detail);

  const lifecycleStages: AsiakirjaViewModel["lifecycleStages"] = [];
  if (submissionDate) {
    lifecycleStages.push({
      step: 1,
      label: "Kysymys jätetty",
      date: submissionDate,
      done: true,
    });
  }
  for (const s of stages) {
    lifecycleStages.push({
      step: lifecycleStages.length + 1,
      label: s.stage_title || s.event_title || "Käsittelyvaihe",
      date: s.event_date ?? null,
      done: true,
    });
  }
  if (answerDate) {
    lifecycleStages.push({
      step: lifecycleStages.length + 1,
      label: "Ministerin vastaus",
      date: answerDate,
      done: true,
      tag: "vastattu",
    });
  }

  const textSections: TextSection[] = [];
  const qs = buildTextSection(
    "Kysymys",
    detail.question_text,
    detail.question_rich_text,
  );
  if (qs) textSections.push(qs);

  const signers = (detail as any).signers ?? [];
  const signatories: Signatory[] = signers.map((s: any) => ({
    name: [s.first_name, s.last_name].filter(Boolean).join(" ") || "Tuntematon",
    role: s.is_first_signer ? "Ensimmäinen allekirjoittaja" : "Allekirjoittaja",
    party: s.party ?? null,
    partyColor: s.party ? partyColor(s.party) : null,
    personId: s.person_id ?? null,
  }));

  const authorParty = detail.first_signer_party ?? "";
  return {
    kind: "kk",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: KIND_TO_LABEL.kk!,
    title: detail.title ?? "",
    authorName: authorsByName(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorRole: "Kansanedustaja",
    authorParty,
    authorPartyColor: partyColor(authorParty),
    authorPersonId: detail.first_signer_person_id,
    authorInitials: initialsFrom(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorDistrict: mpDistrict(detail.first_signer_person_id, deps),
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: "Jätetty",
    secondaryDate: answerDate ? formatFi(answerDate) : null,
    secondaryDateLabel: answerDate ? "Vastattu" : null,
    statusLabel: answerDate
      ? "Vastattu " + formatFi(answerDate)
      : submissionDate
        ? "Jätetty " + formatFi(submissionDate)
        : "Vireillä",
    statusColor: answerDate ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: answerDate !== null,
    answerIdentifier: detail.answer_parliament_identifier,
    answerDate,
    answerMinisterTitle: detail.answer_minister_title,
    answerMinisterName:
      authorsByName(
        detail.answer_minister_first_name,
        detail.answer_minister_last_name,
      ) || null,
    signatories,
    laws: [],
    sourceReference: null,
    subjects: mapSubjects(detail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail),
    fetchedAt: fetchedAt(),
  };
}

function buildOralQuestion(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchOralQuestionById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(stagesFromDb(detail));

  const textSections: TextSection[] = [];
  const qs = buildTextSection("Suullinen kysymys", detail.question_text, null);
  if (qs) textSections.push(qs);

  const author = detail.asker_text ?? "";

  return {
    kind: "suullinen",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: KIND_TO_LABEL.suullinen!,
    title: detail.title ?? "",
    authorName: author || "Tuntematon",
    authorRole: null,
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: author ? author.slice(0, 2).toUpperCase() : "?",
    authorDistrict: null,
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: "Jätetty",
    secondaryDate: null,
    secondaryDateLabel: null,
    statusLabel: detail.decision_outcome
      ? "Käsitelty"
      : submissionDate
        ? "Jätetty " + formatFi(submissionDate)
        : "Vireillä",
    statusColor: detail.decision_outcome ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories: [],
    laws: [],
    sourceReference: null,
    subjects: mapSubjects(detail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail),
    fetchedAt: fetchedAt(),
  };
}

function buildInterpellation(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchInterpellationById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(stagesFromDb(detail));

  const textSections: TextSection[] = [];
  const qs = buildTextSection(
    "Välikysymys",
    detail.question_text,
    detail.question_rich_text,
  );
  if (qs) textSections.push(qs);
  const rs = buildTextSection(
    "Ponsi",
    detail.resolution_text,
    detail.resolution_rich_text,
  );
  if (rs) textSections.push(rs);

  const signers = (detail as any).signers ?? [];
  const signatories: Signatory[] = signers.map((s: any) => ({
    name: [s.first_name, s.last_name].filter(Boolean).join(" ") || "Tuntematon",
    role: s.is_first_signer ? "Ensimmäinen allekirjoittaja" : "Allekirjoittaja",
    party: s.party ?? null,
    partyColor: s.party ? partyColor(s.party) : null,
    personId: s.person_id ?? null,
  }));

  const authorParty = detail.first_signer_party ?? "";
  return {
    kind: "valikysymys",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: KIND_TO_LABEL.valikysymys!,
    title: detail.title ?? "",
    authorName: authorsByName(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorRole: "Kansanedustaja",
    authorParty,
    authorPartyColor: partyColor(authorParty),
    authorPersonId: detail.first_signer_person_id,
    authorInitials: initialsFrom(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorDistrict: mpDistrict(detail.first_signer_person_id, deps),
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: "Jätetty",
    secondaryDate: null,
    secondaryDateLabel: null,
    statusLabel: detail.decision_outcome ? "Käsitelty" : "Vireillä",
    statusColor: detail.decision_outcome ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories,
    laws: [],
    sourceReference: null,
    subjects: mapSubjects(detail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail),
    fetchedAt: fetchedAt(),
  };
}

function buildGovernmentProposal(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchGovernmentProposalById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(stagesFromDb(detail));

  const textSections: TextSection[] = [];
  const sum = buildTextSection(
    "Tiivistelmä",
    detail.summary_text,
    detail.summary_rich_text,
  );
  if (sum) textSections.push(sum);
  const jst = buildTextSection(
    "Perustelut",
    detail.justification_text,
    detail.justification_rich_text,
  );
  if (jst) textSections.push(jst);
  const prop = buildTextSection(
    "Ehdotus",
    detail.proposal_text,
    detail.proposal_rich_text,
  );
  if (prop) textSections.push(prop);
  const app = buildTextSection(
    "Liite",
    detail.appendix_text,
    detail.appendix_rich_text,
  );
  if (app) textSections.push(app);

  const rawSignatories = (detail as any).signatories ?? [];
  const signatories: Signatory[] = rawSignatories.map((s: any) => ({
    name: [s.first_name, s.last_name].filter(Boolean).join(" ") || "Tuntematon",
    role: s.title_text ?? null,
    party: null,
    partyColor: null,
    personId: null,
  }));

  const rawLaws = (detail as any).laws ?? [];
  const laws: Law[] = rawLaws.map((l: any) => ({
    order: l.law_order,
    type: l.law_type ?? null,
    name: l.law_name ?? null,
  }));

  const author = detail.author ?? "";
  return {
    kind: "he",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: KIND_TO_LABEL.he!,
    title: detail.title ?? "",
    authorName: author || "Tuntematon",
    authorRole: "Ministeriö",
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: author ? author.slice(0, 2).toUpperCase() : "?",
    authorDistrict: null,
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: "Jätetty",
    secondaryDate: detail.signature_date
      ? formatFi(detail.signature_date)
      : null,
    secondaryDateLabel: detail.signature_date ? "Allekirjoitettu" : null,
    statusLabel: detail.decision_outcome ? "Käsitelty" : "Vireillä",
    statusColor: detail.decision_outcome ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories,
    laws,
    sourceReference: null,
    subjects: mapSubjects(detail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail),
    fetchedAt: fetchedAt(),
  };
}

function buildLegislativeInitiative(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchLegislativeInitiativeById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const typeCode = detail.initiative_type_code ?? "";
  const lifecycleStages = buildLifecycleFromStages(stagesFromDb(detail));

  const textSections: TextSection[] = [];
  const jst = buildTextSection(
    "Perustelut",
    detail.justification_text,
    detail.justification_rich_text,
  );
  if (jst) textSections.push(jst);
  const prop = buildTextSection(
    "Ehdotus",
    detail.proposal_text,
    detail.proposal_rich_text,
  );
  if (prop) textSections.push(prop);
  const law = buildTextSection(
    "Lakiteksti",
    detail.law_text,
    detail.law_rich_text,
  );
  if (law) textSections.push(law);

  const signers = (detail as any).signers ?? [];
  const signatories: Signatory[] = signers.map((s: any) => ({
    name: [s.first_name, s.last_name].filter(Boolean).join(" ") || "Tuntematon",
    role: s.is_first_signer ? "Ensimmäinen allekirjoittaja" : "Allekirjoittaja",
    party: s.party ?? null,
    partyColor: s.party ? partyColor(s.party) : null,
    personId: s.person_id ?? null,
  }));

  const authorParty = detail.first_signer_party ?? "";
  const label = LA_LABELS[typeCode] ?? "Aloite";
  return {
    kind: "aloite",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: label,
    title: detail.title ?? "",
    authorName: authorsByName(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorRole: "Kansanedustaja",
    authorParty,
    authorPartyColor: partyColor(authorParty),
    authorPersonId: detail.first_signer_person_id,
    authorInitials: initialsFrom(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorDistrict: mpDistrict(detail.first_signer_person_id, deps),
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: "Jätetty",
    secondaryDate: null,
    secondaryDateLabel: null,
    statusLabel: detail.decision_outcome ? "Käsitelty" : "Vireillä",
    statusColor: detail.decision_outcome ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories,
    laws: [],
    sourceReference: null,
    subjects: mapSubjects(detail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail),
    fetchedAt: fetchedAt(),
  };
}

function buildCommitteeReport(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchCommitteeReportById({ id });
  if (!detail) return null;

  const signatureDate = detail.signature_date ?? detail.draft_date ?? "";
  const reportType = REPORT_LABELS[detail.report_type_code ?? ""] ?? "Mietintö";

  const textSections: TextSection[] = [];
  const sum = buildTextSection(
    "Tiivistelmä",
    detail.summary_text,
    detail.summary_rich_text,
  );
  if (sum) textSections.push(sum);
  const gen = buildTextSection(
    "Yleisperustelut",
    detail.general_reasoning_text,
    detail.general_reasoning_rich_text,
  );
  if (gen) textSections.push(gen);
  const det = buildTextSection(
    "Yksityiskohtaiset perustelut",
    detail.detailed_reasoning_text,
    detail.detailed_reasoning_rich_text,
  );
  if (det) textSections.push(det);
  const dec = buildTextSection(
    "Päätösehdotus",
    detail.decision_text,
    detail.decision_rich_text,
  );
  if (dec) textSections.push(dec);
  const amd = buildTextSection(
    "Lainsäädäntömuutos",
    detail.legislation_amendment_text,
    detail.legislation_amendment_rich_text,
  );
  if (amd) textSections.push(amd);
  const min = buildTextSection(
    "Eriävä mielipide",
    detail.minority_opinion_text,
    detail.minority_opinion_rich_text,
  );
  if (min) textSections.push(min);
  const res = buildTextSection(
    "Ponsi",
    detail.resolution_text,
    detail.resolution_rich_text,
  );
  if (res) textSections.push(res);

  const members = (detail as any).members ?? [];
  const experts = (detail as any).experts ?? [];
  const signatories: Signatory[] = [
    ...members.map((m: any) => ({
      name:
        [m.first_name, m.last_name].filter(Boolean).join(" ") || "Tuntematon",
      role: m.role ?? "Jäsen",
      party: m.party ?? null,
      partyColor: m.party ? partyColor(m.party) : null,
      personId: m.person_id ?? null,
    })),
    ...experts.map((e: any) => ({
      name:
        [e.first_name, e.last_name].filter(Boolean).join(" ") || "Tuntematon",
      role: e.title ?? e.organization ?? "Asiantuntija",
      party: null,
      partyColor: null,
      personId: e.person_id ?? null,
    })),
  ];

  const committee = detail.committee_name ?? "";
  return {
    kind: "mietinto",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: reportType,
    title: detail.title ?? "",
    authorName: committee || "Tuntematon",
    authorRole: "Valiokunta",
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: committee ? committee.slice(0, 2).toUpperCase() : "?",
    authorDistrict: null,
    primaryDate: formatFi(signatureDate),
    primaryDateLabel: "Annettu",
    secondaryDate: detail.draft_date ? formatFi(detail.draft_date) : null,
    secondaryDateLabel: detail.draft_date ? "Luonnos" : null,
    statusLabel: "Annettu",
    statusColor: "var(--hall)",
    textSections,
    lifecycleStages: [],
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories,
    laws: [],
    sourceReference: detail.source_reference ?? null,
    subjects: mapSubjects(detail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail),
    fetchedAt: fetchedAt(),
  };
}

function buildParliamentAnswer(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchParliamentAnswerById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? detail.signature_date ?? "";

  const textSections: TextSection[] = [];
  const dec = buildTextSection(
    "Päätös",
    detail.decision_text,
    detail.decision_rich_text,
  );
  if (dec) textSections.push(dec);
  const leg = buildTextSection(
    "Lainsäädäntö",
    detail.legislation_text,
    detail.legislation_rich_text,
  );
  if (leg) textSections.push(leg);

  return {
    kind: "vastaus-edk",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: KIND_TO_LABEL["vastaus-edk"]!,
    title: detail.title ?? "",
    authorName: "Eduskunta",
    authorRole: null,
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: "E",
    authorDistrict: null,
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: "Annettu",
    secondaryDate: detail.signature_date
      ? formatFi(detail.signature_date)
      : null,
    secondaryDateLabel: detail.signature_date ? "Allekirjoitettu" : null,
    statusLabel: "Annettu",
    statusColor: "var(--hall)",
    textSections,
    lifecycleStages: [],
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories: [],
    laws: [],
    sourceReference:
      detail.source_reference ?? detail.committee_report_reference ?? null,
    subjects: mapSubjects(detail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail),
    fetchedAt: fetchedAt(),
  };
}
