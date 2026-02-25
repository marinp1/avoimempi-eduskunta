import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import EventIcon from "@mui/icons-material/Event";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PieChartIcon from "@mui/icons-material/PieChart";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  Link,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DocumentCard, RelatedVotings } from "#client/components/DocumentCards";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
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
  VotingInlineDetails,
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
import { SessionSectionPanel } from "#client/pages/Sessions/components/SessionSectionPanel";
import { refs } from "#client/references";
import { commonStyles } from "#client/theme";
import {
  DataCard,
  MetricCard,
  PageHeader,
  VoteMarginBar,
} from "#client/theme/components";
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

const SPEECH_PAGE_SIZE = 20;

type Member = {
  person_id: number;
  first_name: string;
  last_name: string;
  party_name?: string;
  is_in_government?: number;
  gender?: string;
  profession?: string;
};

type SectionLoadErrorKey =
  | "speeches"
  | "votings"
  | "links"
  | "subSections"
  | "rollCall";

const Home = () => {
  const { t } = useTranslation();
  const speechContentLatestLabel = (date: string) =>
    t("sessions.speechContentLatest", { date });
  const themedColors = useThemedColors();
  const { selectedHallituskausi } = useHallituskausi();

  const [sessions, setSessions] = useState<SessionWithSections[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingComposition, setLoadingComposition] = useState(true);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [vaskiLatestSpeechDate, setVaskiLatestSpeechDate] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);

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
  const [expandedVotingIds, setExpandedVotingIds] = useState<Set<number>>(
    new Set(),
  );
  const [votingDetailsById, setVotingDetailsById] = useState<
    Record<number, VotingInlineDetails>
  >({});
  const [loadingVotingDetails, setLoadingVotingDetails] = useState<Set<number>>(
    new Set(),
  );
  const [expandedMinutesSessions, setExpandedMinutesSessions] = useState<
    Set<string>
  >(new Set());
  const [expandedAttachmentSessions, setExpandedAttachmentSessions] = useState<
    Set<string>
  >(new Set());

  // Fetch latest session date, then load that session
  useEffect(() => {
    const fetchLatestSession = async () => {
      try {
        setLoadingSessions(true);
        const datesRes = await fetch("/api/session-dates/completed");
        if (!datesRes.ok) throw new Error("Failed to fetch dates");
        const allDates: { date: string }[] = await datesRes.json();
        const dates = selectedHallituskausi
          ? allDates.filter((item) =>
              isDateWithinHallituskausi(item.date, selectedHallituskausi),
            )
          : allDates;
        if (dates.length === 0) {
          setSessions([]);
          setSectionLoadErrors({});
          setLatestDate(null);
          setLoadingSessions(false);
          return;
        }
        const latest = dates.sort((a, b) => b.date.localeCompare(a.date))[0]
          .date;
        setLatestDate(latest);

        const sessionsRes = await fetch(`/api/day/${latest}/sessions`);
        if (!sessionsRes.ok) throw new Error("Failed to fetch sessions");
        const payload: {
          sessions: SessionWithSections[];
          vaskiLatestSpeechDate?: string | null;
        } = await sessionsRes.json();
        setSessions(payload.sessions || []);
        setSectionLoadErrors({});
        setVaskiLatestSpeechDate(payload.vaskiLatestSpeechDate ?? null);
      } catch {
        setError(t("home.loadingError"));
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchLatestSession();
  }, [selectedHallituskausi, t]);

  const [compositionError, setCompositionError] = useState<string | null>(null);

  const loadComposition = useCallback(async () => {
    try {
      setLoadingComposition(true);
      setCompositionError(null);
      const today = new Date().toISOString().split("T")[0];
      let asOfDate = today;
      if (selectedHallituskausi) {
        const candidate =
          latestDate ||
          selectedHallituskausi.endDate ||
          selectedHallituskausi.startDate;
        asOfDate = candidate;
        if (asOfDate < selectedHallituskausi.startDate) {
          asOfDate = selectedHallituskausi.startDate;
        }
        if (
          selectedHallituskausi.endDate &&
          asOfDate > selectedHallituskausi.endDate
        ) {
          asOfDate = selectedHallituskausi.endDate;
        }
      }
      const res = await fetch(`/api/composition/${asOfDate}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Member[] = await res.json();
      setMembers(data);
    } catch {
      setMembers([]);
      setCompositionError(t("home.loadingError"));
    } finally {
      setLoadingComposition(false);
    }
  }, [latestDate, selectedHallituskausi, t]);

  // Fetch current composition
  useEffect(() => {
    void loadComposition();
  }, [loadComposition]);

  // Composition stats
  const stats = React.useMemo(() => {
    const totalMembers = members.length;
    const inGovernment = members.filter((m) => m.is_in_government === 1).length;
    const inOpposition = totalMembers - inGovernment;

    const partyGroups = members.reduce(
      (acc, m) => {
        const party = m.party_name || "Tuntematon";
        if (!acc[party]) acc[party] = { total: 0, inGovernment: 0 };
        acc[party].total++;
        if (m.is_in_government === 1) acc[party].inGovernment++;
        return acc;
      },
      {} as Record<string, { total: number; inGovernment: number }>,
    );

    const sortedParties = Object.entries(partyGroups).sort(
      ([, a], [, b]) => b.total - a.total,
    );

    return {
      totalMembers,
      inGovernment,
      inOpposition,
      partyGroups: sortedParties,
    };
  }, [members]);

  const formatDate = formatDateLongFi;
  const formatTime = formatTimeFi;
  const formatDateTime = formatDateTimeCompactFi;

  const formatSpeechTimeRange = (speech: Speech) => {
    const start = formatTime(speech.start_time);
    if (start === "-") return null;
    const end = formatTime(speech.end_time);
    return end !== "-" ? `${start} - ${end}` : start;
  };

  const getSectionSubSectionRows = (section: Section): SubSection[] => {
    const fromDb = sectionSubSections[section.id] || [];
    if (fromDb.length > 0) return fromDb;
    return buildFallbackSubSections(section);
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
    error instanceof Error ? error.message : t("errors.unknownError");

  const sectionLoadErrorLabels: Record<SectionLoadErrorKey, string> = {
    speeches: t("sessions.loadErrorSpeeches"),
    votings: t("sessions.loadErrorVotings"),
    links: t("sessions.loadErrorLinks"),
    subSections: t("sessions.loadErrorSubSections"),
    rollCall: t("sessions.loadErrorRollCall"),
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
    const section = sessions
      .flatMap((session) => session.sections || [])
      .find(
        (candidate) =>
          candidate.id === sectionId || candidate.key === sectionKey,
      );

    if (!sectionSpeechData[sectionId]) {
      setLoadingSpeeches((prev) => new Set(prev).add(sectionId));
      try {
        const data = await fetchSpeeches(sectionId, sectionKey);
        setSectionSpeechData((prev) => ({ ...prev, [sectionId]: data }));
        clearSectionLoadError(sectionId, "speeches");
      } catch (error) {
        setSectionLoadError(sectionId, "speeches", getErrorReason(error));
      } finally {
        setLoadingSpeeches((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
      }
    }

    if (!sectionVotings[sectionId]) {
      setLoadingVotings((prev) => new Set(prev).add(sectionId));
      try {
        const res = await fetch(`/api/sections/${sectionKey}/votings`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const votings: Voting[] = await res.json();
        setSectionVotings((prev) => ({ ...prev, [sectionId]: votings }));
        clearSectionLoadError(sectionId, "votings");
      } catch (error) {
        setSectionLoadError(sectionId, "votings", getErrorReason(error));
      } finally {
        setLoadingVotings((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
      }
    }

    if (!sectionLinks[sectionKey]) {
      setLoadingLinks((prev) => new Set(prev).add(sectionKey));
      try {
        const links = await fetchSectionLinks(sectionKey);
        setSectionLinks((prev) => ({ ...prev, [sectionKey]: links }));
        clearSectionLoadError(sectionId, "links");
      } catch (error) {
        setSectionLoadError(sectionId, "links", getErrorReason(error));
      } finally {
        setLoadingLinks((prev) => {
          const next = new Set(prev);
          next.delete(sectionKey);
          return next;
        });
      }
    }

    const hasSubSectionsData = Object.hasOwn(sectionSubSections, sectionId);
    if (!hasSubSectionsData) {
      setLoadingSubSections((prev) => new Set(prev).add(sectionId));
      try {
        const subSections = await fetchSectionSubSections(sectionKey);
        setSectionSubSections((prev) => ({
          ...prev,
          [sectionId]: subSections,
        }));
        clearSectionLoadError(sectionId, "subSections");
      } catch (error) {
        setSectionLoadError(sectionId, "subSections", getErrorReason(error));
      } finally {
        setLoadingSubSections((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
      }
    }

    const hasRollCallData = Object.hasOwn(sectionRollCalls, sectionId);
    if (isRollCallSection(section) && !hasRollCallData) {
      setLoadingRollCalls((prev) => new Set(prev).add(sectionId));
      try {
        const rollCall = await fetchSectionRollCall(sectionKey);
        setSectionRollCalls((prev) => ({ ...prev, [sectionId]: rollCall }));
        clearSectionLoadError(sectionId, "rollCall");
      } catch (error) {
        setSectionLoadError(sectionId, "rollCall", getErrorReason(error));
      } finally {
        setLoadingRollCalls((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
      }
    }
  };

  const toggleSection = (sectionId: number, sectionKey: string) => {
    const isExpanding = !expandedSections.has(sectionId);

    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });

    if (isExpanding) {
      void loadSectionData(sectionId, sectionKey);
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

  const fetchVotingDetails = async (votingId: number) => {
    if (votingDetailsById[votingId] || loadingVotingDetails.has(votingId))
      return;
    setLoadingVotingDetails((prev) => new Set(prev).add(votingId));
    try {
      const res = await fetch(`/api/votings/${votingId}/details`);
      if (!res.ok) return;
      const data: VotingInlineDetails = await res.json();
      setVotingDetailsById((prev) => ({ ...prev, [votingId]: data }));
    } finally {
      setLoadingVotingDetails((prev) => {
        const next = new Set(prev);
        next.delete(votingId);
        return next;
      });
    }
  };

  const toggleVotingDetails = (votingId: number) => {
    const nextExpanded = !expandedVotingIds.has(votingId);
    setExpandedVotingIds((prev) => {
      const next = new Set(prev);
      if (next.has(votingId)) next.delete(votingId);
      else next.add(votingId);
      return next;
    });
    if (nextExpanded) {
      void fetchVotingDetails(votingId);
    }
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
          {t("sessions.vaskiDocument")}
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
                {t("sessions.vaskiTypeLine", {
                  value:
                    section.vaski_document_type_name ||
                    section.vaski_document_type_code ||
                    t("common.none"),
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
                {t("sessions.vaskiTunnusLine", {
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
                {t("sessions.vaskiDocNumberLine", { value: docNumber })}
              </Typography>
            )}
            {section.vaski_status && (
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textSecondary,
                }}
              >
                {t("sessions.vaskiStatusLine", { value: section.vaski_status })}
              </Typography>
            )}
            {section.vaski_creation_date && (
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textSecondary,
                }}
              >
                {t("sessions.vaskiCreatedLine", {
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
            {t("sessions.vaskiAuthorLine", { value: authorLine })}
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
            {t("sessions.vaskiSourceReferenceLine", {
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
            {t("sessions.vaskiSummaryLine", { value: section.vaski_summary })}
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
              {t("sessions.vaskiSubjects")}:
            </Typography>
            {subjects.map((subject) => (
              <Chip
                key={subject}
                label={subject}
                size="small"
                sx={{ ...commonStyles.compactChipSm, fontSize: "0.625rem" }}
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
          {t("sessions.minutesMetadata")}
        </Typography>
        {minutesItemTitle && minutesItemTitle !== section.title && (
          <Typography
            sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}
          >
            {t("sessions.minutesItemTitleLine", { value: minutesItemTitle })}
          </Typography>
        )}
        {(section.minutes_processing_phase_code ||
          section.minutes_general_processing_phase_code) && (
          <Typography
            sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}
          >
            {t("sessions.minutesProcessingCodesLine", {
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
          {t("sessions.minutesContent")}
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
                ? t("sessions.minutesReferenceMigratedRollCall")
                : t("sessions.minutesReferenceNotMigrated");
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
          {t("sessions.subSections")}
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
                <th>{t("sessions.subSectionNumber")}</th>
                <th>{t("sessions.subSectionTitle")}</th>
                <th>{t("sessions.subSectionDocument")}</th>
                <th>{t("sessions.subSectionType")}</th>
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
          {t("sessions.sessionNotices")}
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
                      ...commonStyles.compactChipSm,
                      fontSize: "0.625rem",
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
                    {t("sessions.noticeSentLine", {
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
                    {t("sessions.noticeValidUntilLine", {
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
          {t("sessions.sectionNotices")}
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
                      ...commonStyles.compactChipSm,
                      fontSize: "0.625rem",
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
                    {t("sessions.noticeSentLine", {
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
                    {t("sessions.noticeValidUntilLine", {
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

  const renderSessionMinutesOutline = (session: SessionWithSections) => {
    const items = (session.minutes_items || [])
      .slice()
      .sort(compareMinutesItems);
    if (items.length === 0) return null;
    const isExpanded = expandedMinutesSessions.has(session.key);
    const minutesCollapseId = `session-minutes-${session.id}`;

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
            {t("sessions.minutesOutline")}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toggleSessionMinutes(session.key)}
            aria-expanded={isExpanded}
            aria-controls={minutesCollapseId}
            sx={{
              ...commonStyles.compactOutlinedPrimaryButton,
            }}
          >
            {isExpanded
              ? t("sessions.minutesToggle", { context: "hide" })
              : t("sessions.minutesToggle", { context: "show" })}
          </Button>
        </Box>
        <Collapse
          id={minutesCollapseId}
          in={isExpanded}
          timeout="auto"
          unmountOnExit
        >
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
                        ...commonStyles.compactChipXs,
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
                      t("sessions.noTitle")}
                  </Typography>
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
                      {t("sessions.identifierLine", {
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
                        {t("sessions.processingLine", {
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
    const attachmentsCollapseId = `session-attachments-${session.id}`;

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
            {t("sessions.minutesAttachments")}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toggleSessionAttachments(session.key)}
            aria-expanded={isExpanded}
            aria-controls={attachmentsCollapseId}
            sx={{
              ...commonStyles.compactOutlinedPrimaryButton,
            }}
          >
            {isExpanded
              ? t("sessions.attachmentsToggle", { context: "hide" })
              : t("sessions.attachmentsToggle", { context: "show" })}
          </Button>
        </Box>
        <Collapse
          id={attachmentsCollapseId}
          in={isExpanded}
          timeout="auto"
          unmountOnExit
        >
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
                    t("sessions.attachment")}
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
                      {t("sessions.relatedDocumentLine", {
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
                      {t("sessions.fileNameLine", {
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
                      {t("sessions.nativeIdLine", {
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
          aria-label={t("app.loading")}
        >
          <CircularProgress size={18} sx={{ color: themedColors.primary }} />
          <Typography
            sx={{ ...commonStyles.compactTextXs, color: colors.textTertiary }}
          >
            {t("app.loading")}
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
          {t("sessions.sectionDocuments")}
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
                      ...commonStyles.compactChipXs,
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
                      {t("sessions.vaskiCreatedLine", {
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
          aria-label={t("app.loading")}
        >
          <CircularProgress size={18} sx={{ color: themedColors.primary }} />
          <Typography
            sx={{ ...commonStyles.compactTextXs, color: colors.textTertiary }}
          >
            {t("app.loading")}
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
        ? t("sessions.rollCallLate")
        : t("sessions.rollCallAbsent");

    const formatAbsenceReason = (reasonCode?: string | null) => {
      if (!reasonCode) return "-";
      const code = reasonCode.toLowerCase();
      if (code === "e") {
        return t("sessions.rollCallReasonE");
      }
      if (code === "h") {
        return t("sessions.rollCallReasonH");
      }
      return t("sessions.rollCallReasonUnknown");
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
          {t("sessions.rollCallReport")}
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
            {t("sessions.rollCallDocumentLine", {
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
            {t("sessions.rollCallOpenDocument")}
          </EduskuntaSourceLink>
          {report.roll_call_start_time && (
            <Typography
              sx={{
                ...commonStyles.compactTextLg,
                color: colors.textSecondary,
              }}
            >
              {t("sessions.rollCallStartLine", {
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
              {t("sessions.rollCallEndLine", {
                value: formatTime(report.roll_call_end_time),
              })}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.75 }}>
          <Chip
            label={t("sessions.rollCallAbsentLine", {
              count: report.absent_count,
            })}
            size="small"
            sx={{
              ...commonStyles.compactChipSm,
              fontSize: "0.6875rem",
              background: `${themedColors.error}15`,
              color: themedColors.error,
            }}
          />
          <Chip
            label={t("sessions.rollCallLateLine", { count: report.late_count })}
            size="small"
            sx={{
              ...commonStyles.compactChipSm,
              fontSize: "0.6875rem",
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
            {t("sessions.rollCallNoEntries")}
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
              <Box
                component="caption"
                sx={{
                  ...commonStyles.compactTextXs,
                  textAlign: "left",
                  color: colors.textSecondary,
                  pb: 0.5,
                }}
              >
                {t("sessions.rollCallReport")}: {report.title || "-"}
              </Box>
              <thead>
                <tr>
                  <th>{t("sessions.rollCallTableNumber")}</th>
                  <th>{t("sessions.rollCallTableName")}</th>
                  <th>{t("sessions.rollCallTableParty")}</th>
                  <th>{t("sessions.rollCallTableType")}</th>
                  <th>{t("sessions.rollCallTableCode")}</th>
                  <th>{t("sessions.rollCallTableReason")}</th>
                  <th>{t("sessions.rollCallTableArrival")}</th>
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
            {t("sessions.rollCallReasonLegend")}: <strong>(e)</strong>{" "}
            {t("sessions.rollCallReasonE")}; <strong>(h)</strong>{" "}
            {t("sessions.rollCallReasonH")}
          </Typography>
          {unknownReasonCodes.length > 0 && (
            <Typography
              sx={{
                mt: 0.5,
                ...commonStyles.compactTextLg,
                color: colors.textTertiary,
              }}
            >
              {t("sessions.rollCallUnknownCodesLine", {
                value: unknownReasonCodes.map((code) => `(${code})`).join(", "),
              })}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderSectionVotings = (
    votings: Voting[],
    session: SessionWithSections,
  ) => {
    if (votings.length === 0) return null;

    return (
      <Box
        sx={{
          mt: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
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
          {t("sessions.votingsLabel", { count: votings.length })}
        </Typography>
        {votings.map((voting) => {
          const isPassed = voting.n_yes > voting.n_no;
          const isExpanded = expandedVotingIds.has(voting.id);
          const details = votingDetailsById[voting.id];
          const detailsLoading = loadingVotingDetails.has(voting.id);
          const votingDetailsId = `home-voting-details-${voting.id}`;
          const votingToggleId = `home-voting-toggle-${voting.id}`;
          return (
            <Box
              key={voting.id}
              sx={{
                p: 1.25,
                borderRadius: 1,
                border: `1px solid ${isPassed ? `${themedColors.success}40` : `${themedColors.error}40`}`,
                background: isPassed
                  ? `${themedColors.success}08`
                  : `${themedColors.error}08`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 0.75,
                  flexWrap: "wrap",
                }}
              >
                <HowToVoteIcon
                  sx={{
                    fontSize: 16,
                    color: isPassed ? themedColors.success : themedColors.error,
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    flex: 1,
                    minWidth: 0,
                    color: colors.textPrimary,
                  }}
                >
                  {voting.title}
                </Typography>
                <Button
                  size="small"
                  onClick={() => toggleVotingDetails(voting.id)}
                  id={votingToggleId}
                  aria-expanded={isExpanded}
                  aria-controls={votingDetailsId}
                  sx={{
                    ...commonStyles.compactActionButton,
                    ...commonStyles.compactTextMd,
                  }}
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
                >
                  {isExpanded
                    ? t("common.detailsToggle", { context: "hide" })
                    : t("common.detailsToggle", { context: "show" })}
                </Button>
                <Button
                  size="small"
                  sx={{
                    ...commonStyles.compactActionButton,
                    ...commonStyles.compactTextMd,
                  }}
                  endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                  href={refs.voting(voting.id, session.key, session.date)}
                >
                  {t("common.openView")}
                </Button>
              </Box>
              <VoteMarginBar
                yes={voting.n_yes}
                no={voting.n_no}
                empty={voting.n_abstain}
                absent={voting.n_absent}
                height={8}
              />
              <Collapse
                id={votingDetailsId}
                aria-labelledby={votingToggleId}
                in={isExpanded}
                timeout="auto"
                unmountOnExit
              >
                <Box
                  sx={{
                    mt: 0.75,
                    p: 1,
                    borderRadius: 1,
                    border: `1px solid ${colors.dataBorder}60`,
                    backgroundColor: `${colors.primaryLight}04`,
                  }}
                >
                  {detailsLoading && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={12} />
                      <Typography
                        sx={{
                          ...commonStyles.compactTextMd,
                          color: colors.textSecondary,
                        }}
                      >
                        {t("common.loadingVotingDetails")}
                      </Typography>
                    </Box>
                  )}
                  {!detailsLoading && details && (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        <Chip
                          size="small"
                          label={`Jaa ${details.voting.n_yes}`}
                          sx={{
                            ...commonStyles.compactChipSm,
                            color: colors.success,
                            borderColor: colors.success,
                          }}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`Ei ${details.voting.n_no}`}
                          sx={{
                            ...commonStyles.compactChipSm,
                            color: colors.error,
                            borderColor: colors.error,
                          }}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={t("common.emptyCount", {
                            count: details.voting.n_abstain,
                          })}
                          sx={{ ...commonStyles.compactChipSm }}
                        />
                        <Chip
                          size="small"
                          label={`Poissa ${details.voting.n_absent}`}
                          sx={{ ...commonStyles.compactChipSm }}
                        />
                      </Box>
                      {details.governmentOpposition && (
                        <Typography
                          sx={{
                            ...commonStyles.compactTextMd,
                            color: colors.textSecondary,
                          }}
                        >
                          Hallitus:{" "}
                          {details.governmentOpposition.government_yes} jaa /{" "}
                          {details.governmentOpposition.government_no} ei,
                          Oppositio:{" "}
                          {details.governmentOpposition.opposition_yes} jaa /{" "}
                          {details.governmentOpposition.opposition_no} ei
                        </Typography>
                      )}
                      <VotingResultsTable
                        partyBreakdown={details.partyBreakdown}
                        memberVotes={details.memberVotes}
                      />
                      {details.relatedVotings.length > 0 && (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {details.relatedVotings.slice(0, 6).map((related) => (
                            <Chip
                              key={related.id}
                              size="small"
                              variant="outlined"
                              label={`${related.id}: ${related.n_yes}-${related.n_no}`}
                              aria-label={t("sessions.relatedVotingAria", {
                                id: related.id,
                                yes: related.n_yes,
                                no: related.n_no,
                              })}
                              sx={{ ...commonStyles.compactChipSm }}
                            />
                          ))}
                          {details.relatedVotings.length > 6 && (
                            <Typography
                              sx={{
                                ...commonStyles.compactTextXs,
                                color: colors.textSecondary,
                              }}
                            >
                              +{details.relatedVotings.length - 6} muuta
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <PageHeader title={t("home.title")} subtitle={t("home.subtitle")} />

      {error && (
        <Alert severity="error" role="status" aria-live="polite" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ─── Parliament Composition ─── */}
      {loadingComposition ? (
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              mb: 2.5,
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(3, minmax(0, 1fr))",
              },
            }}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={`composition-metric-skeleton-${index}`}
                variant="rounded"
                animation="wave"
                height={82}
              />
            ))}
          </Box>
          <DataCard sx={{ p: 0, overflow: "hidden" }}>
            <Box
              sx={{ p: 2.5, borderBottom: `1px solid ${colors.dataBorder}` }}
            >
              <Skeleton variant="text" width={180} height={28} />
            </Box>
            <Box
              sx={{
                p: 2,
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
              }}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={`composition-party-skeleton-${index}`}
                  variant="rounded"
                  animation="wave"
                  height={42}
                />
              ))}
            </Box>
          </DataCard>
        </Box>
      ) : compositionError ? (
        <Box sx={{ mb: 4 }}>
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void loadComposition()}
                sx={{ ...commonStyles.compactTextMd, textTransform: "none" }}
              >
                {t("common.retry")}
              </Button>
            }
          >
            {compositionError}
          </Alert>
        </Box>
      ) : stats.totalMembers > 0 ? (
        <Box sx={{ mb: 4 }}>
          {/* Summary row */}
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <MetricCard
                label={t("home.totalMPs")}
                value={stats.totalMembers}
                icon={<GroupsIcon fontSize="small" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <MetricCard
                label={t("home.government")}
                value={stats.inGovernment}
                icon={<AccountBalanceIcon fontSize="small" />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <MetricCard
                label={t("home.opposition")}
                value={stats.inOpposition}
                icon={<PieChartIcon fontSize="small" />}
              />
            </Grid>
          </Grid>

          {/* Party breakdown */}
          <DataCard sx={{ p: 0, overflow: "hidden" }}>
            <Box
              sx={{ p: 2.5, borderBottom: `1px solid ${colors.dataBorder}` }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: colors.textPrimary,
                  fontSize: "1rem",
                }}
              >
                {t("home.partyBreakdown")}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 2,
                ...commonStyles.responsiveGrid(250),
                gap: 1.25,
              }}
            >
              {stats.partyGroups.map(([party, data]) => (
                <Box
                  key={party}
                  sx={{
                    p: 1.5,
                    border: `1px solid ${colors.dataBorder}`,
                    borderRadius: 1,
                    background: colors.backgroundSubtle,
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    columnGap: 1,
                    rowGap: 0.75,
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 0,
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: colors.textPrimary,
                        wordBreak: "break-word",
                      }}
                    >
                      {party}
                    </Typography>
                    {data.inGovernment > 0 ? (
                      <Chip
                        label={t("home.governmentChip")}
                        size="small"
                        sx={{
                          ...commonStyles.compactChipXs,
                          background: `${themedColors.success}20`,
                          color: themedColors.success,
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      <Chip
                        label={t("home.oppositionChip")}
                        size="small"
                        sx={{
                          ...commonStyles.compactChipXs,
                          background: `${themedColors.warning}20`,
                          color: themedColors.warning,
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                  <Chip
                    label={t("home.seatCount", { count: data.total })}
                    size="small"
                    sx={{
                      background: colors.primaryLight,
                      color: "#fff",
                      fontWeight: 700,
                      flexShrink: 0,
                      ...commonStyles.compactTextLg,
                    }}
                  />
                </Box>
              ))}
            </Box>
          </DataCard>
        </Box>
      ) : (
        <Box sx={{ mb: 4 }}>
          <Alert severity="info">{t("home.noData")}</Alert>
        </Box>
      )}

      {/* ─── Latest Session ─── */}
      <DataCard sx={{ p: 0, overflow: "hidden" }}>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${colors.dataBorder}` }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
            <EventIcon sx={{ fontSize: 20, color: colors.primaryLight }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: colors.textPrimary,
                fontSize: "1rem",
              }}
            >
              {t("home.latestCompletedSession")}
            </Typography>
          </Box>
          {latestDate && (
            <Typography
              sx={{ fontSize: "0.8125rem", color: colors.textSecondary }}
            >
              {formatDate(latestDate)}
            </Typography>
          )}
        </Box>

        {loadingSessions ? (
          <Box sx={{ ...commonStyles.centeredFlex, py: 4 }}>
            <CircularProgress size={24} sx={{ color: themedColors.primary }} />
          </Box>
        ) : sessions.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography sx={{ color: colors.textSecondary }}>
              {t("home.noData")}
            </Typography>
          </Box>
        ) : (
          sessions.map((session) => (
            <Box key={session.id}>
              {/* Session header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${colors.dataBorder}`,
                  background: colors.backgroundSubtle,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={refs.session(session.key, session.date)}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    color: colors.textPrimary,
                  }}
                >
                  {session.key}
                </Link>
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
                {session.section_count > 0 && (
                  <Chip
                    label={t("home.sectionCount", {
                      count: session.section_count,
                    })}
                    size="small"
                    sx={{
                      ...commonStyles.compactChipMd,
                      background: `${colors.primaryLight}20`,
                      color: colors.primaryLight,
                    }}
                  />
                )}
                {session.voting_count > 0 && (
                  <Chip
                    icon={<HowToVoteIcon sx={{ fontSize: 14 }} />}
                    label={t("home.votingCount", {
                      count: session.voting_count,
                    })}
                    size="small"
                    sx={{
                      ...commonStyles.compactChipMd,
                      background: `${themedColors.success}15`,
                      color: themedColors.success,
                    }}
                  />
                )}
                {session.agenda_state && (
                  <Typography
                    sx={{
                      ...commonStyles.compactTextLg,
                      color: colors.textSecondary,
                    }}
                  >
                    {t("sessions.agendaStateLine", {
                      value: session.agenda_state,
                    })}
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
                        {t("sessions.speechContentPending")}
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
              {session.sections?.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const speechData = sectionSpeechData[section.id];
                const speeches = speechData?.speeches || [];
                const hasSpeechContent = speeches.some(
                  (speech) => speech.content,
                );
                const votings = sectionVotings[section.id] || [];
                const sectionErrorReasons = (
                  Object.entries(sectionLoadErrors[section.id] || {}) as Array<
                    [SectionLoadErrorKey, string]
                  >
                )
                  .filter(([, reason]) => Boolean(reason))
                  .map(
                    ([key, reason]) =>
                      `${sectionLoadErrorLabels[key]} (${reason})`,
                  );
                const vaskiInfoCompact = renderVaskiInfo(section, true);
                const vaskiInfoContent = renderVaskiInfo(section, false);
                const minutesInfoCompact = renderMinutesInfo(section, true);
                const minutesInfoContent = renderMinutesInfo(section, false);
                const sectionSubSectionsContent = renderSectionSubSections(section);
                const sectionMinutesContent = renderSectionMinutesContent(section);
                const docRefs = extractSectionDocRefs(section);
                const sectionLinksContent = renderSectionLinks(section);
                const sectionNoticesContent = renderSectionNotices(
                  session,
                  section.key,
                );
                const sectionRollCallContent = renderSectionRollCall(section);
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
                            ...commonStyles.compactChipMd,
                            ...commonStyles.compactTextMd,
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
                              t("sessions.noTitle")}
                          </Typography>
                          {section.minutes_item_order != null && (
                            <Typography
                              sx={{
                                ...commonStyles.compactTextLg,
                                color: colors.textTertiary,
                              }}
                            >
                              {t("sessions.minutesOrder")}{" "}
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
                                {t("sessions.processingLine", {
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
                              {t("sessions.resolutionLine", {
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
                              label={t("sessions.votingsCount", {
                                count: section.voting_count ?? 0,
                              })}
                              size="small"
                              sx={{
                                ...commonStyles.compactChipSm,
                                fontSize: "0.6875rem",
                                background: `${themedColors.success}15`,
                                color: themedColors.success,
                              }}
                            />
                            <Chip
                              label={t("sessions.speechesCount", {
                                count: section.speech_count ?? 0,
                              })}
                              size="small"
                              sx={{
                                ...commonStyles.compactChipSm,
                                fontSize: "0.6875rem",
                                background: `${colors.primaryLight}20`,
                                color: colors.primaryLight,
                              }}
                            />
                            <Chip
                              label={t("sessions.speakersCount", {
                                count: section.speaker_count ?? 0,
                              })}
                              size="small"
                              sx={{
                                ...commonStyles.compactChipSm,
                                fontSize: "0.6875rem",
                              }}
                            />
                            <Chip
                              label={t("sessions.partiesCount", {
                                count: section.party_count ?? 0,
                              })}
                              size="small"
                              sx={{
                                ...commonStyles.compactChipSm,
                                fontSize: "0.6875rem",
                              }}
                            />
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
                                {t("common.retry")}
                              </Button>
                            }
                          >
                            {t("errors.loadFailedWithReason", {
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
                            aria-label={t("app.loading")}
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
                              {t("app.loading")}
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
                            aria-label={t("app.loading")}
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
                              {t("app.loading")}
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
                              {t("sessions.speeches")} (
                              {speechData?.total ?? speeches.length})
                            </Typography>
                            {!hasSpeechContent && (
                              <Typography
                                sx={{
                                  ...commonStyles.compactTextLg,
                                  color: colors.textTertiary,
                                }}
                              >
                                {t("sessions.speechContentPending")}
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
                                        ...commonStyles.compactChipXs,
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
                                          ...commonStyles.compactChipXs,
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
                                <Box
                                  sx={{ textAlign: "center", mt: 1 }}
                                  aria-live="polite"
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void loadMoreSpeeches(
                                        section.id,
                                        section.key,
                                      );
                                    }}
                                    disabled={loadingMoreSpeeches.has(
                                      section.id,
                                    )}
                                    sx={{
                                      ...commonStyles.compactOutlinedPrimaryButton,
                                      fontSize: "0.8125rem",
                                    }}
                                  >
                                    {loadingMoreSpeeches.has(section.id) ? (
                                      <CircularProgress
                                        size={16}
                                        sx={{ mr: 1 }}
                                      />
                                    ) : null}
                                    {t("sessions.loadMoreProgress", {
                                      loaded: speeches.length,
                                      total: speechData.total,
                                    })}
                                  </Button>
                                  <Typography
                                    sx={{
                                      mt: 0.5,
                                      fontSize: "0.6875rem",
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {t("sessions.loadMorePageProgress", {
                                      current: speechData.page,
                                      total: speechData.totalPages,
                                    })}
                                  </Typography>
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
                              {t("sessions.noSectionContent")}
                            </Typography>
                          )}
                  </SessionSectionPanel>
                );
              })}
            </Box>
          ))
        )}
      </DataCard>
    </Box>
  );
};

export default Home;
