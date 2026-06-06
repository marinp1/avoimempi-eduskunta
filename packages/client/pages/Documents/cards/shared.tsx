import { Event as EventIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors } from "#client/theme/index";
import { formatDateFi } from "#client/utils/date-time";
import {
  isEduskuntaOfficialUrl,
  isSafeExternalUrl,
  toEduskuntaUrl,
} from "#client/utils/eduskunta-links";
import { apiFetch } from "#client/utils/fetch";

/**
 * Extracts expert name+role and organization from the structured title field.
 * Title format: "{bill} {committee_abbr} {DD.MM.YYYY} {expert[, org]} Asiantuntijalausunto"
 */
export type ParsedExpertInfo = { expert: string; organization: string | null };
export const parseExpertInfo = (
  title: string | null,
): ParsedExpertInfo | null => {
  if (!title) return null;
  const withoutSuffix = title
    .replace(/\s*Asiantuntijalausunnon?\s+liite\s*$/i, "")
    .replace(/\s*Asiantuntijalausunto\s*$/i, "")
    .trim();
  const dateMatch = withoutSuffix.match(/\d{2}\.\d{2}\.\d{4}\s+(.+)$/);
  if (!dateMatch) return null;
  const rest = dateMatch[1].trim();
  const commaMatch = rest.match(/^(.+?)\s*,\s*(.+)$/);
  if (commaMatch) {
    return { expert: commaMatch[1].trim(), organization: commaMatch[2].trim() };
  }
  return { expert: rest, organization: null };
};

export const buildKysymysPdfUrl = (
  identifier: string | null,
): string | null => {
  if (!identifier) return null;
  const m = identifier.match(/^(KKV?)\s+(\d+)\/(\d{4})\s+vp$/i);
  if (!m) return null;
  return toEduskuntaUrl(
    `/FI/vaski/Kysymys/Documents/${m[1].toUpperCase()}_${parseInt(m[2], 10)}+${m[3]}.pdf`,
  );
};

export const buildEdkDocumentUrl = (
  edkIdentifier: string | null | undefined,
): string | null => {
  if (!edkIdentifier) return null;
  return toEduskuntaUrl(
    `/FI/vaski/JulkaisuMetatieto/Documents/${edkIdentifier}.pdf`,
  );
};

export const formatDate = (dateStr: string | null) =>
  formatDateFi(dateStr, "—");

export const getOutcomeColor = (code: string | null): string => {
  if (!code) return colors.dataBorder;
  const normalized = code.toLowerCase();
  if (
    normalized.includes("hyväk") ||
    normalized.includes("myön") ||
    normalized.includes("accept") ||
    normalized.includes("passed")
  ) {
    return colors.success;
  }
  if (
    normalized.includes("hylä") ||
    normalized.includes("reject") ||
    normalized.includes("kiel")
  ) {
    return colors.error;
  }
  return colors.dataBorder;
};

/** Shared paper-document card styles for skeuomorphic stacked-papers look */
export const paperDocumentSx = {
  position: "relative" as const,
  backgroundColor: "#fff",
  borderRadius: "4px",
  border: `1px solid ${colors.dataBorder}`,
  boxShadow:
    "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.03)",
  transition: "box-shadow 0.2s ease, transform 0.2s ease",
  "&:hover": {
    boxShadow:
      "0 2px 6px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.05)",
    transform: "translateY(-1px)",
  },
  /* Stacked-papers effect: two pseudo-element "pages" behind */
  "&::before, &::after": {
    content: '""',
    position: "absolute",
    left: 4,
    right: 4,
    height: 6,
    bottom: -4,
    backgroundColor: "#fff",
    border: `1px solid ${colors.dataBorder}`,
    borderTop: "none",
    borderRadius: "0 0 4px 4px",
    zIndex: -1,
  },
  "&::after": {
    left: 8,
    right: 8,
    bottom: -7,
    height: 4,
    opacity: 0.7,
  },
};

/** Accent color per document type category for card left-border */
export const DOCUMENT_TYPE_ACCENT: Record<string, string> = {
  // Questions
  interpellations: colors.info,
  "written-questions": colors.info,
  "written-question-responses": colors.info,
  "oral-questions": colors.info,
  // Proposals & initiatives
  "government-proposals": colors.chartPurple,
  "legislative-initiatives-law": colors.chartPurple,
  "legislative-initiatives-budget": colors.chartPurple,
  "legislative-initiatives-supplementary-budget": colors.chartPurple,
  "legislative-initiatives-action": colors.chartPurple,
  "legislative-initiatives-discussion": colors.chartPurple,
  "legislative-initiatives-citizens": colors.chartPurple,
  // Reports & statements
  "committee-reports": colors.accent,
  "expert-statements": colors.accent,
  // Answers
  "parliament-answers": colors.success,
};

/** Short abbreviation for document type badge */
export const DOCUMENT_TYPE_ABBR: Record<string, string> = {
  interpellations: "VK",
  "government-proposals": "HE",
  "written-questions": "KK",
  "written-question-responses": "KKV",
  "oral-questions": "SKT",
  "committee-reports": "VM",
  "legislative-initiatives-law": "LA",
  "legislative-initiatives-budget": "TAA",
  "legislative-initiatives-supplementary-budget": "LTA",
  "legislative-initiatives-action": "TPA",
  "legislative-initiatives-discussion": "KA",
  "legislative-initiatives-citizens": "KAA",
  "expert-statements": "AL",
  "parliament-answers": "EV",
};

export const getCommitteeReportKind = (
  reportTypeCode: string | null | undefined,
): "report" | "statement" | null => {
  if (!reportTypeCode) return null;
  const normalized = reportTypeCode.trim().toUpperCase();
  if (normalized.endsWith("VM")) return "report";
  if (normalized.endsWith("VL")) return "statement";
  return null;
};

