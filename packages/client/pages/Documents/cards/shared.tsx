import {
  Event as EventIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { colors } from "#client/theme/index";
import { formatDateFi } from "#client/utils/date-time";
import {
  isEduskuntaOfficialUrl,
  toEduskuntaUrl,
} from "#client/utils/eduskunta-links";

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

export function InlineRelatedSessions({
  sessions,
}: {
  sessions: RelatedSessionItem[];
}) {
  const { t } = useTranslation();
  const [expandedSectionKey, setExpandedSectionKey] = useState<string | null>(
    null,
  );
  const [loadingBySection, setLoadingBySection] = useState<
    Record<string, boolean>
  >({});
  const [detailsBySection, setDetailsBySection] = useState<
    Record<
      string,
      {
        votings: Array<{
          id: number;
          number: number;
          start_time: string | null;
          title: string | null;
          section_title: string | null;
          n_yes: number;
          n_no: number;
          n_total: number;
        }>;
        links: Array<{
          id: number;
          label: string | null;
          url: string | null;
          document_tunnus: string | null;
        }>;
        subsections: Array<{
          id: number;
          item_title: string | null;
          content_text: string | null;
          related_document_identifier: string | null;
        }>;
      }
    >
  >({});

  const fetchSessionSectionDetails = (sectionKey: string) => {
    if (loadingBySection[sectionKey] || detailsBySection[sectionKey]) return;
    setLoadingBySection((prev) => ({ ...prev, [sectionKey]: true }));
    Promise.all([
      fetch(`/api/sections/${encodeURIComponent(sectionKey)}/votings`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(`/api/sections/${encodeURIComponent(sectionKey)}/links`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(`/api/sections/${encodeURIComponent(sectionKey)}/subsections`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
    ])
      .then(([votings, links, subsections]) => {
        setDetailsBySection((prev) => ({
          ...prev,
          [sectionKey]: { votings, links, subsections },
        }));
      })
      .finally(() => {
        setLoadingBySection((prev) => ({ ...prev, [sectionKey]: false }));
      });
  };

  if (sessions.length === 0) return null;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <EventIcon sx={{ color: colors.primary }} />
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, color: colors.textPrimary }}
        >
          {t("documents.relatedSessions", "Liittyvät istunnot")}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        {sessions.map((session) => {
          const isExpanded = expandedSectionKey === session.section_key;
          const details = detailsBySection[session.section_key];
          const loading = !!loadingBySection[session.section_key];
          return (
            <Box
              key={session.section_key}
              sx={{
                p: 1,
                borderLeft: `3px solid ${colors.primary}`,
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
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 14,
                        transform: isExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  }
                  onClick={() => {
                    const next = isExpanded ? null : session.section_key;
                    setExpandedSectionKey(next);
                    if (next) fetchSessionSectionDetails(next);
                  }}
                >
                  {isExpanded ? "Piilota tiedot" : "Näytä tiedot"}
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
                  Avaa istunto
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
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box
                  sx={{
                    mt: 1,
                    p: 1,
                    border: `1px solid ${colors.dataBorder}`,
                    borderRadius: 1,
                  }}
                >
                  {loading && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={14} />
                      <Typography
                        variant="caption"
                        sx={{ color: colors.textSecondary }}
                      >
                        Ladataan istunnon tietoja...
                      </Typography>
                    </Box>
                  )}
                  {!loading && details && (
                    <Stack spacing={1}>
                      <Typography
                        variant="caption"
                        sx={{ color: colors.textSecondary }}
                      >
                        Äänestyksiä: {details.votings.length} ·
                        Asiakirjalinkkejä: {details.links.length} · Alakohtia:{" "}
                        {details.subsections.length}
                      </Typography>
                      {details.votings.length > 0 && (
                        <Box
                          sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}
                        >
                          {details.votings.slice(0, 6).map((voting) => (
                            <Chip
                              key={voting.id}
                              size="small"
                              variant="outlined"
                              label={`${voting.id}: ${voting.n_yes}-${voting.n_no}`}
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          ))}
                          {details.votings.length > 6 && (
                            <Typography
                              variant="caption"
                              sx={{ color: colors.textSecondary }}
                            >
                              +{details.votings.length - 6} äänestystä
                            </Typography>
                          )}
                        </Box>
                      )}
                      {details.subsections.length > 0 && (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.25,
                          }}
                        >
                          {details.subsections.slice(0, 2).map((subsection) => (
                            <Typography
                              key={subsection.id}
                              variant="caption"
                              sx={{ color: colors.textSecondary }}
                            >
                              {subsection.item_title ||
                                subsection.related_document_identifier ||
                                subsection.content_text ||
                                "Alakohta"}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      {details.links.length > 0 && (
                        <Box
                          sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}
                        >
                          {details.links.slice(0, 4).map((link) =>
                            isEduskuntaOfficialUrl(link.url) ? (
                              <EduskuntaSourceLink
                                key={link.id}
                                href={link.url as string}
                                sx={{ fontSize: "0.65rem" }}
                              >
                                {link.document_tunnus ||
                                  link.label ||
                                  "Asiakirjalinkki"}
                              </EduskuntaSourceLink>
                            ) : (
                              <Chip
                                key={link.id}
                                size="small"
                                component="a"
                                clickable
                                href={link.url || undefined}
                                target="_blank"
                                rel="noopener noreferrer"
                                label={
                                  link.document_tunnus ||
                                  link.label ||
                                  "Asiakirjalinkki"
                                }
                                sx={{ height: 20, fontSize: "0.65rem" }}
                              />
                            ),
                          )}
                          {details.links.length > 4 && (
                            <Typography
                              variant="caption"
                              sx={{ color: colors.textSecondary }}
                            >
                              +{details.links.length - 4} linkkiä
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Stack>
                  )}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
