import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EventIcon from "@mui/icons-material/Event";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TimelineIcon from "@mui/icons-material/Timeline";
import ViewListIcon from "@mui/icons-material/ViewList";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  InputAdornment,
  Link,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { DocumentCard, RelatedVotings } from "#client/components/DocumentCards";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { useScopedTranslation } from "#client/i18n/scoped";
import { VotingSubRow } from "#client/components/VotingCard";
import {
  isDateWithinHallituskausi,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import type {
  MinutesContentReference,
  RollCallEntry,
  Section,
  SectionDocumentLink,
  SectionRollCallData,
  SessionWithSections,
  Speech,
  SpeechData,
  SubSection,
  Voting,
} from "#client/pages/Sessions/shared/types";
import {
  buildFallbackSubSections,
  buildValtiopaivaAsiakirjaUrl,
  compareMinutesItems,
  extractSectionDocRefs,
  formatVaskiAuthor,
  getSectionOrderLabel,
  isRollCallSection,
  parseMinutesContent,
  parseVaskiSubjects,
} from "#client/pages/Sessions/shared/utils";
import { refs } from "#client/references";
import { commonStyles } from "#client/theme";
import { DataCard, PageHeader } from "#client/theme/components";
import { colors } from "#client/theme/index";
import { useThemedColors } from "#client/theme/ThemeContext";
import {
  formatDateLongFi,
  formatDateTimeCompactFi,
  formatTimeFi,
} from "#client/utils/date-time";
import {
  isEduskuntaOfficialUrl,
  toEduskuntaUrl,
} from "#client/utils/eduskunta-links";
import { CalendarGrid } from "./components/CalendarGrid";
import { SessionSectionPanel } from "./components/SessionSectionPanel";

const SPEECH_PAGE_SIZE = 20;

type SectionLoadErrorKey =
  | "speeches"
  | "votings"
  | "links"
  | "subSections"
  | "rollCall";

const getInitialDate = (): string => {
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get("date");
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return dateParam;
  }
  return new Date().toISOString().split("T")[0];
};

const getInitialSessionKey = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get("session");
};

const getInitialSectionKey = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get("section");
};

