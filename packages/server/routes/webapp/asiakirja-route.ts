import Asiakirja, {
  type AsiakirjaViewModel,
  type TextSection,
  type Signatory,
  type Law,
} from "../../../webapp/templates/pages/asiakirja";
import {
  partyColor,
  fetchedAt,
  formatFi,
} from "../../../webapp/templates/helpers";
import { richTextToHtml } from "../../../webapp/templates/components/rich-text";
import { renderFullPage } from "../../../webapp/eta";
import { page, getWebappContext, getRouteParam, isHtmx } from "./helpers";
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
        const rawId = getRouteParam(req, "id") ?? "";
        if (!rawId || !/^\d+$/.test(rawId)) {
          return notFoundResponse(req);
        }
        const id = rawId;

        const url = new URL(req.url);
        const kind = url.searchParams.get("kind") ?? "kk";

        const builder = KIND_BUILDERS[kind];
        const data = builder ? builder(id, deps) : null;
        if (!data) return notFoundResponse(req);

        const { tlData } = getWebappContext(req, deps);
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
  const htmx = isHtmx(req);
  const fragment = `<title>Sivua ei löydy — Eduskuntapeili</title>
<div class="wrap">
  <section class="page-head">
    <h1>Sivua ei löydy</h1>
    <p class="sub">Asiakirjaa ei löytynyt tietokannasta.</p>
    <p><a href="/asiakirjat">Palaa asiakirjoihin</a></p>
  </section>
</div>`;
  const body = htmx
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

function mapSessions(
  detail: Record<string, unknown>,
): AsiakirjaViewModel["sessions"] {
  const sessions = (detail.sessions ?? []) as Array<Record<string, unknown>>;
  return sessions.map((s) => ({
    sessionKey: String(s.session_key ?? ""),
    sessionDate: String(s.session_date ?? ""),
    sessionNumber: Number(s.session_number ?? 0),
    sessionYear: String(s.session_year ?? ""),
    sectionTitle: s.section_title ? String(s.section_title) : null,
  }));
}

function mapSubjects(detail: Record<string, unknown>): string[] {
  const raw = detail.subjects;
  if (!raw) return [];
  if (Array.isArray(raw))
    return (raw as Array<{ subject_text?: string } | string>)
      .map((s) => (typeof s === "string" ? s : (s.subject_text ?? "")))
      .filter(Boolean);
  if (typeof raw === "string") return raw.split("||").filter(Boolean);
  return [];
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

  const lifecycleStages: AsiakirjaViewModel["lifecycleStages"] = [];
  if (submissionDate) {
    lifecycleStages.push({
      step: 1,
      label: "Kysymys jätetty",
      date: submissionDate,
      done: true,
    });
  }
  const rawStages = (detail as Record<string, unknown>).stages as
    | Array<Record<string, unknown>>
    | undefined;
  if (rawStages) {
    for (const s of rawStages) {
      lifecycleStages.push({
        step: lifecycleStages.length + 1,
        label: (s.stage_title || s.event_title || "Käsittelyvaihe") as string,
        date: (s.event_date as string) ?? null,
        done: true,
      });
    }
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

  const rawSigners =
    ((detail as Record<string, unknown>).signers as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const signatories: Signatory[] = rawSigners.map((s) => ({
    name:
      ([s.first_name, s.last_name].filter(Boolean).join(" ") as string) ||
      "Tuntematon",
    role: s.is_first_signer ? "Ensimmäinen allekirjoittaja" : "Allekirjoittaja",
    party: (s.party as string) ?? null,
    partyColor: s.party ? partyColor(s.party as string) : null,
    personId: (s.person_id as number) ?? null,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
  const lifecycleStages = buildLifecycleFromStages(
    ((detail as Record<string, unknown>).stages as
      | Array<Record<string, unknown>>
      | undefined) ?? [],
  );

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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
  const lifecycleStages = buildLifecycleFromStages(
    ((detail as Record<string, unknown>).stages as
      | Array<Record<string, unknown>>
      | undefined) ?? [],
  );

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

  const rawSigners =
    ((detail as Record<string, unknown>).signers as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const signatories: Signatory[] = rawSigners.map((s) => ({
    name:
      ([s.first_name, s.last_name].filter(Boolean).join(" ") as string) ||
      "Tuntematon",
    role: s.is_first_signer ? "Ensimmäinen allekirjoittaja" : "Allekirjoittaja",
    party: (s.party as string) ?? null,
    partyColor: s.party ? partyColor(s.party as string) : null,
    personId: (s.person_id as number) ?? null,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
  const lifecycleStages = buildLifecycleFromStages(
    ((detail as Record<string, unknown>).stages as
      | Array<Record<string, unknown>>
      | undefined) ?? [],
  );

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

  const rawSignatories =
    ((detail as Record<string, unknown>).signatories as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const signatories: Signatory[] = rawSignatories.map((s) => ({
    name:
      ([s.first_name, s.last_name].filter(Boolean).join(" ") as string) ||
      "Tuntematon",
    role: (s.title_text as string) ?? null,
    party: null,
    partyColor: null,
    personId: null,
  }));

  const rawLaws =
    ((detail as Record<string, unknown>).laws as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const laws: Law[] = rawLaws.map((l) => ({
    order: l.law_order as number,
    type: (l.law_type as string) ?? null,
    name: (l.law_name as string) ?? null,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
  const lifecycleStages = buildLifecycleFromStages(
    ((detail as Record<string, unknown>).stages as
      | Array<Record<string, unknown>>
      | undefined) ?? [],
  );

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

  const rawSigners =
    ((detail as Record<string, unknown>).signers as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const signatories: Signatory[] = rawSigners.map((s) => ({
    name:
      ([s.first_name, s.last_name].filter(Boolean).join(" ") as string) ||
      "Tuntematon",
    role: s.is_first_signer ? "Ensimmäinen allekirjoittaja" : "Allekirjoittaja",
    party: (s.party as string) ?? null,
    partyColor: s.party ? partyColor(s.party as string) : null,
    personId: (s.person_id as number) ?? null,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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

  const rawMembers =
    ((detail as Record<string, unknown>).members as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const rawExperts =
    ((detail as Record<string, unknown>).experts as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const signatories: Signatory[] = [
    ...rawMembers.map((m) => ({
      name:
        ([m.first_name, m.last_name].filter(Boolean).join(" ") as string) ||
        "Tuntematon",
      role: (m.role as string) ?? "Jäsen",
      party: (m.party as string) ?? null,
      partyColor: m.party ? partyColor(m.party as string) : null,
      personId: (m.person_id as number) ?? null,
    })),
    ...rawExperts.map((e) => ({
      name:
        ([e.first_name, e.last_name].filter(Boolean).join(" ") as string) ||
        "Tuntematon",
      role: (e.title as string) ?? (e.organization as string) ?? "Asiantuntija",
      party: null,
      partyColor: null,
      personId: (e.person_id as number) ?? null,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
    fetchedAt: fetchedAt(),
  };
}

function buildLifecycleFromStages(
  stages: Array<Record<string, unknown>>,
): AsiakirjaViewModel["lifecycleStages"] {
  const result: AsiakirjaViewModel["lifecycleStages"] = [];
  for (const s of stages) {
    result.push({
      step: result.length + 1,
      label: String(s.stage_title || s.event_title || "Käsittelyvaihe"),
      date: (s.event_date as string) ?? null,
      done: true,
    });
  }
  return result;
}
