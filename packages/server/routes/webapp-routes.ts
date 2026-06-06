import { createHash } from "node:crypto";
import {
  fragmentResponse,
  htmlResponse,
  renderFullPage,
} from "../../webapp/eta";
import {
  applyFilters,
  partyColor,
  partyShortName,
  type RosterParams,
} from "../../webapp/templates/helpers";
import Aanestykset from "../../webapp/templates/pages/aanestykset";
import Analytiikka from "../../webapp/templates/pages/analytiikka";
import Asiakirjat from "../../webapp/templates/pages/asiakirjat";
import Edustajat from "../../webapp/templates/pages/edustajat";
import Hallitukset from "../../webapp/templates/pages/hallitukset";
import Home from "../../webapp/templates/pages/home";
import Istunnot from "../../webapp/templates/pages/istunnot";
import Muutokset from "../../webapp/templates/pages/muutokset";
import Puolueet from "../../webapp/templates/pages/puolueet";
import RosterContent from "../../webapp/templates/pages/roster-content";
import Edustaja, {
  type PersonProfileData,
} from "../../webapp/templates/pages/edustaja";
import type { HomeRepository } from "../database/repositories/home-repository";
import type { PersonRepository } from "../database/repositories/person-repository";

// ── Build setup.ts and CSS once at module load (top-level await, ESM) ─────────

const setupJsPath = new URL("../../webapp/src/setup.ts", import.meta.url)
  .pathname;
const cssPath = new URL("../../webapp/src/styles.css", import.meta.url)
  .pathname;

const setupBuild = await Bun.build({
  entrypoints: [setupJsPath],
  target: "browser",
  minify: process.env.NODE_ENV === "production",
});

if (!setupBuild.success) {
  for (const log of setupBuild.logs) console.error("[webapp build]", log);
}

const setupJs = setupBuild.success
  ? await setupBuild.outputs[0].text()
  : `console.error("webapp/setup.js build failed")`;

const cssBuild = await Bun.build({
  entrypoints: [cssPath],
  target: "browser",
  minify: process.env.NODE_ENV === "production",
});

if (!cssBuild.success) {
  for (const log of cssBuild.logs) console.error("[webapp css build]", log);
}

const cssText = cssBuild.success
  ? await cssBuild.outputs[0].text()
  : await Bun.file(cssPath).text();

// Content-fingerprint both assets into a single version token.
// The layout embeds ?v=<hash> in asset URLs so browsers can cache them
// indefinitely (immutable) and automatically bust the cache on redeploy.
const assetVersion = createHash("sha256")
  .update(cssText)
  .update(setupJs)
  .digest("hex")
  .slice(0, 8);

// ── Static asset responses ────────────────────────────────────────────────────

const ASSET_CACHE = "public, max-age=31536000, immutable";
const NO_CACHE = "no-store";

const assetCacheControl =
  process.env.NODE_ENV === "production" ? ASSET_CACHE : NO_CACHE;

function jsAsset() {
  return new Response(setupJs, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": assetCacheControl,
    },
  });
}

function cssAsset() {
  return new Response(cssText, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": assetCacheControl,
    },
  });
}

// ── Page helper ───────────────────────────────────────────────────────────────

function page(
  req: Request,
  fragment: string,
  activePath: string,
  title?: string,
): Response {
  return htmlResponse(req, fragment, { activePath, title, assetVersion });
}

function personNotFoundResponse(req: Request, path: string): Response {
  const isHtmx = req.headers.get("HX-Request") === "true";
  const fragment = notFoundFragment(path);
  const body = isHtmx
    ? fragment
    : renderFullPage(fragment, {
        activePath: "/edustajat",
        title: "Sivua ei löydy",
        assetVersion,
      });
  return new Response(body, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Vary: "HX-Request",
    },
  });
}

function notFoundFragment(path: string): string {
  return `<title>Sivua ei löydy — Eduskuntapeili</title>
<section class="page-head wrap">
    <h1>Sivua ei löydy</h1>
    <p class="sub">Polkua <code>${path}</code> ei löydy.</p>
    <p><a href="/">Palaa etusivulle</a></p>
</section>`;
}

// ── Route maps ────────────────────────────────────────────────────────────────

export function createWebappStaticRoutes() {
  return {
    "/webapp/setup.js": jsAsset,
    "/webapp/styles.css": cssAsset,
  } as const;
}

export interface WebappDeps {
  homeRepository: HomeRepository;
  personRepository: PersonRepository;
}