type RelatedSessionItem = {
  session_key: string;
  session_date: string;
  session_type: string;
  session_number: number;
  session_year: string;
  section_title: string | null;
  section_key: string;
};

type DataLink = ApiRouteResponse<`/api/sections/:id/links`>[number];
type DataSubsection = ApiRouteResponse<`/api/sections/:id/subsections`>[number];

export function InlineRelatedSessions({
  sessions,
}: {
  sessions: RelatedSessionItem[];
}) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const { openDrawer } = useOverlayDrawer();

  if (sessions.length === 0) return null;

  return (
    <Box>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
        <EventIcon sx={{ color: colors.primary, fontSize: 18 }} />
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, color: colors.textPrimary }}
        >
          {tDocuments("relatedSessions")}
        </Typography>
      </Stack>
      <Stack spacing={0.75}>
        {sessions.map((session) => {
          return (
            <Box
              key={session.section_key}
              sx={{
                p: 1,
                borderLeft: `3px solid ${colors.primaryLight}`,
                borderRadius: 1,
                backgroundColor: colors.backgroundSubtle,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: colors.primary,
                    flex: 1,
                    minWidth: 140,
                  }}
                >
                  {session.session_type} {session.session_number}/
                  {session.session_year} — {formatDate(session.session_date)}
                </Typography>
                <Button
                  size="small"
                  sx={{ textTransform: "none" }}
                  onClick={() => {
                    openDrawer({
                      drawerKey: `related-session:${session.section_key}`,
                      title: tDocuments("relatedSessions"),
                      subtitle: `${session.session_type} ${session.session_number}/${session.session_year}`,
                      meta: (
                        <Typography
                          variant="caption"
                          sx={{ color: colors.textSecondary }}
                        >
                          {formatDate(session.session_date)}
                        </Typography>
                      ),
                      content: (
                        <RelatedSessionDrawerContent
                          sectionKey={session.section_key}
                        />
                      ),
                    });
                  }}
                >
                  {tCommon("openDetails")}
                </Button>
                <Button
                  size="small"
                  sx={{ textTransform: "none" }}
                  endIcon={<EventIcon sx={{ fontSize: 14 }} />}
                  onClick={() => {
                    window.history.pushState(
                      {},
                      "",
                      `/istunnot?date=${session.session_date}`,
                    );
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                >
                  {tDocuments("openSession")}
                </Button>
              </Box>
              {session.section_title && (
                <Typography
                  variant="caption"
                  sx={{ color: colors.textSecondary }}
                >
                  {session.section_title}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

function RelatedSessionDrawerContent({ sectionKey }: { sectionKey: string }) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<{
    votings: DatabaseTables.Voting[];
    links: DataLink[];
    subsections: DataSubsection[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/sections/${encodeURIComponent(sectionKey)}/votings`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      apiFetch(`/api/sections/${encodeURIComponent(sectionKey)}/links`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      apiFetch(`/api/sections/${encodeURIComponent(sectionKey)}/subsections`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
    ])
      .then(([votings, links, subsections]) => {
        if (!cancelled) {
          setDetails({ votings, links, subsections });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={14} />
        <Typography variant="caption" sx={{ color: colors.textSecondary }}>
          {tDocuments("loadingSessionDetails")}
        </Typography>
      </Box>
    );
  }

  if (!details) {
    return (
      <Typography variant="body2" sx={{ color: colors.textSecondary }}>
        {tCommon("noData")}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      <Typography variant="caption" sx={{ color: colors.textSecondary }}>
        {tDocuments("inlineCounts", {
          votings: details.votings.length,
          links: details.links.length,
          subsections: details.subsections.length,
        })}
      </Typography>
      {details.votings.length > 0 && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {details.votings.slice(0, 10).map((voting) => (
            <Chip
              key={voting.id}
              size="small"
              variant="outlined"
              label={`${voting.id}: ${voting.n_yes}-${voting.n_no}`}
              sx={{ height: 22, fontSize: "0.7rem" }}
            />
          ))}
          {details.votings.length > 10 && (
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              {tDocuments("moreVotings", {
                count: details.votings.length - 10,
              })}
            </Typography>
          )}
        </Box>
      )}
      {details.subsections.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.35 }}>
          {details.subsections.slice(0, 6).map((subsection) => (
            <Typography
              key={subsection.id}
              variant="body2"
              sx={{ color: colors.textSecondary }}
            >
              {subsection.item_title ||
                subsection.related_document_identifier ||
                subsection.content_text ||
                tDocuments("subsectionFallback")}
            </Typography>
          ))}
        </Box>
      )}
      {details.links.length > 0 && (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {details.links.slice(0, 8).map((link) =>
            isEduskuntaOfficialUrl(link.url) ? (
              <EduskuntaSourceLink
                key={link.id}
                href={link.url as string}
                sx={{ fontSize: "0.75rem" }}
              >
                {link.document_tunnus ||
                  link.label ||
                  tDocuments("documentLink")}
              </EduskuntaSourceLink>
            ) : (
              <Chip
                key={link.id}
                size="small"
                component="a"
                clickable
                href={
                  isSafeExternalUrl(link.url)
                    ? (link.url ?? undefined)
                    : undefined
                }
                target="_blank"
                rel="noopener noreferrer"
                label={
                  link.document_tunnus ||
                  link.label ||
                  tDocuments("documentLink")
                }
                sx={{ height: 22, fontSize: "0.7rem" }}
              />
            ),
          )}
          {details.links.length > 8 && (
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              {tDocuments("moreLinks", {
                count: details.links.length - 8,
              })}
            </Typography>
          )}
        </Box>
      )}
    </Stack>
  );
}