export default () => {
  const { t: tApp } = useScopedTranslation("app");
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tErrors } = useScopedTranslation("errors");
  const { t: tHome } = useScopedTranslation("home");
  const { t: tSessions } = useScopedTranslation("sessions");
  const speechContentLatestLabel = (date: string) =>
    tSessions("speechContentLatest", { date });
  const themedColors = useThemedColors();
  const { selectedHallituskausi } = useHallituskausi();

  const [sessions, setSessions] = useState<SessionWithSections[]>([]);
  const [vaskiLatestSpeechDate, setVaskiLatestSpeechDate] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(getInitialDate());
  const [error, setError] = useState<string | null>(null);
  const [allValidDates, setAllValidDates] = useState<Set<string>>(new Set());
  const [datesLoading, setDatesLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "timeline">(
    "list",
  );

  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(),
  );
  const [sectionSpeechData, setSectionSpeechData] = useState<
    Record<number, SpeechData>
  >({});
  const [sectionVotings, setSectionVotings] = useState<
    Record<number, Voting[]>
  >({});
  const [sectionLinks, setSectionLinks] = useState<
    Record<string, SectionDocumentLink[]>
  >({});
  const [sectionRollCalls, setSectionRollCalls] = useState<
    Record<number, SectionRollCallData | null>
  >({});
  const [sectionSubSections, setSectionSubSections] = useState<
    Record<number, SubSection[]>
  >({});
  const [loadingSpeeches, setLoadingSpeeches] = useState<Set<number>>(
    new Set(),
  );
  const [loadingVotings, setLoadingVotings] = useState<Set<number>>(new Set());
  const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());
  const [loadingRollCalls, setLoadingRollCalls] = useState<Set<number>>(
    new Set(),
  );
  const [loadingSubSections, setLoadingSubSections] = useState<Set<number>>(
    new Set(),
  );
  const [loadingMoreSpeeches, setLoadingMoreSpeeches] = useState<Set<number>>(
    new Set(),
  );
  const [sectionLoadErrors, setSectionLoadErrors] = useState<
    Record<number, Partial<Record<SectionLoadErrorKey, string>>>
  >({});
  const [focusedSessionKey, setFocusedSessionKey] = useState<string | null>(
    getInitialSessionKey(),
  );
  const [focusedSectionKey, setFocusedSectionKey] = useState<string | null>(
    getInitialSectionKey(),
  );
  const [expandedMinutesSessions, setExpandedMinutesSessions] = useState<
    Set<string>
  >(new Set());
  const [expandedAttachmentSessions, setExpandedAttachmentSessions] = useState<
    Set<string>
  >(new Set());

  const validDates = useMemo(() => {
    if (!selectedHallituskausi) return allValidDates;
    const filtered = Array.from(allValidDates).filter((item) =>
      isDateWithinHallituskausi(item, selectedHallituskausi),
    );
    return new Set(filtered);
  }, [allValidDates, selectedHallituskausi]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setExpandedSections(new Set());
        setLoadingSpeeches(new Set());
        setLoadingVotings(new Set());
        setLoadingLinks(new Set());
        setLoadingRollCalls(new Set());
        setLoadingSubSections(new Set());
        setSectionLoadErrors({});
        setSectionLinks({});
        setSectionRollCalls({});
        setSectionSubSections({});
        setExpandedMinutesSessions(new Set());
        setExpandedAttachmentSessions(new Set());
        if (!isDateWithinHallituskausi(date, selectedHallituskausi)) {
          setSessions([]);
          setVaskiLatestSpeechDate(null);
          return;
        }
        const res = await fetch(`/api/day/${date}/sessions`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload: {
          sessions: SessionWithSections[];
          vaskiLatestSpeechDate?: string | null;
        } = await res.json();
        setSessions(payload.sessions || []);
        setVaskiLatestSpeechDate(payload.vaskiLatestSpeechDate ?? null);
      } catch {
        setError(tErrors("loadSessionFailed"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date, selectedHallituskausi, tErrors]);

  useEffect(() => {
    const fetchValidDates = async () => {
      try {
        setDatesLoading(true);
        const response = await fetch("/api/session-dates");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: { date: string }[] = await response.json();
        setAllValidDates(new Set(data.map((item) => item.date)));
      } catch {
        // non-critical
      } finally {
        setDatesLoading(false);
      }
    };
    fetchValidDates();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setDate(getInitialDate());
      setFocusedSessionKey(getInitialSessionKey());
      setFocusedSectionKey(getInitialSectionKey());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const updateURL = (newDate: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("date", newDate);
    window.history.pushState({}, "", url.toString());
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    updateURL(newDate);
  };

  const isValidDate = (dateString: string): boolean =>
    validDates.has(dateString);

  const findNearestValidDates = (targetDate: string) => {
    const sortedDates = Array.from(validDates).sort();
    const target = new Date(targetDate).getTime();
    let before: string | null = null;
    let after: string | null = null;
    for (const dateStr of sortedDates) {
      const dateTime = new Date(dateStr).getTime();
      if (dateTime < target) {
        before = dateStr;
      } else if (dateTime > target && !after) {
        after = dateStr;
        break;
      }
    }
    return { before, after };
  };

  useEffect(() => {
    if (datesLoading) return;
    if (validDates.size === 0) return;
    if (isValidDate(date)) return;
    const { before, after } = findNearestValidDates(date);
    const fallback =
      after || before || Array.from(validDates).sort().at(-1) || null;
    if (fallback) {
      handleDateChange(fallback);
    }
  }, [date, datesLoading, validDates]);

  const formatDate = formatDateLongFi;
  const formatTime = formatTimeFi;

  const formatSpeechTimeRange = (speech: Speech) => {
    const start = formatTime(speech.start_time);
    if (start === "-") return null;
    const end = formatTime(speech.end_time);
    return end !== "-" ? `${start} - ${end}` : start;
  };

  const formatDateTime = formatDateTimeCompactFi;

  const renderVaskiInfo = (section: Section, compact = false) => {
    const hasAny =
      section.vaski_title ||
      section.vaski_document_type_name ||
      section.vaski_summary ||
      section.vaski_subjects ||
      section.vaski_author_first_name ||
      section.vaski_author_last_name ||
      section.vaski_eduskunta_tunnus;

    if (!hasAny) return null;

    const authorLine = formatVaskiAuthor(section);
    const subjects = parseVaskiSubjects(section.vaski_subjects);
    const docNumber =
      typeof section.vaski_document_number === "number" &&
      !Number.isNaN(section.vaski_document_number) &&
      section.vaski_parliamentary_year
        ? `${section.vaski_document_number}/${section.vaski_parliamentary_year}`
        : null;

    return (
      <Box
        sx={{
          mt: 0.75,
          p: 1,
          borderRadius: 1,
          border: `1px solid ${colors.primaryLight}25`,
          background: `${colors.primaryLight}08`,
        }}
      >
        <Typography
          sx={{
            ...commonStyles.compactTextMd,
            fontWeight: 700,
            color: colors.textTertiary,
            textTransform: "uppercase",
          }}
        >
          {tSessions("vaskiDocument")}
        </Typography>
        {(section.vaski_document_type_name ||
          section.vaski_document_type_code ||
          section.vaski_eduskunta_tunnus ||
          docNumber ||
          section.vaski_status ||
          section.vaski_creation_date) && (
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}>
            {(section.vaski_document_type_name ||
              section.vaski_document_type_code) && (
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textSecondary,
                }}
              >
                {tSessions("vaskiTypeLine", {
                  value:
                    section.vaski_document_type_name ||
                    section.vaski_document_type_code ||
                    tCommon("none"),
                })}
              </Typography>
            )}
            {section.vaski_eduskunta_tunnus && (
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textSecondary,
                }}
              >
                {tSessions("vaskiTunnusLine", {
                  value: section.vaski_eduskunta_tunnus,
                })}
              </Typography>
            )}
            {docNumber && (
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textSecondary,
                }}
              >
                {tSessions("vaskiDocNumberLine", { value: docNumber })}
              </Typography>
            )}
            {section.vaski_status && (
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textSecondary,
                }}
              >
                {tSessions("vaskiStatusLine", { value: section.vaski_status })}
              </Typography>
            )}
            {section.vaski_creation_date && (
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textSecondary,
                }}
              >
                {tSessions("vaskiCreatedLine", {
                  value: section.vaski_creation_date,
                })}
              </Typography>
            )}
          </Box>
        )}
        {section.vaski_title && (
          <Typography
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: colors.textPrimary,
              mt: 0.5,
            }}
          >
            {section.vaski_title}
          </Typography>
        )}
        {authorLine && (
          <Typography
            sx={{
              ...commonStyles.compactTextLg,
              color: colors.textSecondary,
              mt: 0.25,
            }}
          >
            {tSessions("vaskiAuthorLine", { value: authorLine })}
          </Typography>
        )}
        {section.vaski_source_reference && (
          <Typography
            sx={{
              ...commonStyles.compactTextLg,
              color: colors.textTertiary,
              mt: 0.25,
            }}
          >
            {tSessions("vaskiSourceReferenceLine", {
              value: section.vaski_source_reference,
            })}
          </Typography>
        )}
        {section.vaski_summary && (
          <Typography
            sx={{
              ...commonStyles.compactTextLg,
              color: colors.textSecondary,
              mt: 0.5,
              ...(compact
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
                : {}),
            }}
          >
            {tSessions("vaskiSummaryLine", { value: section.vaski_summary })}
          </Typography>
        )}
        {subjects.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
            <Typography
              sx={{
                ...commonStyles.compactTextLg,
                color: colors.textSecondary,
                mr: 0.5,
              }}
            >
              {tSessions("vaskiSubjects")}:
            </Typography>
            {subjects.map((subject) => (
              <Chip
                key={subject}
                label={subject}
                size="small"
                sx={{ fontSize: "0.625rem", height: 20 }}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderMinutesInfo = (section: Section, _compact = false) => {
    const isMergedValue = (value?: string | null) =>
      typeof value === "string" && value.includes(" | ");

    const minutesItemTitle = isMergedValue(section.minutes_item_title)
      ? null
      : section.minutes_item_title;
    const hasAny =
      minutesItemTitle ||
      section.minutes_processing_phase_code ||
      section.minutes_general_processing_phase_code;

    if (!hasAny) return null;

    return (
      <Box
        sx={{
          mt: 0.75,
          p: 1,
          borderRadius: 1,
          border: `1px solid ${colors.primaryLight}25`,
          background: `${colors.primaryLight}08`,
        }}
      >
        <Typography
          sx={{
            ...commonStyles.compactTextMd,
            fontWeight: 700,
            color: colors.textTertiary,
            textTransform: "uppercase",
          }}
        >
          {tSessions("minutesMetadata")}
        </Typography>
        {minutesItemTitle && minutesItemTitle !== section.title && (
          <Typography
            sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}
          >
            {tSessions("minutesItemTitleLine", { value: minutesItemTitle })}
          </Typography>
        )}
        {(section.minutes_processing_phase_code ||
          section.minutes_general_processing_phase_code) && (
          <Typography
            sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}
          >
            {tSessions("minutesProcessingCodesLine", {
              value: [
                section.minutes_processing_phase_code,
                section.minutes_general_processing_phase_code,
              ]
                .filter(Boolean)
                .join(" / "),
            })}
          </Typography>
        )}
      </Box>
    );
  };

  const getSectionSubSectionRows = (section: Section): SubSection[] => {
    const fromDb = sectionSubSections[section.id] || [];
    if (fromDb.length > 0) return fromDb;
    return buildFallbackSubSections(section);
  };

  const renderSectionMinutesContent = (section: Section) => {
    const subSectionRows = getSectionSubSectionRows(section);
    if (subSectionRows.length > 1) return null;

    const parsed = parseMinutesContent(section.minutes_content_text);
    const references: MinutesContentReference[] = [...parsed.references];
    const relatedDocument = section.minutes_related_document_identifier?.trim();
    if (
      relatedDocument &&
      !references.some(
        (reference) =>
          reference.code === relatedDocument && reference.vaskiId === null,
      )
    ) {
      references.unshift({ vaskiId: null, code: relatedDocument });
    }

    if (parsed.narrativeBlocks.length === 0 && references.length === 0)
      return null;

    const normalizeIdentifier = (value?: string | null) =>
      value?.trim().toLowerCase() || null;
    const rollCallData = sectionRollCalls[section.id];
    const knownRollCallIdentifiers = new Set<string>(
      [
        section.minutes_related_document_identifier,
        rollCallData?.report?.edk_identifier,
        rollCallData?.report?.parliament_identifier,
      ]
        .map((value) => normalizeIdentifier(value))
        .filter((value): value is string => value !== null),
    );
    const isReferenceMigratedAsRollCall = (
      reference: MinutesContentReference,
    ) => {
      const normalizedCode = normalizeIdentifier(reference.code);
      if (!normalizedCode) return false;
      if (!isRollCallSection(section)) return false;
      return knownRollCallIdentifiers.has(normalizedCode);
    };

    return (
      <Box
        sx={{
          mt: 1.5,
          pl: 2,
          borderLeft: `3px solid ${colors.primaryLight}40`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            mb: 1,
          }}
        >
          {tSessions("minutesContent")}
        </Typography>

        {parsed.narrativeBlocks.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {parsed.narrativeBlocks.map((block, index) => (
              <Typography
                key={`${section.key}-minutes-block-${index}`}
                sx={{
                  fontSize: "0.8125rem",
                  color: colors.textPrimary,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                }}
              >
                {block}
              </Typography>
            ))}
          </Box>
        )}

        {references.length > 0 && (
          <Box
            sx={{
              mt: parsed.narrativeBlocks.length > 0 ? 1 : 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 0.75,
              alignItems: "center",
            }}
          >
            {references.map((reference, index) => {
              if (!reference.code) return null;
              const href = buildValtiopaivaAsiakirjaUrl(reference.code);
              const migratedAsRollCall =
                isReferenceMigratedAsRollCall(reference);
              const tooltipTitle = migratedAsRollCall
                ? tSessions("minutesReferenceMigratedRollCall")
                : tSessions("minutesReferenceNotMigrated");
              const chipSx = {
                fontFamily: "monospace",
                ...commonStyles.compactTextLg,
                height: 24,
                ...(href
                  ? {
                      background: migratedAsRollCall
                        ? `${themedColors.success}15`
                        : `${colors.primaryLight}15`,
                      color: migratedAsRollCall
                        ? themedColors.success
                        : colors.primaryLight,
                      border: `1px solid ${migratedAsRollCall ? themedColors.success : colors.primaryLight}40`,
                      "& .MuiChip-icon": { color: "inherit", ml: "6px" },
                    }
                  : {
                      background: colors.backgroundSubtle,
                      color: colors.textTertiary,
                    }),
              };
              return (
                <Tooltip
                  key={`${section.key}-minutes-reference-${reference.vaskiId ?? "null"}-${reference.code}-${index}`}
                  title={tooltipTitle}
                  arrow
                >
                  <span>
                    {href ? (
                      <EduskuntaSourceLink
                        href={href}
                        showExternalIcon={false}
                        sx={{
                          color: "inherit",
                          "&:hover": { textDecoration: "none" },
                        }}
                      >
                        <Chip
                          label={reference.code}
                          size="small"
                          icon={
                            <OpenInNewIcon
                              sx={{ fontSize: "12px !important" }}
                            />
                          }
                          clickable
                          sx={chipSx}
                        />
                      </EduskuntaSourceLink>
                    ) : (
                      <Chip label={reference.code} size="small" sx={chipSx} />
                    )}
                  </span>
                </Tooltip>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  const renderSectionSubSections = (section: Section) => {
    const loading = loadingSubSections.has(section.id);
    const rows = getSectionSubSectionRows(section);

    if (loading) {
      return (
        <Box sx={{ mt: 1.5, py: 1, textAlign: "center" }}>
          <CircularProgress size={18} sx={{ color: themedColors.primary }} />
        </Box>
      );
    }

    if (rows.length <= 1) return null;

    return (
      <Box
        sx={{
          mt: 1.5,
          p: 1.5,
          borderRadius: 1,
          border: `1px solid ${colors.primaryLight}25`,
          background: `${colors.primaryLight}08`,
        }}
      >
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            fontWeight: 700,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 0.75,
          }}
        >
          {tSessions("subSections")}
        </Typography>
        <Box sx={{ overflowX: "auto" }}>
          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              ...commonStyles.compactTextLg,
              "& th, & td": {
                textAlign: "left",
                borderBottom: `1px solid ${colors.dataBorder}`,
                px: 0.75,
                py: 0.5,
                verticalAlign: "top",
              },
              "& th": {
                color: colors.textSecondary,
                fontWeight: 700,
                whiteSpace: "nowrap",
              },
              "& td": {
                color: colors.textPrimary,
              },
            }}
          >
            <thead>
              <tr>
                <th>{tSessions("subSectionNumber")}</th>
                <th>{tSessions("subSectionTitle")}</th>
                <th>{tSessions("subSectionDocument")}</th>
                <th>{tSessions("subSectionType")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = buildValtiopaivaAsiakirjaUrl(
                  row.related_document_identifier,
                );
                return (
                  <tr key={`${row.section_key}-${row.entry_order}-${row.id}`}>
                    <td>{row.item_number || row.entry_order}</td>
                    <td>{row.item_title || "-"}</td>
                    <td>
                      {row.related_document_identifier ? (
                        href ? (
                          <EduskuntaSourceLink
                            href={href}
                            sx={{
                              ...commonStyles.compactTextLg,
                              color: colors.primaryLight,
                            }}
                          >
                            {row.related_document_identifier}
                          </EduskuntaSourceLink>
                        ) : (
                          row.related_document_identifier
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{row.related_document_type || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </Box>
        </Box>
      </Box>
    );
  };

  const toggleSessionMinutes = (sessionKey: string) => {
    setExpandedMinutesSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionKey)) next.delete(sessionKey);
      else next.add(sessionKey);
      return next;
    });
  };

  const toggleSessionAttachments = (sessionKey: string) => {
    setExpandedAttachmentSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionKey)) next.delete(sessionKey);
      else next.add(sessionKey);
      return next;
    });
  };

  const renderSessionNotices = (session: SessionWithSections) => {
    const notices = (session.notices || []).filter(
      (notice) => !notice.section_key,
    );
    if (notices.length === 0) return null;

    return (
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.dataBorder}` }}>
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 1,
          }}
        >
          {tSessions("sessionNotices")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {notices.map((notice) => (
            <Box
              key={notice.id}
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: `1px solid ${colors.warning}30`,
                background: `${colors.warning}08`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  flexWrap: "wrap",
                  mb: notice.text_fi ? 0.5 : 0,
                }}
              >
                {notice.notice_type && (
                  <Chip
                    label={notice.notice_type}
                    size="small"
                    sx={{
                      fontSize: "0.625rem",
                      height: 20,
                      background: `${colors.warning}40`,
                      color: colors.textPrimary,
                    }}
                  />
                )}
                {notice.sent_at && (
                  <Typography
                    sx={{
                      ...commonStyles.compactTextLg,
                      color: colors.textTertiary,
                    }}
                  >
                    {tSessions("noticeSentLine", {
                      value: formatDateTime(notice.sent_at),
                    })}
                  </Typography>
                )}
                {notice.valid_until && (
                  <Typography
                    sx={{
                      ...commonStyles.compactTextLg,
                      color: colors.textTertiary,
                    }}
                  >
                    {tSessions("noticeValidUntilLine", {
                      value: formatDateTime(notice.valid_until),
                    })}
                  </Typography>
                )}
              </Box>
              {notice.text_fi && (
                <Typography
                  sx={{ fontSize: "0.8125rem", color: colors.textPrimary }}
                >
                  {notice.text_fi}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderSectionNotices = (
    session: SessionWithSections,
    sectionKey: string,
  ) => {
    const notices = (session.notices || []).filter(
      (notice) => notice.section_key === sectionKey,
    );
    if (notices.length === 0) return null;

    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 0.75,
          }}
        >
          {tSessions("sectionNotices")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {notices.map((notice) => (
            <Box
              key={notice.id}
              sx={{
                p: 1.25,
                borderRadius: 1,
                border: `1px solid ${colors.warning}30`,
                background: `${colors.warning}08`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  flexWrap: "wrap",
                  mb: notice.text_fi ? 0.5 : 0,
                }}
              >
                {notice.notice_type && (
                  <Chip
                    label={notice.notice_type}
                    size="small"
                    sx={{
                      fontSize: "0.625rem",
                      height: 20,
                      background: `${colors.warning}40`,
                      color: colors.textPrimary,
                    }}
                  />
                )}
                {notice.sent_at && (
                  <Typography
                    sx={{
                      ...commonStyles.compactTextLg,
                      color: colors.textTertiary,
                    }}
                  >
                    {tSessions("noticeSentLine", {
                      value: formatDateTime(notice.sent_at),
                    })}
                  </Typography>
                )}
                {notice.valid_until && (
                  <Typography
                    sx={{
                      ...commonStyles.compactTextLg,
                      color: colors.textTertiary,
                    }}
                  >
                    {tSessions("noticeValidUntilLine", {
                      value: formatDateTime(notice.valid_until),
                    })}
                  </Typography>
                )}
              </Box>
              {notice.text_fi && (
                <Typography
                  sx={{ fontSize: "0.8125rem", color: colors.textPrimary }}
                >
                  {notice.text_fi}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const scrollToSection = (sectionKey: string) => {
    const target = document.getElementById(`session-section-${sectionKey}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const findSectionInCurrentSessions = (
    sectionId: number,
    sectionKey: string,
  ) =>
    sessions
      .flatMap((session) => session.sections || [])
      .find(
        (candidate) =>
          candidate.id === sectionId || candidate.key === sectionKey,
      );

  const renderSessionMinutesOutline = (session: SessionWithSections) => {
    const items = (session.minutes_items || [])
      .slice()
      .sort(compareMinutesItems);
    if (items.length === 0) return null;
    const isExpanded = expandedMinutesSessions.has(session.key);

    return (
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.dataBorder}` }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 1,
          }}
        >
          <Typography
            sx={{
              ...commonStyles.compactTextLg,
              fontWeight: 600,
              color: colors.textSecondary,
              textTransform: "uppercase",
            }}
          >
            {tSessions("minutesOutline")}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toggleSessionMinutes(session.key)}
            sx={{
              textTransform: "none",
              borderColor: colors.primaryLight,
              color: colors.primaryLight,
              ...commonStyles.compactTextLg,
            }}
          >
            {isExpanded
              ? tSessions("minutesToggle", { context: "hide" })
              : tSessions("minutesToggle", { context: "show" })}
          </Button>
        </Box>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  border: `1px solid ${colors.dataBorder}`,
                  background: colors.backgroundSubtle,
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
                  {typeof item.ordinal === "number" && (
                    <Chip
                      label={item.ordinal}
                      size="small"
                      sx={{
                        fontSize: "0.625rem",
                        height: 18,
                        background: colors.primary,
                        color: "#fff",
                      }}
                    />
                  )}
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {item.title ||
                      item.processing_title ||
                      tSessions("noTitle")}
                  </Typography>
                  {item.section_id && item.section_key && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        const targetSection = findSectionInCurrentSessions(
                          item.section_id!,
                          item.section_key!,
                        );
                        if (!targetSection) return;
                        setFocusedSectionKey(targetSection.key);
                        if (!expandedSections.has(targetSection.id)) {
                          void toggleSection(
                            targetSection.id,
                            targetSection.key,
                          );
                        }
                        requestAnimationFrame(() =>
                          scrollToSection(targetSection.key),
                        );
                      }}
                      sx={{
                        textTransform: "none",
                        ...commonStyles.compactTextLg,
                      }}
                    >
                      {tSessions("openSection")}
                    </Button>
                  )}
                </Box>
                <Box
                  sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}
                >
                  {item.identifier_text && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textTertiary,
                      }}
                    >
                      {tSessions("identifierLine", {
                        value: item.identifier_text,
                      })}
                    </Typography>
                  )}
                  {item.processing_title &&
                    item.processing_title !== item.title && (
                      <Typography
                        sx={{
                          ...commonStyles.compactTextLg,
                          color: colors.textTertiary,
                        }}
                      >
                        {tSessions("processingLine", {
                          value: item.processing_title,
                        })}
                      </Typography>
                    )}
                  {item.note && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textSecondary,
                      }}
                    >
                      {item.note}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderSessionAttachments = (session: SessionWithSections) => {
    const attachments = session.minutes_attachments || [];
    if (attachments.length === 0) return null;
    const isExpanded = expandedAttachmentSessions.has(session.key);

    return (
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.dataBorder}` }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 1,
          }}
        >
          <Typography
            sx={{
              ...commonStyles.compactTextLg,
              fontWeight: 600,
              color: colors.textSecondary,
              textTransform: "uppercase",
            }}
          >
            {tSessions("minutesAttachments")}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toggleSessionAttachments(session.key)}
            sx={{
              textTransform: "none",
              borderColor: colors.primaryLight,
              color: colors.primaryLight,
              ...commonStyles.compactTextLg,
            }}
          >
            {isExpanded
              ? tSessions("attachmentsToggle", { context: "hide" })
              : tSessions("attachmentsToggle", { context: "show" })}
          </Button>
        </Box>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {attachments.map((attachment) => (
              <Box
                key={attachment.id}
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  border: `1px solid ${colors.dataBorder}`,
                  background: colors.backgroundSubtle,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    color: colors.textPrimary,
                  }}
                >
                  {attachment.title ||
                    attachment.file_name ||
                    tSessions("attachment")}
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}
                >
                  {attachment.related_document_tunnus && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textTertiary,
                      }}
                    >
                      {tSessions("relatedDocumentLine", {
                        value: attachment.related_document_tunnus,
                      })}
                    </Typography>
                  )}
                  {attachment.file_name && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textTertiary,
                      }}
                    >
                      {tSessions("fileNameLine", {
                        value: attachment.file_name,
                      })}
                    </Typography>
                  )}
                  {attachment.native_id && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textTertiary,
                      }}
                    >
                      {tSessions("nativeIdLine", {
                        value: attachment.native_id,
                      })}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderSectionLinks = (section: Section) => {
    const links = sectionLinks[section.key] || [];
    if (loadingLinks.has(section.key)) {
      return (
        <Box
          sx={{ py: 1, textAlign: "center" }}
          role="status"
          aria-live="polite"
          aria-label={tApp("loading")}
        >
          <CircularProgress size={18} sx={{ color: themedColors.primary }} />
          <Typography
            sx={{ ...commonStyles.compactTextXs, color: colors.textTertiary }}
          >
            {tApp("loading")}
          </Typography>
        </Box>
      );
    }
    if (links.length === 0) return null;

    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 0.75,
          }}
        >
          {tSessions("sectionDocuments")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {links.map((link) => (
            <Box
              key={link.id}
              sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                {isEduskuntaOfficialUrl(link.url) ? (
                  <EduskuntaSourceLink
                    href={link.url as string}
                    sx={{
                      fontSize: "0.8125rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {link.label || link.document_title || link.url}
                  </EduskuntaSourceLink>
                ) : (
                  <Link
                    href={link.url || "#"}
                    underline="hover"
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    {link.label || link.document_title || link.url}
                  </Link>
                )}
                {link.document_tunnus && (
                  <Typography
                    sx={{
                      ...commonStyles.compactTextLg,
                      color: colors.textTertiary,
                    }}
                  >
                    {link.document_tunnus}
                  </Typography>
                )}
                {link.source_type && (
                  <Chip
                    label={link.source_type}
                    size="small"
                    sx={{
                      fontSize: "0.625rem",
                      height: 18,
                      background: `${colors.primaryLight}20`,
                      color: colors.primaryLight,
                    }}
                  />
                )}
              </Box>
              {(link.document_type_name ||
                link.document_type_code ||
                link.document_created_at) && (
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  {(link.document_type_name || link.document_type_code) && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textSecondary,
                      }}
                    >
                      {link.document_type_name || link.document_type_code}
                    </Typography>
                  )}
                  {link.document_created_at && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textTertiary,
                      }}
                    >
                      {tSessions("vaskiCreatedLine", {
                        value: link.document_created_at,
                      })}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderSectionRollCall = (section: Section) => {
    const loading = loadingRollCalls.has(section.id);
    const rollCallData = sectionRollCalls[section.id];

    if (!loading && !rollCallData && !isRollCallSection(section)) return null;

    if (loading) {
      return (
        <Box
          sx={{ mt: 1.5, py: 1, textAlign: "center" }}
          role="status"
          aria-live="polite"
          aria-label={tApp("loading")}
        >
          <CircularProgress size={18} sx={{ color: themedColors.primary }} />
          <Typography
            sx={{ ...commonStyles.compactTextXs, color: colors.textTertiary }}
          >
            {tApp("loading")}
          </Typography>
        </Box>
      );
    }

    if (!rollCallData) return null;

    const { report, entries } = rollCallData;
    const documentIdentifier =
      report.edk_identifier || report.parliament_identifier;
    const documentUrl = toEduskuntaUrl(
      `/valtiopaivaasiakirjat/${encodeURIComponent(documentIdentifier)}`,
    );

    const formatEntryType = (entryType: RollCallEntry["entry_type"]) =>
      entryType === "late"
        ? tSessions("rollCallLate")
        : tSessions("rollCallAbsent");

    const formatAbsenceReason = (reasonCode?: string | null) => {
      if (!reasonCode) return "-";
      const code = reasonCode.toLowerCase();
      if (code === "e") {
        return tSessions("rollCallReasonE");
      }
      if (code === "h") {
        return tSessions("rollCallReasonH");
      }
      return tSessions("rollCallReasonUnknown");
    };

    const unknownReasonCodes = Array.from(
      new Set(
        entries
          .map((entry) => entry.absence_reason?.toLowerCase())
          .filter(
            (code): code is string => !!code && !["e", "h"].includes(code),
          ),
      ),
    );

    return (
      <Box
        sx={{
          mt: 1.5,
          p: 1.5,
          borderRadius: 1,
          border: `1px solid ${colors.primaryLight}25`,
          background: `${colors.primaryLight}08`,
        }}
      >
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            fontWeight: 700,
            color: colors.textSecondary,
            textTransform: "uppercase",
          }}
        >
          {tSessions("rollCallReport")}
        </Typography>
        {report.title && (
          <Typography
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: colors.textPrimary,
            }}
          >
            {report.title}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}>
          <Typography
            sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}
          >
            {tSessions("rollCallDocumentLine", {
              value: report.edk_identifier,
            })}
          </Typography>
          <EduskuntaSourceLink
            href={documentUrl}
            sx={{
              ...commonStyles.compactTextLg,
              fontWeight: 600,
              color: colors.primaryLight,
            }}
          >
            {tSessions("rollCallOpenDocument")}
          </EduskuntaSourceLink>
          {report.roll_call_start_time && (
            <Typography
              sx={{
                ...commonStyles.compactTextLg,
                color: colors.textSecondary,
              }}
            >
              {tSessions("rollCallStartLine", {
                value: formatTime(report.roll_call_start_time),
              })}
            </Typography>
          )}
          {report.roll_call_end_time && (
            <Typography
              sx={{
                ...commonStyles.compactTextLg,
                color: colors.textSecondary,
              }}
            >
              {tSessions("rollCallEndLine", {
                value: formatTime(report.roll_call_end_time),
              })}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.75 }}>
          <Chip
            label={tSessions("rollCallAbsentLine", {
              count: report.absent_count,
            })}
            size="small"
            sx={{
              fontSize: "0.6875rem",
              height: 20,
              background: `${themedColors.error}15`,
              color: themedColors.error,
            }}
          />
          <Chip
            label={tSessions("rollCallLateLine", { count: report.late_count })}
            size="small"
            sx={{
              fontSize: "0.6875rem",
              height: 20,
              background: `${themedColors.warning}15`,
              color: themedColors.warning,
            }}
          />
        </Box>

        {entries.length === 0 && (
          <Typography
            sx={{
              mt: 0.75,
              ...commonStyles.compactTextLg,
              color: colors.textTertiary,
            }}
          >
            {tSessions("rollCallNoEntries")}
          </Typography>
        )}

        {entries.length > 0 && (
          <Box sx={{ mt: 1, overflowX: "auto" }}>
            <Box
              component="table"
              sx={{
                width: "100%",
                borderCollapse: "collapse",
                ...commonStyles.compactTextLg,
                "& th, & td": {
                  textAlign: "left",
                  borderBottom: `1px solid ${colors.dataBorder}`,
                  px: 0.75,
                  py: 0.5,
                  verticalAlign: "top",
                },
                "& th": {
                  color: colors.textSecondary,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                },
                "& td": {
                  color: colors.textPrimary,
                },
              }}
            >
              <thead>
                <tr>
                  <th>{tSessions("rollCallTableNumber")}</th>
                  <th>{tSessions("rollCallTableName")}</th>
                  <th>{tSessions("rollCallTableParty")}</th>
                  <th>{tSessions("rollCallTableType")}</th>
                  <th>{tSessions("rollCallTableCode")}</th>
                  <th>{tSessions("rollCallTableReason")}</th>
                  <th>{tSessions("rollCallTableArrival")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.roll_call_id}-${entry.entry_order}`}>
                    <td>{entry.entry_order}</td>
                    <td>
                      {entry.first_name} {entry.last_name}
                    </td>
                    <td>{entry.party ? entry.party.toUpperCase() : "-"}</td>
                    <td>{formatEntryType(entry.entry_type)}</td>
                    <td>
                      {entry.absence_reason ? `(${entry.absence_reason})` : "-"}
                    </td>
                    <td>{formatAbsenceReason(entry.absence_reason)}</td>
                    <td>{entry.arrival_time || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            mt: 1,
            p: 1,
            borderRadius: 1,
            background: colors.backgroundDefault,
            border: `1px solid ${colors.dataBorder}`,
          }}
        >
          <Typography
            sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}
          >
            {tSessions("rollCallReasonLegend")}: <strong>(e)</strong>{" "}
            {tSessions("rollCallReasonE")}; <strong>(h)</strong>{" "}
            {tSessions("rollCallReasonH")}
          </Typography>
          {unknownReasonCodes.length > 0 && (
            <Typography
              sx={{
                mt: 0.5,
                ...commonStyles.compactTextLg,
                color: colors.textTertiary,
              }}
            >
              {tSessions("rollCallUnknownCodesLine", {
                value: unknownReasonCodes.map((code) => `(${code})`).join(", "),
              })}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const fetchSpeeches = async (
    _sectionId: number,
    sectionKey: string,
    offset = 0,
  ) => {
    const res = await fetch(
      `/api/sections/${sectionKey}/speeches?limit=${SPEECH_PAGE_SIZE}&offset=${offset}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SpeechData;
  };

  const fetchSectionLinks = async (sectionKey: string) => {
    const res = await fetch(`/api/sections/${sectionKey}/links`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SectionDocumentLink[];
  };

  const fetchSectionSubSections = async (sectionKey: string) => {
    const res = await fetch(`/api/sections/${sectionKey}/subsections`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SubSection[];
  };

  const fetchSectionRollCall = async (sectionKey: string) => {
    const res = await fetch(`/api/sections/${sectionKey}/roll-call`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SectionRollCallData | null;
  };

  const getErrorReason = (error: unknown) =>
    error instanceof Error ? error.message : tErrors("unknownError");

  const sectionLoadErrorLabels: Record<SectionLoadErrorKey, string> = {
    speeches: tSessions("loadErrorSpeeches"),
    votings: tSessions("loadErrorVotings"),
    links: tSessions("loadErrorLinks"),
    subSections: tSessions("loadErrorSubSections"),
    rollCall: tSessions("loadErrorRollCall"),
  };

  const setSectionLoadError = (
    sectionId: number,
    key: SectionLoadErrorKey,
    reason: string,
  ) => {
    setSectionLoadErrors((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), [key]: reason },
    }));
  };

  const clearSectionLoadError = (
    sectionId: number,
    key: SectionLoadErrorKey,
  ) => {
    setSectionLoadErrors((prev) => {
      const current = prev[sectionId];
      if (!current || !current[key]) return prev;
      const nextSection = { ...current };
      delete nextSection[key];
      if (Object.keys(nextSection).length === 0) {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      }
      return { ...prev, [sectionId]: nextSection };
    });
  };

  const loadSectionData = async (sectionId: number, sectionKey: string) => {
    const section = findSectionInCurrentSessions(sectionId, sectionKey);
    if (!section) return;
    const targetSectionId = section.id;
    const targetSectionKey = section.key;

    if (!sectionSpeechData[targetSectionId]) {
      setLoadingSpeeches((prev) => new Set(prev).add(targetSectionId));
      try {
        const data = await fetchSpeeches(targetSectionId, targetSectionKey);
        setSectionSpeechData((prev) => ({ ...prev, [targetSectionId]: data }));
        clearSectionLoadError(targetSectionId, "speeches");
      } catch (error) {
        setSectionLoadError(targetSectionId, "speeches", getErrorReason(error));
      } finally {
        setLoadingSpeeches((prev) => {
          const next = new Set(prev);
          next.delete(targetSectionId);
          return next;
        });
      }
    }

    if (!sectionVotings[targetSectionId]) {
      setLoadingVotings((prev) => new Set(prev).add(targetSectionId));
      try {
        const res = await fetch(`/api/sections/${targetSectionKey}/votings`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const votings: Voting[] = await res.json();
        setSectionVotings((prev) => ({ ...prev, [targetSectionId]: votings }));
        clearSectionLoadError(targetSectionId, "votings");
      } catch (error) {
        setSectionLoadError(targetSectionId, "votings", getErrorReason(error));
      } finally {
        setLoadingVotings((prev) => {
          const next = new Set(prev);
          next.delete(targetSectionId);
          return next;
        });
      }
    }

    if (!sectionLinks[targetSectionKey]) {
      setLoadingLinks((prev) => new Set(prev).add(targetSectionKey));
      try {
        const links = await fetchSectionLinks(targetSectionKey);
        setSectionLinks((prev) => ({ ...prev, [targetSectionKey]: links }));
        clearSectionLoadError(targetSectionId, "links");
      } catch (error) {
        setSectionLoadError(targetSectionId, "links", getErrorReason(error));
      } finally {
        setLoadingLinks((prev) => {
          const next = new Set(prev);
          next.delete(targetSectionKey);
          return next;
        });
      }
    }

    const hasSubSectionsData = Object.hasOwn(
      sectionSubSections,
      targetSectionId,
    );
    if (!hasSubSectionsData) {
      setLoadingSubSections((prev) => new Set(prev).add(targetSectionId));
      try {
        const subSections = await fetchSectionSubSections(targetSectionKey);
        setSectionSubSections((prev) => ({
          ...prev,
          [targetSectionId]: subSections,
        }));
        clearSectionLoadError(targetSectionId, "subSections");
      } catch (error) {
        setSectionLoadError(
          targetSectionId,
          "subSections",
          getErrorReason(error),
        );
      } finally {
        setLoadingSubSections((prev) => {
          const next = new Set(prev);
          next.delete(targetSectionId);
          return next;
        });
      }
    }

    const hasRollCallData = Object.hasOwn(sectionRollCalls, targetSectionId);
    if (isRollCallSection(section) && !hasRollCallData) {
      setLoadingRollCalls((prev) => new Set(prev).add(targetSectionId));
      try {
        const rollCall = await fetchSectionRollCall(targetSectionKey);
        setSectionRollCalls((prev) => ({
          ...prev,
          [targetSectionId]: rollCall,
        }));
        clearSectionLoadError(targetSectionId, "rollCall");
      } catch (error) {
        setSectionLoadError(targetSectionId, "rollCall", getErrorReason(error));
      } finally {
        setLoadingRollCalls((prev) => {
          const next = new Set(prev);
          next.delete(targetSectionId);
          return next;
        });
      }
    }
  };

  const toggleSection = (sectionId: number, sectionKey: string) => {
    const section = findSectionInCurrentSessions(sectionId, sectionKey);
    if (!section) return;
    const targetSectionId = section.id;
    const targetSectionKey = section.key;
    const isExpanding = !expandedSections.has(targetSectionId);

    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(targetSectionId)) next.delete(targetSectionId);
      else next.add(targetSectionId);
      return next;
    });

    if (isExpanding) {
      void loadSectionData(targetSectionId, targetSectionKey);
    }
  };

  const loadMoreSpeeches = async (sectionId: number, sectionKey: string) => {
    const current = sectionSpeechData[sectionId];
    if (!current || current.page >= current.totalPages) return;

    setLoadingMoreSpeeches((prev) => new Set(prev).add(sectionId));
    try {
      const nextOffset = current.page * SPEECH_PAGE_SIZE;
      const data = await fetchSpeeches(sectionId, sectionKey, nextOffset);
      setSectionSpeechData((prev) => ({
        ...prev,
        [sectionId]: {
          ...data,
          speeches: [...(prev[sectionId]?.speeches || []), ...data.speeches],
        },
      }));
      clearSectionLoadError(sectionId, "speeches");
    } catch (error) {
      setSectionLoadError(sectionId, "speeches", getErrorReason(error));
    } finally {
      setLoadingMoreSpeeches((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
  };

  const renderSectionVotings = (
    votings: Voting[],
    session: SessionWithSections,
  ) => {
    if (votings.length === 0) return null;

    return (
      <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
          }}
        >
          {tSessions("votingsLabel", { count: votings.length })}
        </Typography>
        {votings.map((voting) => (
          <VotingSubRow
            key={voting.id}
            voting={{
              id: voting.id,
              number: voting.number,
              title: voting.title,
              n_yes: voting.n_yes,
              n_no: voting.n_no,
              n_abstain: voting.n_abstain,
              n_absent: voting.n_absent,
              n_total: voting.n_total,
              session_key: session.key,
            }}
            showTitle
            onOpenInView={() => {
              window.history.pushState(
                {},
                "",
                refs.voting(voting.id, session.key, session.date),
              );
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          />
        ))}
      </Box>
    );
  };

  return (
    <Box>
      <PageHeader
        title={tSessions("title")}
        subtitle={tSessions("subtitle")}
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            {selectedHallituskausi && (
              <Chip
                size="small"
                label={`Hallituskausi: ${selectedHallituskausi.label}`}
                sx={{
                  background: `${colors.primary}20`,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.primary}40`,
                }}
              />
            )}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              size="small"
              sx={{
                "& .MuiToggleButton-root": {
                  border: `1px solid ${colors.dataBorder}`,
                  color: colors.textSecondary,
                  "&.Mui-selected": {
                    background: colors.primary,
                    color: "#fff",
                    "&:hover": { background: colors.primary },
                  },
                },
              }}
            >
              <ToggleButton value="list">
                <ViewListIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
              <ToggleButton value="timeline">
                <TimelineIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
              <ToggleButton value="calendar">
                <CalendarMonthIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </ToggleButtonGroup>
            {viewMode !== "calendar" && (
              <TextField
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarTodayIcon
                        sx={{ fontSize: 16, color: colors.primaryLight }}
                      />
                    </InputAdornment>
                  ),
                }}
                error={!datesLoading && !isValidDate(date)}
                helperText={
                  !datesLoading && !isValidDate(date)
                    ? tSessions("noSessionsSelected")
                    : undefined
                }
                sx={{
                  minWidth: 200,
                  "& .MuiOutlinedInput-root": {
                    background: "#fff",
                  },
                }}
              />
            )}
          </Box>
        }
      />

      {/* Calendar view */}
      {viewMode === "calendar" && !datesLoading && (
        <CalendarGrid
          validDates={validDates}
          selectedDate={date}
          onSelectDate={handleDateChange}
        />
      )}

      {loading ? (
        <Box sx={{ ...commonStyles.centeredFlex, py: 4 }}>
          <CircularProgress size={28} sx={{ color: themedColors.primary }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : sessions.length === 0 ? (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            {tSessions("noSessionsForDate")}
          </Alert>
          {!datesLoading &&
            validDates.size > 0 &&
            (() => {
              const { before, after } = findNearestValidDates(date);
              return before || after ? (
                <DataCard sx={{ p: 2.5 }}>
                  <Typography
                    sx={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: colors.textSecondary,
                      mb: 1.5,
                    }}
                  >
                    {tSessions("nearestSessions")}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {before && (
                      <Chip
                        label={formatDate(before)}
                        onClick={() => handleDateChange(before)}
                        sx={{
                          background: colors.primary,
                          color: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                          "&:hover": { opacity: 0.9 },
                        }}
                      />
                    )}
                    {after && (
                      <Chip
                        label={formatDate(after)}
                        onClick={() => handleDateChange(after)}
                        sx={{
                          background: colors.primary,
                          color: "#fff",
                          fontWeight: 600,
                          cursor: "pointer",
                          "&:hover": { opacity: 0.9 },
                        }}
                      />
                    )}
                  </Box>
                </DataCard>
              ) : null;
            })()}
        </Box>
      ) : (
        <DataCard sx={{ p: 0, overflow: "hidden" }}>
          {/* Date banner */}
          <Box sx={{ p: 2.5, borderBottom: `1px solid ${colors.dataBorder}` }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}
            >
              <EventIcon sx={{ fontSize: 20, color: colors.primaryLight }} />
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: "1rem",
                  color: colors.textPrimary,
                }}
              >
                {formatDate(date)}
              </Typography>
            </Box>
          </Box>

          {sessions.map((session) => {
            const isFocusedSession = focusedSessionKey === session.key;
            return (
              <Box
                key={session.id}
                sx={{
                  outline: isFocusedSession
                    ? `2px solid ${colors.primaryLight}`
                    : "none",
                  outlineOffset: isFocusedSession ? "-2px" : 0,
                }}
              >
                {/* Session header */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: `1px solid ${colors.dataBorder}`,
                    background: isFocusedSession
                      ? `${colors.primaryLight}14`
                      : colors.backgroundSubtle,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href={refs.session(session.key, session.date)}
                    underline="hover"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {session.key || tSessions("session")}
                  </Link>
                  {session.number !== undefined && (
                    <Chip
                      label={tSessions("sessionNumberLine", {
                        value: session.number,
                      })}
                      size="small"
                      sx={{
                        fontSize: "0.6875rem",
                        height: 22,
                        background: "#fff",
                        color: colors.textSecondary,
                      }}
                    />
                  )}
                  {session.type && (
                    <Chip
                      label={tSessions("sessionTypeLine", {
                        value: session.type,
                      })}
                      size="small"
                      sx={{
                        fontSize: "0.6875rem",
                        height: 22,
                        background: "#fff",
                        color: colors.textSecondary,
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      flex: "1 1 100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    {session.agenda_title && (
                      <Typography
                        sx={{
                          fontSize: "0.8125rem",
                          color: colors.textSecondary,
                        }}
                      >
                        {session.agenda_title}
                      </Typography>
                    )}
                    {session.description && (
                      <Typography
                        sx={{
                          ...commonStyles.compactTextLg,
                          color: colors.textTertiary,
                        }}
                      >
                        {session.description}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Session summary */}
                <Box
                  sx={{
                    p: 2,
                    borderBottom: `1px solid ${colors.dataBorder}`,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    alignItems: "center",
                    background: "#fff",
                  }}
                >
                  <Chip
                    label={tHome("sectionCount", {
                      count: session.section_count,
                    })}
                    size="small"
                    sx={{
                      fontSize: "0.6875rem",
                      height: 22,
                      background: `${colors.primaryLight}20`,
                      color: colors.primaryLight,
                    }}
                  />
                  <Chip
                    icon={<HowToVoteIcon sx={{ fontSize: 14 }} />}
                    label={tHome("votingCount", {
                      count: session.voting_count,
                    })}
                    size="small"
                    sx={{
                      fontSize: "0.6875rem",
                      height: 22,
                      background: `${themedColors.success}15`,
                      color: themedColors.success,
                    }}
                  />
                  {session.start_time_reported && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textSecondary,
                      }}
                    >
                      {tSessions("startReportedLine", {
                        value: formatTime(session.start_time_reported),
                      })}
                    </Typography>
                  )}
                  {session.start_time_actual && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textSecondary,
                      }}
                    >
                      {tSessions("startActualLine", {
                        value: formatTime(session.start_time_actual),
                      })}
                    </Typography>
                  )}
                  {session.agenda_state && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textSecondary,
                      }}
                    >
                      {tSessions("agendaStateLine", {
                        value: session.agenda_state,
                      })}
                    </Typography>
                  )}
                  {session.year !== undefined && (
                    <Typography
                      sx={{
                        ...commonStyles.compactTextLg,
                        color: colors.textSecondary,
                      }}
                    >
                      {tSessions("sessionYearLine", { value: session.year })}
                    </Typography>
                  )}
                </Box>

                {renderSessionNotices(session)}
                {renderSessionMinutesOutline(session)}
                {renderSessionAttachments(session)}

                {vaskiLatestSpeechDate &&
                  new Date(session.date).getTime() >
                    new Date(vaskiLatestSpeechDate).getTime() && (
                    <Box
                      sx={{
                        p: 2,
                        borderBottom: `1px solid ${colors.dataBorder}`,
                      }}
                    >
                      <Alert severity="info" sx={{ alignItems: "center" }}>
                        <Typography sx={{ fontSize: "0.8125rem" }}>
                          {tSessions("speechContentPending")}
                        </Typography>
                        <Typography sx={{ fontSize: "0.8125rem" }}>
                          {speechContentLatestLabel(
                            formatDate(vaskiLatestSpeechDate),
                          )}
                        </Typography>
                      </Alert>
                    </Box>
                  )}

                {/* Sections list */}
                {viewMode !== "timeline" &&
                  session.sections?.map((section) => {
                    const isExpanded = expandedSections.has(section.id);
                    const isFocusedSection = focusedSectionKey === section.key;
                    const speechData = sectionSpeechData[section.id];
                    const speeches = speechData?.speeches || [];
                    const hasSpeechContent = speeches.some(
                      (speech) => speech.content,
                    );
                    const votings = sectionVotings[section.id] || [];
                    const sectionErrorReasons = (
                      Object.entries(
                        sectionLoadErrors[section.id] || {},
                      ) as Array<[SectionLoadErrorKey, string]>
                    )
                      .filter(([, reason]) => Boolean(reason))
                      .map(
                        ([key, reason]) =>
                          `${sectionLoadErrorLabels[key]} (${reason})`,
                      );
                    const vaskiInfoCompact = renderVaskiInfo(section, true);
                    const vaskiInfoContent = renderVaskiInfo(section, false);
                    const minutesInfoCompact = renderMinutesInfo(section, true);
                    const minutesInfoContent = renderMinutesInfo(
                      section,
                      false,
                    );
                    const sectionSubSectionsContent =
                      renderSectionSubSections(section);
                    const sectionMinutesContent =
                      renderSectionMinutesContent(section);
                    const docRefs = extractSectionDocRefs(section);
                    const sectionLinksContent = renderSectionLinks(section);
                    const sectionNoticesContent = renderSectionNotices(
                      session,
                      section.key,
                    );
                    const sectionRollCallContent =
                      renderSectionRollCall(section);
                    const sectionVotingsContent = renderSectionVotings(
                      votings,
                      session,
                    );
                    const hasAdditionalExpandedContent =
                      Boolean(vaskiInfoContent) ||
                      Boolean(minutesInfoContent) ||
                      Boolean(sectionSubSectionsContent) ||
                      Boolean(sectionMinutesContent) ||
                      docRefs.length > 0 ||
                      Boolean(sectionLinksContent) ||
                      Boolean(sectionNoticesContent) ||
                      Boolean(sectionRollCallContent);

                    return (
                      <SessionSectionPanel
                        key={section.id}
                        sectionId={section.id}
                        sectionKey={section.key}
                        isExpanded={isExpanded}
                        isFocused={isFocusedSection}
                        onToggle={() => toggleSection(section.id, section.key)}
                        headerContent={
                          <>
                            <Chip
                              label={getSectionOrderLabel(section)}
                              size="small"
                              sx={{
                                background: colors.primary,
                                color: "#fff",
                                fontWeight: 600,
                                ...commonStyles.compactTextMd,
                                height: 22,
                                minWidth: 28,
                                flexShrink: 0,
                              }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontSize: "0.875rem",
                                  color: colors.textPrimary,
                                  wordBreak: "break-word",
                                }}
                              >
                                {section.title ||
                                  section.processing_title ||
                                  tSessions("noTitle")}
                              </Typography>
                              {section.minutes_item_order != null && (
                                <Typography
                                  sx={{
                                    ...commonStyles.compactTextLg,
                                    color: colors.textTertiary,
                                  }}
                                >
                                  {tSessions("minutesOrder")}{" "}
                                  {section.minutes_item_order}
                                </Typography>
                              )}
                              {section.note && (
                                <Typography
                                  sx={{
                                    ...commonStyles.compactTextLg,
                                    color: colors.textSecondary,
                                  }}
                                >
                                  {section.note}
                                </Typography>
                              )}
                              {section.processing_title &&
                                section.processing_title !== section.title && (
                                  <Typography
                                    sx={{
                                      ...commonStyles.compactTextLg,
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {tSessions("processingLine", {
                                      value: section.processing_title,
                                    })}
                                  </Typography>
                                )}
                              {section.resolution && (
                                <Typography
                                  sx={{
                                    ...commonStyles.compactTextLg,
                                    color: colors.textTertiary,
                                  }}
                                >
                                  {tSessions("resolutionLine", {
                                    value: section.resolution,
                                  })}
                                </Typography>
                              )}
                              {vaskiInfoCompact}
                              {minutesInfoCompact}
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  flexWrap: "wrap",
                                  mt: 0.75,
                                }}
                              >
                                <Chip
                                  label={tSessions("votingsCount", {
                                    count: section.voting_count ?? 0,
                                  })}
                                  size="small"
                                  sx={{
                                    fontSize: "0.6875rem",
                                    height: 20,
                                    background: `${themedColors.success}15`,
                                    color: themedColors.success,
                                  }}
                                />
                                <Chip
                                  label={tSessions("speechesCount", {
                                    count: section.speech_count ?? 0,
                                  })}
                                  size="small"
                                  sx={{
                                    fontSize: "0.6875rem",
                                    height: 20,
                                    background: `${colors.primaryLight}20`,
                                    color: colors.primaryLight,
                                  }}
                                />
                                <Chip
                                  label={tSessions("speakersCount", {
                                    count: section.speaker_count ?? 0,
                                  })}
                                  size="small"
                                  sx={{ fontSize: "0.6875rem", height: 20 }}
                                />
                                <Chip
                                  label={tSessions("partiesCount", {
                                    count: section.party_count ?? 0,
                                  })}
                                  size="small"
                                  sx={{ fontSize: "0.6875rem", height: 20 }}
                                />
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1.5,
                                  flexWrap: "wrap",
                                  mt: 0.5,
                                }}
                              >
                                {section.agenda_key && (
                                  <Typography
                                    sx={{
                                      ...commonStyles.compactTextLg,
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {tSessions("agendaKeyLine", {
                                      value: section.agenda_key,
                                    })}
                                  </Typography>
                                )}
                                {section.vaski_id !== undefined &&
                                  section.vaski_id !== null && (
                                    <Typography
                                      sx={{
                                        ...commonStyles.compactTextLg,
                                        color: colors.textTertiary,
                                      }}
                                    >
                                      {tSessions("vaskiIdLine", {
                                        value: section.vaski_id,
                                      })}
                                    </Typography>
                                  )}
                                {section.modified_datetime && (
                                  <Typography
                                    sx={{
                                      ...commonStyles.compactTextLg,
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {tSessions("sectionUpdatedLine", {
                                      value: formatDateTime(
                                        section.modified_datetime,
                                      ),
                                    })}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </>
                        }
                      >
                        {sectionErrorReasons.length > 0 && (
                          <Alert
                            severity="warning"
                            sx={{ mt: 1.5, mb: 0.5 }}
                            action={
                              <Button
                                color="inherit"
                                size="small"
                                onClick={() =>
                                  void loadSectionData(section.id, section.key)
                                }
                                sx={{
                                  ...commonStyles.compactTextMd,
                                  textTransform: "none",
                                }}
                              >
                                {tCommon("retry")}
                              </Button>
                            }
                          >
                            {tErrors("loadFailedWithReason", {
                              reason: sectionErrorReasons.join(", "),
                            })}
                          </Alert>
                        )}
                        {vaskiInfoContent}
                        {minutesInfoContent}
                        {sectionSubSectionsContent}
                        {sectionMinutesContent}
                        {docRefs.map((ref) => (
                          <DocumentCard key={ref.identifier} docRef={ref} />
                        ))}
                        {docRefs.length > 0 && section.voting_count === 0 && (
                          <RelatedVotings
                            identifiers={docRefs.map((r) => r.identifier)}
                          />
                        )}
                        {sectionLinksContent}
                        {sectionNoticesContent}
                        {sectionRollCallContent}
                        {/* Votings */}
                        {loadingVotings.has(section.id) ? (
                          <Box
                            sx={{ py: 2, textAlign: "center" }}
                            role="status"
                            aria-live="polite"
                            aria-label={tApp("loading")}
                          >
                            <CircularProgress
                              size={20}
                              sx={{ color: themedColors.primary }}
                            />
                            <Typography
                              sx={{
                                ...commonStyles.compactTextXs,
                                color: colors.textTertiary,
                              }}
                            >
                              {tApp("loading")}
                            </Typography>
                          </Box>
                        ) : (
                          sectionVotingsContent
                        )}

                        {/* Speeches */}
                        {loadingSpeeches.has(section.id) ? (
                          <Box
                            sx={{ py: 2, textAlign: "center" }}
                            role="status"
                            aria-live="polite"
                            aria-label={tApp("loading")}
                          >
                            <CircularProgress
                              size={20}
                              sx={{ color: themedColors.primary }}
                            />
                            <Typography
                              sx={{
                                ...commonStyles.compactTextXs,
                                color: colors.textTertiary,
                              }}
                            >
                              {tApp("loading")}
                            </Typography>
                          </Box>
                        ) : speeches.length > 0 ? (
                          <Box
                            sx={{
                              mt: 1.5,
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.75,
                            }}
                          >
                            <Typography
                              sx={{
                                ...commonStyles.compactTextLg,
                                fontWeight: 600,
                                color: colors.textSecondary,
                                textTransform: "uppercase",
                              }}
                            >
                              {tSessions("speeches")} (
                              {speechData?.total ?? speeches.length})
                            </Typography>
                            {!hasSpeechContent && (
                              <Typography
                                sx={{
                                  ...commonStyles.compactTextLg,
                                  color: colors.textTertiary,
                                }}
                              >
                                {tSessions("speechContentPending")}
                              </Typography>
                            )}
                            {!hasSpeechContent && vaskiLatestSpeechDate && (
                              <Typography
                                sx={{
                                  ...commonStyles.compactTextLg,
                                  color: colors.textTertiary,
                                }}
                              >
                                {speechContentLatestLabel(
                                  formatDate(vaskiLatestSpeechDate),
                                )}
                              </Typography>
                            )}
                            {speeches.map((speech) => {
                              const speechTime = formatSpeechTimeRange(speech);
                              return (
                                <Box
                                  key={speech.id}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    background: colors.backgroundSubtle,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      mb: speech.content ? 1 : 0,
                                    }}
                                  >
                                    <Chip
                                      label={
                                        speech.ordinal_number ?? speech.ordinal
                                      }
                                      size="small"
                                      sx={{
                                        background: `${colors.primaryLight}30`,
                                        color: colors.primaryLight,
                                        fontWeight: 600,
                                        fontSize: "0.625rem",
                                        height: 18,
                                        minWidth: 24,
                                      }}
                                    />
                                    <Typography
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: "0.8125rem",
                                        flex: 1,
                                      }}
                                    >
                                      {speech.first_name} {speech.last_name}
                                    </Typography>
                                    {speech.party_abbreviation && (
                                      <Chip
                                        label={speech.party_abbreviation}
                                        size="small"
                                        sx={{
                                          fontSize: "0.625rem",
                                          height: 18,
                                        }}
                                      />
                                    )}
                                    {speech.speech_type && (
                                      <Typography
                                        sx={{
                                          fontSize: "0.6875rem",
                                          color: colors.textTertiary,
                                        }}
                                      >
                                        {speech.speech_type}
                                      </Typography>
                                    )}
                                    {speechTime && (
                                      <Typography
                                        sx={{
                                          fontSize: "0.6875rem",
                                          color: colors.textTertiary,
                                        }}
                                      >
                                        {speechTime}
                                      </Typography>
                                    )}
                                  </Box>
                                  {speech.content && (
                                    <Box
                                      sx={{
                                        p: 1.5,
                                        borderRadius: 1,
                                        borderLeft: `3px solid ${colors.primaryLight}`,
                                        background: colors.backgroundDefault,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: "0.8125rem",
                                          color: colors.textPrimary,
                                          whiteSpace: "pre-wrap",
                                          lineHeight: 1.6,
                                        }}
                                      >
                                        {speech.content}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                            {/* Load more button */}
                            {speechData &&
                              speechData.page < speechData.totalPages && (
                                <Box sx={{ textAlign: "center", mt: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadMoreSpeeches(section.id, section.key);
                                    }}
                                    disabled={loadingMoreSpeeches.has(
                                      section.id,
                                    )}
                                    sx={{
                                      textTransform: "none",
                                      borderColor: colors.primaryLight,
                                      color: colors.primaryLight,
                                      fontSize: "0.8125rem",
                                    }}
                                  >
                                    {loadingMoreSpeeches.has(section.id) ? (
                                      <CircularProgress
                                        size={16}
                                        sx={{ mr: 1 }}
                                      />
                                    ) : null}
                                    {tSessions("loadMoreProgress", {
                                      loaded: speeches.length,
                                      total: speechData.total,
                                    })}
                                  </Button>
                                </Box>
                              )}
                          </Box>
                        ) : null}
                        {!loadingSpeeches.has(section.id) &&
                          !loadingVotings.has(section.id) &&
                          speeches.length === 0 &&
                          votings.length === 0 &&
                          sectionErrorReasons.length === 0 &&
                          !hasAdditionalExpandedContent && (
                            <Typography
                              sx={{
                                py: 2,
                                textAlign: "center",
                                fontSize: "0.8125rem",
                                color: colors.textTertiary,
                              }}
                            >
                              {tSessions("noSectionContent")}
                            </Typography>
                          )}
                      </SessionSectionPanel>
                    );
                  })}

                {viewMode === "timeline" && (
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: `1px solid ${colors.dataBorder}`,
                    }}
                  >
                    <Box sx={{ position: "relative", pl: 2.5 }}>
                      <Box
                        sx={{
                          position: "absolute",
                          left: 8,
                          top: 4,
                          bottom: 4,
                          width: 2,
                          background: `${colors.primaryLight}35`,
                        }}
                      />
                      {session.sections?.map((section) => {
                        const isExpanded = expandedSections.has(section.id);
                        const speechData = sectionSpeechData[section.id];
                        const speeches = speechData?.speeches || [];
                        const hasSpeechContent = speeches.some(
                          (speech) => speech.content,
                        );
                        const votings = sectionVotings[section.id] || [];
                        const votingCount =
                          section.voting_count ?? votings.length;
                        const speechCount =
                          section.speech_count ??
                          speechData?.total ??
                          speeches.length;
                        const sectionErrorReasons = (
                          Object.entries(
                            sectionLoadErrors[section.id] || {},
                          ) as Array<[SectionLoadErrorKey, string]>
                        )
                          .filter(([, reason]) => Boolean(reason))
                          .map(
                            ([key, reason]) =>
                              `${sectionLoadErrorLabels[key]} (${reason})`,
                          );

                        return (
                          <Box
                            key={section.id}
                            id={`session-section-${section.key}`}
                            sx={{ position: "relative", pl: 2, mb: 2 }}
                          >
                            <Box
                              sx={{
                                position: "absolute",
                                left: -2,
                                top: 2,
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: colors.primary,
                                boxShadow: `0 0 0 3px ${colors.primaryLight}20`,
                              }}
                            />
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 1,
                                background: colors.backgroundSubtle,
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
                                <Chip
                                  label={getSectionOrderLabel(section)}
                                  size="small"
                                  sx={{
                                    background: "#fff",
                                    color: colors.textSecondary,
                                    fontWeight: 600,
                                    ...commonStyles.compactTextMd,
                                    height: 22,
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.875rem",
                                    color: colors.textPrimary,
                                  }}
                                >
                                  {section.title ||
                                    section.processing_title ||
                                    tSessions("noTitle")}
                                </Typography>
                              </Box>
                              {section.minutes_item_order != null && (
                                <Typography
                                  sx={{
                                    ...commonStyles.compactTextLg,
                                    color: colors.textTertiary,
                                    mt: 0.25,
                                  }}
                                >
                                  {tSessions("minutesOrder")}{" "}
                                  {section.minutes_item_order}
                                </Typography>
                              )}
                              {section.note && (
                                <Typography
                                  sx={{
                                    ...commonStyles.compactTextLg,
                                    color: colors.textSecondary,
                                    mt: 0.25,
                                  }}
                                >
                                  {section.note}
                                </Typography>
                              )}
                              {section.processing_title &&
                                section.processing_title !== section.title && (
                                  <Typography
                                    sx={{
                                      ...commonStyles.compactTextLg,
                                      color: colors.textTertiary,
                                      mt: 0.25,
                                    }}
                                  >
                                    {tSessions("processingLine", {
                                      value: section.processing_title,
                                    })}
                                  </Typography>
                                )}
                              {section.resolution && (
                                <Typography
                                  sx={{
                                    ...commonStyles.compactTextLg,
                                    color: colors.textTertiary,
                                    mt: 0.25,
                                  }}
                                >
                                  {tSessions("resolutionLine", {
                                    value: section.resolution,
                                  })}
                                </Typography>
                              )}
                              {renderVaskiInfo(section, true)}
                              {renderMinutesInfo(section, true)}

                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  flexWrap: "wrap",
                                  mt: 1,
                                }}
                              >
                                <Chip
                                  label={tSessions("votingsCount", {
                                    count: votingCount,
                                  })}
                                  size="small"
                                  sx={{
                                    fontSize: "0.6875rem",
                                    height: 22,
                                    background: `${themedColors.success}15`,
                                    color: themedColors.success,
                                  }}
                                />
                                <Chip
                                  label={tSessions("speechesCount", {
                                    count: speechCount,
                                  })}
                                  size="small"
                                  sx={{
                                    fontSize: "0.6875rem",
                                    height: 22,
                                    background: `${colors.primaryLight}20`,
                                    color: colors.primaryLight,
                                  }}
                                />
                                <Chip
                                  label={tSessions("speakersCount", {
                                    count: section.speaker_count ?? 0,
                                  })}
                                  size="small"
                                  sx={{ fontSize: "0.6875rem", height: 22 }}
                                />
                                <Chip
                                  label={tSessions("partiesCount", {
                                    count: section.party_count ?? 0,
                                  })}
                                  size="small"
                                  sx={{ fontSize: "0.6875rem", height: 22 }}
                                />
                                {!hasSpeechContent && speeches.length > 0 && (
                                  <Typography
                                    sx={{
                                      ...commonStyles.compactTextLg,
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {tSessions("speechContentPending")}
                                  </Typography>
                                )}
                                {!hasSpeechContent &&
                                  speeches.length > 0 &&
                                  vaskiLatestSpeechDate && (
                                    <Typography
                                      sx={{
                                        ...commonStyles.compactTextLg,
                                        color: colors.textTertiary,
                                      }}
                                    >
                                      {speechContentLatestLabel(
                                        formatDate(vaskiLatestSpeechDate),
                                      )}
                                    </Typography>
                                  )}
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1.5,
                                  flexWrap: "wrap",
                                  mt: 0.75,
                                }}
                              >
                                {section.agenda_key && (
                                  <Typography
                                    sx={{
                                      ...commonStyles.compactTextLg,
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {tSessions("agendaKeyLine", {
                                      value: section.agenda_key,
                                    })}
                                  </Typography>
                                )}
                                {section.vaski_id !== undefined &&
                                  section.vaski_id !== null && (
                                    <Typography
                                      sx={{
                                        ...commonStyles.compactTextLg,
                                        color: colors.textTertiary,
                                      }}
                                    >
                                      {tSessions("vaskiIdLine", {
                                        value: section.vaski_id,
                                      })}
                                    </Typography>
                                  )}
                                {section.modified_datetime && (
                                  <Typography
                                    sx={{
                                      ...commonStyles.compactTextLg,
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {tSessions("sectionUpdatedLine", {
                                      value: formatDateTime(
                                        section.modified_datetime,
                                      ),
                                    })}
                                  </Typography>
                                )}
                              </Box>

                              <Box sx={{ mt: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    toggleSection(section.id, section.key)
                                  }
                                  sx={{
                                    textTransform: "none",
                                    borderColor: colors.primaryLight,
                                    color: colors.primaryLight,
                                    ...commonStyles.compactTextLg,
                                  }}
                                >
                                  {isExpanded
                                    ? tSessions("detailsToggle", {
                                        context: "hide",
                                      })
                                    : tSessions("detailsToggle", {
                                        context: "show",
                                      })}
                                </Button>
                              </Box>

                              <Collapse
                                in={isExpanded}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box sx={{ mt: 1.5 }}>
                                  {sectionErrorReasons.length > 0 && (
                                    <Alert
                                      severity="warning"
                                      sx={{ mb: 1 }}
                                      action={
                                        <Button
                                          color="inherit"
                                          size="small"
                                          onClick={() =>
                                            void loadSectionData(
                                              section.id,
                                              section.key,
                                            )
                                          }
                                          sx={{
                                            ...commonStyles.compactTextMd,
                                            textTransform: "none",
                                          }}
                                        >
                                          {tCommon("retry")}
                                        </Button>
                                      }
                                    >
                                      {tErrors("loadFailedWithReason", {
                                        reason: sectionErrorReasons.join(", "),
                                      })}
                                    </Alert>
                                  )}
                                  {renderVaskiInfo(section, false)}
                                  {renderMinutesInfo(section, false)}
                                  {renderSectionSubSections(section)}
                                  {renderSectionMinutesContent(section)}
                                  {(() => {
                                    const refs = extractSectionDocRefs(section);
                                    return (
                                      <>
                                        {refs.map((ref) => (
                                          <DocumentCard
                                            key={ref.identifier}
                                            docRef={ref}
                                          />
                                        ))}
                                        {refs.length > 0 &&
                                          section.voting_count === 0 && (
                                            <RelatedVotings
                                              identifiers={refs.map(
                                                (r) => r.identifier,
                                              )}
                                            />
                                          )}
                                      </>
                                    );
                                  })()}
                                  {renderSectionLinks(section)}
                                  {renderSectionNotices(session, section.key)}
                                  {renderSectionRollCall(section)}
                                  {loadingVotings.has(section.id) ? (
                                    <Box
                                      sx={{ py: 1, textAlign: "center" }}
                                      role="status"
                                      aria-live="polite"
                                      aria-label={tApp("loading")}
                                    >
                                      <CircularProgress
                                        size={20}
                                        sx={{ color: themedColors.primary }}
                                      />
                                      <Typography
                                        sx={{
                                          ...commonStyles.compactTextXs,
                                          color: colors.textTertiary,
                                        }}
                                      >
                                        {tApp("loading")}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    renderSectionVotings(votings, session)
                                  )}

                                  {loadingSpeeches.has(section.id) ? (
                                    <Box
                                      sx={{ py: 1, textAlign: "center" }}
                                      role="status"
                                      aria-live="polite"
                                      aria-label={tApp("loading")}
                                    >
                                      <CircularProgress
                                        size={20}
                                        sx={{ color: themedColors.primary }}
                                      />
                                      <Typography
                                        sx={{
                                          ...commonStyles.compactTextXs,
                                          color: colors.textTertiary,
                                        }}
                                      >
                                        {tApp("loading")}
                                      </Typography>
                                    </Box>
                                  ) : speeches.length > 0 ? (
                                    <Box
                                      sx={{
                                        mt: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 0.75,
                                      }}
                                    >
                                      {!hasSpeechContent && (
                                        <Typography
                                          sx={{
                                            ...commonStyles.compactTextLg,
                                            color: colors.textTertiary,
                                          }}
                                        >
                                          {tSessions("speechContentPending")}
                                        </Typography>
                                      )}
                                      {!hasSpeechContent &&
                                        vaskiLatestSpeechDate && (
                                          <Typography
                                            sx={{
                                              ...commonStyles.compactTextLg,
                                              color: colors.textTertiary,
                                            }}
                                          >
                                            {speechContentLatestLabel(
                                              formatDate(vaskiLatestSpeechDate),
                                            )}
                                          </Typography>
                                        )}
                                      {speeches.map((speech) => {
                                        const speechTime =
                                          formatSpeechTimeRange(speech);
                                        return (
                                          <Box
                                            key={speech.id}
                                            sx={{
                                              p: 1.25,
                                              borderRadius: 1,
                                              background: "#fff",
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                                mb: speech.content ? 0.75 : 0,
                                              }}
                                            >
                                              <Chip
                                                label={
                                                  speech.ordinal_number ??
                                                  speech.ordinal
                                                }
                                                size="small"
                                                sx={{
                                                  background: `${colors.primaryLight}30`,
                                                  color: colors.primaryLight,
                                                  fontWeight: 600,
                                                  fontSize: "0.625rem",
                                                  height: 18,
                                                  minWidth: 24,
                                                }}
                                              />
                                              <Typography
                                                sx={{
                                                  fontWeight: 600,
                                                  fontSize: "0.8125rem",
                                                  flex: 1,
                                                }}
                                              >
                                                {speech.first_name}{" "}
                                                {speech.last_name}
                                              </Typography>
                                              {speech.party_abbreviation && (
                                                <Chip
                                                  label={
                                                    speech.party_abbreviation
                                                  }
                                                  size="small"
                                                  sx={{
                                                    fontSize: "0.625rem",
                                                    height: 18,
                                                  }}
                                                />
                                              )}
                                              {speechTime && (
                                                <Typography
                                                  sx={{
                                                    fontSize: "0.6875rem",
                                                    color: colors.textTertiary,
                                                  }}
                                                >
                                                  {speechTime}
                                                </Typography>
                                              )}
                                            </Box>
                                            {speech.content && (
                                              <Typography
                                                sx={{
                                                  fontSize: "0.8125rem",
                                                  color: colors.textPrimary,
                                                  whiteSpace: "pre-wrap",
                                                  lineHeight: 1.6,
                                                }}
                                              >
                                                {speech.content}
                                              </Typography>
                                            )}
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  ) : null}
                                </Box>
                              </Collapse>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            );
          })}
        </DataCard>
      )}
    </Box>
  );
};