export function createWebappPageRoutes(deps: WebappDeps) {
  return {
    "/": {
      GET: async (req: Request) => {
        const data = await deps.homeRepository.fetchOverview({});
        return page(req, Home({ title: "Etusivu", data }), "/", "Etusivu");
      },
    },
    "/edustajat": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const params: RosterParams = {
          q: url.searchParams.get("q") ?? undefined,
          party: url.searchParams.get("party") ?? undefined,
          bloc: url.searchParams.get("bloc") ?? undefined,
          sort: url.searchParams.get("sort") ?? undefined,
          dir: url.searchParams.get("dir") ?? undefined,
        };
        const allRows = deps.personRepository.fetchRoster();
        const filtered = applyFilters(allRows, params);
        const isHtmx = req.headers.get("HX-Request") === "true";
        const isBoosted = req.headers.get("HX-Boosted") === "true";
        // Filter/search request (not a full-page navigation): return only roster content
        if (isHtmx && !isBoosted) {
          return fragmentResponse(
            RosterContent({ allRows, filtered, params, oob: true }),
          );
        }
        return page(
          req,
          Edustajat({ title: "Kansanedustajat", allRows, filtered, params }),
          "/edustajat",
          "Kansanedustajat",
        );
      },
    },
    "/puolueet": {
      GET: (req: Request) =>
        page(req, Puolueet({ title: "Puolueet" }), "/puolueet", "Puolueet"),
    },
    "/istunnot": {
      GET: (req: Request) =>
        page(req, Istunnot({ title: "Istunnot" }), "/istunnot", "Istunnot"),
    },
    "/aanestykset": {
      GET: (req: Request) =>
        page(
          req,
          Aanestykset({ title: "Äänestykset" }),
          "/aanestykset",
          "Äänestykset",
        ),
    },
    "/asiakirjat": {
      GET: (req: Request) =>
        page(
          req,
          Asiakirjat({ title: "Asiakirjat" }),
          "/asiakirjat",
          "Asiakirjat",
        ),
    },
    "/hallitukset": {
      GET: (req: Request) =>
        page(
          req,
          Hallitukset({ title: "Hallitukset" }),
          "/hallitukset",
          "Hallitukset",
        ),
    },
    "/analytiikka": {
      GET: (req: Request) =>
        page(
          req,
          Analytiikka({ title: "Analytiikka" }),
          "/analytiikka",
          "Analytiikka",
        ),
    },
    "/muutokset": {
      GET: (req: Request) =>
        page(req, Muutokset({ title: "Muutokset" }), "/muutokset", "Muutokset"),
    },
    "/edustaja/:id": {
      GET: async (req: Request) => {
        const id = (req as any).params.id;
        if (!id || !/^\d+$/.test(id)) {
          return personNotFoundResponse(req, `/edustaja/${id}`);
        }

        const details = deps.personRepository.fetchRepresentativeDetails({
          id,
        });
        if (!details) {
          return personNotFoundResponse(req, `/edustaja/${id}`);
        }

        const [
          groupMemberships,
          districts,
          terms,
          votes,
          metrics,
          dissents,
          initiatives,
          questions,
          committees,
          focusAreas,
          speeches,
        ] = await Promise.all([
          deps.personRepository.fetchPersonGroupMemberships({ id }),
          deps.personRepository.fetchRepresentativeDistricts({ id }),
          deps.personRepository.fetchPersonTerms({ id }),
          deps.personRepository.fetchPersonVotes({ id }),
          deps.personRepository.fetchPersonMetricsWithBaselines({
            personId: id,
          }),
          deps.personRepository.fetchPersonDissents({
            personId: id,
            limit: 20,
          }),
          deps.personRepository.fetchPersonInitiatives({
            personId: id,
            limit: 10,
          }),
          deps.personRepository.fetchPersonQuestions({
            personId: id,
            limit: 10,
          }),
          deps.personRepository.fetchPersonCommittees({ personId: id }),
          deps.personRepository.fetchPersonFocusAreas({
            personId: id,
            topN: 12,
          }),
          deps.personRepository.fetchPersonSpeeches({
            personId: id,
            limit: 10,
          }),
        ]);

        // Determine current party and government status
        const currentGroup = groupMemberships.find(
          (g) =>
            !g.end_date || g.end_date >= new Date().toISOString().slice(0, 10),
        );
        const partyCode =
          currentGroup?.group_abbreviation ?? details.party ?? "unknown";
        const isInGovernment = groupMemberships.some((g) => !g.end_date);

        const currentDistrict = districts.find((d) => !d.end_date);
        const districtName =
          currentDistrict?.district_name ?? districts[0]?.district_name ?? "";

        const firstTerm = terms[0];
        const memberSince = firstTerm?.start_year
          ? `vuodesta ${firstTerm.start_year}`
          : firstTerm?.start_date
            ? `vuodesta ${new Date(firstTerm.start_date).getFullYear()}`
            : "";

        // Compute vote breakdown
        const nTotal = votes.length;
        const nYes = votes.filter((v) => v.vote === "Jaa").length;
        const nNo = votes.filter((v) => v.vote === "Ei").length;
        const nEmpty = votes.filter((v) => v.vote === "Tyhjää").length;
        const nAbsent = votes.filter((v) => v.vote === "Poissa").length;
        const nCast = nYes + nNo + nEmpty;
        const participationPct =
          nTotal > 0 ? ((nCast / nTotal) * 100).toFixed(1) : "0";

        const metricsPerson = metrics.person;
        const nInitiatives = metricsPerson?.initiative_count ?? 0;
        const nWrittenQuestions = metricsPerson?.written_question_count ?? 0;

        const firstName = details.first_name ?? "";
        const lastName = details.last_name ?? "";
        const initials =
          `${firstName.charAt(0) ?? ""}${lastName.charAt(0) ?? ""}`.toUpperCase();
        const age = details.birth_year
          ? String(new Date().getFullYear() - details.birth_year)
          : "—";
        const profession = details.profession ?? "";
        const partyName = partyShortName(partyCode, partyCode);
        const color = partyColor(partyCode);

        const INITIATIVE_LABELS: Record<string, string> = {
          LA: "Lakialoite",
          TPA: "Toimenpidealoite",
          RA: "Rahoitusaloite",
          A: "Aloite",
        };
        const QUESTION_LABELS: Record<string, string> = {
          written_question: "Kirjallinen kysymys",
          interpellation: "Välikysymys",
          oral_question: "Suullinen kysymys",
        };

        const baselinesParty = metrics.party;
        const baselinesParliament = metrics.parliament;
        const baselines =
          baselinesParty && baselinesParliament
            ? {
                speech: {
                  own: metricsPerson?.speech_count ?? 0,
                  partyAvg: baselinesParty.avgSpeechCount,
                  parliamentAvg: baselinesParliament.avgSpeechCount,
                },
                initiative: {
                  own: metricsPerson?.initiative_count ?? 0,
                  partyAvg: baselinesParty.avgInitiativeCount,
                  parliamentAvg: baselinesParliament.avgInitiativeCount,
                },
                writtenQuestion: {
                  own: metricsPerson?.written_question_count ?? 0,
                  partyAvg: baselinesParty.avgWrittenQuestionCount,
                  parliamentAvg: baselinesParliament.avgWrittenQuestionCount,
                },
                participation: {
                  own: participationPct,
                  partyAvg: (
                    baselinesParty.avgVoteParticipationRate * 100
                  ).toFixed(1),
                  parliamentAvg: (
                    baselinesParliament.avgVoteParticipationRate * 100
                  ).toFixed(1),
                },
              }
            : null;

        const fetchedAt = new Date().toLocaleString("fi-FI", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const capabilities = deps.personRepository.fetchPersonCapabilities({
          personId: id,
        });

        const data: PersonProfileData = {
          person: {
            id: details.person_id,
            firstName,
            lastName,
            initials: initials || "—",
            partyCode,
            partyName,
            partyColor: color,
            isInGovernment,
            currentDistrict: districtName,
            birthYear: details.birth_year,
            age,
            profession,
            memberSince,
          },
          stats: {
            participationPct,
            nTotal,
            nCast,
            nYes,
            nNo,
            nEmpty,
            nAbsent,
            nInitiatives,
            nWrittenQuestions,
          },
          dissents: dissents.map((d) => ({
            votingId: d.voting_id,
            startTime: d.start_time,
            title: d.title ?? "",
            sectionTitle: d.section_title ?? "",
            mpVote: d.mp_vote ?? "",
            majorityVote: d.majority_vote ?? "",
            partyName: d.party_name ?? "",
          })),
          initiatives: initiatives.map((i) => ({
            parliamentIdentifier: i.parliament_identifier ?? "",
            initiativeTypeCode: i.initiative_type_code ?? "",
            initiativeTypeLabel:
              INITIATIVE_LABELS[i.initiative_type_code ?? ""] ?? "Aloite",
            title: i.title ?? "",
            submissionDate: i.submission_date ?? null,
            relationRole: i.relation_role ?? "",
          })),
          questions: questions.map((q) => ({
            questionKind: q.question_kind ?? "",
            questionKindLabel:
              QUESTION_LABELS[q.question_kind ?? ""] ?? q.question_kind ?? "",
            parliamentIdentifier: q.parliament_identifier ?? "",
            title: q.title ?? "",
            submissionDate: q.submission_date ?? null,
          })),
          committees: committees.map((c) => ({
            committeeCode: c.committee_code ?? "",
            committeeName: c.committee_name ?? "",
            role: c.role ?? "",
            startDate: c.start_date ?? "",
            endDate: c.end_date ?? null,
          })),
          focusAreas: focusAreas.areas.map((a) => ({
            label: a.label,
            weight: a.weight,
          })),
          speeches: speeches.speeches.slice(0, 10).map((sp) => ({
            sectionTitle: sp.section_title ?? null,
            startTime: sp.start_time ?? null,
            speechType: sp.speech_type ?? null,
          })),
          baselines,
          hasAiSummary: capabilities.hasAiSummary,
          fetchedAt,
        };

        return page(
          req,
          Edustaja({ data }),
          "/edustajat",
          `${firstName} ${lastName}`,
        );
      },
    },
    "/laadunvalvonta": {
      GET: (req: Request) =>
        htmlResponse(
          req,
          `<title>Laadunvalvonta — Eduskuntapeili</title>
<section class="page-hero"><h1>Laadunvalvonta</h1></section>`,
          {
            activePath: "/laadunvalvonta",
            title: "Laadunvalvonta",
            assetVersion,
          },
        ),
    },
  } as const;
}
