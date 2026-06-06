import Asiakirja, {
  type AsiakirjaViewModel,
} from "../../../webapp/templates/pages/asiakirja";
import { partyColor } from "../../../webapp/templates/helpers";
import { page, getTimelineData } from "./helpers";
import type { WebappDeps } from "./deps";

interface StageRow {
  question_id: number;
  stage_order: number;
  stage_title: string;
  stage_code: string | null;
  event_date: string | null;
  event_title: string | null;
  event_description: string | null;
}

export function createAsiakirjaRoute(deps: WebappDeps) {
  return {
    "/asiakirja/:id": {
      GET: (req: Request) => {
        const id = (req as any).params.id;
        if (!id || !/^\d+$/.test(id)) {
          return new Response("Not found", { status: 404 });
        }

        const detail = deps.documentRepository.fetchWrittenQuestionById({ id });
        if (!detail) {
          return new Response("Not found", { status: 404 });
        }

        const stages: StageRow[] = (detail as any).stages ?? [];
        const subjects: string[] = ((detail as any).subjects ?? []).map(
          (s: { subject_text: string }) => s.subject_text,
        );

        const parsedStages = stages.map((s) => ({
          stage_order: s.stage_order,
          stage_title: s.stage_title,
          stage_code: s.stage_code,
          event_date: s.event_date,
          event_title: s.event_title,
          event_description: s.event_description,
        }));

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

        const sentStage = parsedStages.find(
          (s) =>
            s.stage_title?.toLowerCase().includes("lähetetty") ||
            s.event_title?.toLowerCase().includes("lähetetty") ||
            s.stage_code === "VK" ||
            s.stage_code === "LA",
        );

        if (sentStage?.event_date) {
          lifecycleStages.push({
            step: lifecycleStages.length + 1,
            label:
              sentStage.event_title ||
              sentStage.stage_title ||
              "Lähetetty käsittelyyn",
            date: sentStage.event_date,
            done: true,
          });
        } else if (parsedStages.length > 0) {
          for (const s of parsedStages) {
            lifecycleStages.push({
              step: lifecycleStages.length + 1,
              label: s.stage_title || s.event_title || "Käsittelyvaihe",
              date: s.event_date,
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

        const authorParty = detail.first_signer_party ?? "";
        const authorPartyColor = partyColor(authorParty);
        const authorName =
          [detail.first_signer_first_name, detail.first_signer_last_name]
            .filter(Boolean)
            .join(" ") || "Tuntematon";

        const authorInitials =
          `${detail.first_signer_first_name?.charAt(0) ?? ""}${detail.first_signer_last_name?.charAt(0) ?? ""}`.toUpperCase() ||
          "?";

        let authorDistrict: string | null = null;
        if (detail.first_signer_person_id) {
          const districts = deps.personRepository.fetchRepresentativeDistricts({
            id: String(detail.first_signer_person_id),
          });
          const current = districts.find((d) => !d.end_date);
          authorDistrict =
            current?.district_name
              ?.replace(/ vaalipiiri$/, "")
              ?.replace(/n$/, "") ??
            districts[0]?.district_name ??
            null;
        }

        const questionText = detail.question_text ?? "";
        const questionParagraphs = questionText
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter(Boolean);

        if (questionParagraphs.length === 0 && questionText.trim()) {
          questionParagraphs.push(questionText.trim());
        }

        const charCount = questionText.length;

        const statusLabel = answerDate
          ? "Vastattu " + formatFi(answerDate)
          : submissionDate
            ? "Jätetty " + formatFi(submissionDate)
            : "Vireillä";
        const statusColor = answerDate ? "var(--hall)" : "var(--muted)";

        const signatureText = [
          submissionDate ? `Helsingissä ${formatFi(submissionDate)}` : "",
          authorDistrict ?? "",
        ]
          .filter(Boolean)
          .join(" · ");

        const answerMinisterName =
          [detail.answer_minister_first_name, detail.answer_minister_last_name]
            .filter(Boolean)
            .join(" ") || null;

        const fetchedAt = new Date().toLocaleString("fi-FI", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const data: AsiakirjaViewModel = {
          id: detail.id,
          identifier: detail.parliament_identifier,
          documentType: "Kirjallinen kysymys",
          title: detail.title ?? "",
          authorName,
          authorParty,
          authorPartyColor,
          authorPersonId: detail.first_signer_person_id,
          authorInitials,
          authorDistrict,
          submissionDate: formatFi(submissionDate),
          statusLabel,
          statusColor,
          lifecycleStages,
          questionParagraphs,
          signatureText,
          hasAnswer: answerDate !== null,
          answerIdentifier: detail.answer_parliament_identifier,
          answerDate,
          answerMinisterTitle: detail.answer_minister_title,
          answerMinisterName,
          answerText: null,
          subjects,
          charCount,
          fetchedAt,
        };

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

function formatFi(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}
