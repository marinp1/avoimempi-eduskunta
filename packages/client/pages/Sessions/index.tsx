import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EventIcon from "@mui/icons-material/Event";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TimelineIcon from "@mui/icons-material/Timeline";
import ViewListIcon from "@mui/icons-material/ViewList";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { refs } from "#client/references";
import { commonStyles } from "#client/theme";
import { DataCard, PageHeader, VoteMarginBar } from "#client/theme/components";
import { colors } from "#client/theme/index";
import { useThemedColors } from "#client/theme/ThemeContext";

type SessionWithSections = {
  id: number;
  number?: number;
  key: string;
  date: string;
  year?: number;
  type?: string;
  state?: string;
  description?: string;
  start_time_actual?: string;
  start_time_reported?: string;
  agenda_title?: string;
  agenda_state?: string;
  section_count: number;
  voting_count: number;
  sections?: Section[];
  documents?: SessionDocument[];
  notices?: SessionNotice[];
  minutes_items?: SessionMinutesItem[];
  minutes_attachments?: SessionMinutesAttachment[];
};

type Section = {
  id: number;
  key: string;
  ordinal: number;
  title: string;
  note?: string | null;
  processing_title?: string;
  identifier?: string;
  resolution?: string;
  agenda_key?: string;
  modified_datetime?: string;
  vaski_id?: number;
  vaski_document_id?: number | null;
  voting_count?: number;
  speech_count?: number;
  speaker_count?: number;
  party_count?: number;
  vaski_document_type_name?: string | null;
  vaski_document_type_code?: string | null;
  vaski_eduskunta_tunnus?: string | null;
  vaski_document_number?: number | null;
  vaski_parliamentary_year?: string | null;
  vaski_title?: string | null;
  vaski_summary?: string | null;
  vaski_author_first_name?: string | null;
  vaski_author_last_name?: string | null;
  vaski_author_role?: string | null;
  vaski_author_organization?: string | null;
  vaski_creation_date?: string | null;
  vaski_status?: string | null;
  vaski_source_reference?: string | null;
  vaski_subjects?: string | null;
};

type SessionDocument = {
  document_kind: "agenda" | "minutes" | "roll_call";
  id: number;
  type_slug: string;
  type_name_fi?: string | null;
  root_family?: string | null;
  eduskunta_tunnus?: string | null;
  document_type_code?: string | null;
  document_number_text?: string | null;
  parliamentary_year_text?: string | null;
  title?: string | null;
  status_text?: string | null;
  created_at?: string | null;
};

type SessionNotice = {
  id: number;
  session_key: string;
  section_key?: string | null;
  notice_type?: string | null;
  text_fi?: string | null;
  valid_until?: string | null;
  sent_at?: string | null;
  created_datetime?: string | null;
  modified_datetime?: string | null;
};

type SessionMinutesItem = {
  id: number;
  session_key: string;
  minutes_document_id: number;
  item_type: string;
  ordinal?: number | null;
  title?: string | null;
  identifier_text?: string | null;
  processing_title?: string | null;
  note?: string | null;
  source_item_id?: number | null;
  source_parent_item_id?: number | null;
  section_id?: number | null;
  section_key?: string | null;
};

type SessionMinutesAttachment = {
  id: number;
  session_key: string;
  minutes_document_id: number;
  minutes_item_id?: number | null;
  title?: string | null;
  related_document_tunnus?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  native_id?: string | null;
};

type SectionDocumentLink = {
  id: number;
  section_key: string;
  label?: string | null;
  url?: string | null;
  document_tunnus?: string | null;
  document_id?: number | null;
  document_type_name?: string | null;
  document_type_code?: string | null;
  document_title?: string | null;
  document_created_at?: string | null;
  source_type?: string | null;
};

type Speech = {
  id: number;
  ordinal: number;
  ordinal_number?: number;
  first_name: string;
  last_name: string;
  party_abbreviation?: string;
  speech_type?: string;
  content?: string;
};

type Voting = {
  id: number;
  number: number;
  title: string;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
};

type SpeechData = {
  speeches: Speech[];
  total: number;
  page: number;
  totalPages: number;
};

const SPEECH_PAGE_SIZE = 20;

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

/** Calendar month grid component */
const CalendarGrid: React.FC<{
  validDates: Set<string>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}> = ({ validDates, selectedDate, onSelectDate }) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) =>
        new Intl.DateTimeFormat("fi-FI", { month: "short" })
          .format(new Date(2020, monthIndex, 1))
          .replace(".", ""),
      ),
    [],
  );
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, dayIndex) =>
        new Intl.DateTimeFormat("fi-FI", { weekday: "short" })
          .format(new Date(2020, 0, dayIndex + 6))
          .replace(".", ""),
      ),
    [],
  );

  const [viewYear, setViewYear] = useState(() =>
    parseInt(selectedDate.slice(0, 4)),
  );
  const [viewMonth, setViewMonth] = useState(
    () => parseInt(selectedDate.slice(5, 7)) - 1,
  );

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Monday-based: 0=Mon, 6=Sun
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthLast = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let d = 1; d <= lastDate; d++) {
      days.push({
        date: `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <DataCard sx={{ p: 2, mb: 3 }}>
      {/* Month navigation */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <IconButton onClick={prevMonth} size="small">
          <ChevronLeftIcon />
        </IconButton>
        <Typography
          sx={{ fontWeight: 700, fontSize: "1rem", color: colors.textPrimary }}
        >
          {monthNames[viewMonth]} {viewYear}
        </Typography>
        <IconButton onClick={nextMonth} size="small">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Day headers */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
          mb: 0.5,
        }}
      >
        {weekDays.map((day) => (
          <Box key={day} sx={{ textAlign: "center" }}>
            <Typography
              sx={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: colors.textTertiary,
              }}
            >
              {day}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
        }}
      >
        {daysInMonth.map(({ date, day, isCurrentMonth }) => {
          const hasSession = validDates.has(date);
          const isSelected = date === selectedDate;

          return (
            <Box
              key={date}
              onClick={() => {
                if (hasSession) onSelectDate(date);
              }}
              sx={{
                textAlign: "center",
                py: 0.75,
                borderRadius: 1,
                cursor: hasSession ? "pointer" : "default",
                position: "relative",
                background: isSelected
                  ? colors.primary
                  : hasSession
                    ? `${colors.primaryLight}08`
                    : "transparent",
                "&:hover": hasSession
                  ? {
                      background: isSelected
                        ? colors.primary
                        : `${colors.primaryLight}18`,
                    }
                  : {},
                transition: "background 0.15s",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.8125rem",
                  fontWeight: isSelected ? 700 : hasSession ? 600 : 400,
                  color: isSelected
                    ? "#fff"
                    : !isCurrentMonth
                      ? colors.textTertiary
                      : hasSession
                        ? colors.textPrimary
                        : colors.textSecondary,
                }}
              >
                {day}
              </Typography>
              {/* Session indicator dot */}
              {hasSession && !isSelected && (
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: themedColors.success,
                    mx: "auto",
                    mt: 0.25,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </DataCard>
  );
};

export default () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();

  const [sessions, setSessions] = useState<SessionWithSections[]>([]);
  const [vaskiLatestSpeechDate, setVaskiLatestSpeechDate] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(getInitialDate());
  const [error, setError] = useState<string | null>(null);
  const [validDates, setValidDates] = useState<Set<string>>(new Set());
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
  const [loadingSpeeches, setLoadingSpeeches] = useState<Set<number>>(
    new Set(),
  );
  const [loadingVotings, setLoadingVotings] = useState<Set<number>>(new Set());
  const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());
  const [loadingMoreSpeeches, setLoadingMoreSpeeches] = useState<Set<number>>(
    new Set(),
  );
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setExpandedSections(new Set());
        setSectionLinks({});
        setExpandedMinutesSessions(new Set());
        setExpandedAttachmentSessions(new Set());
        const res = await fetch(`/api/day/${date}/sessions`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload: {
          sessions: SessionWithSections[];
          vaskiLatestSpeechDate?: string | null;
        } = await res.json();
        setSessions(payload.sessions || []);
        setVaskiLatestSpeechDate(payload.vaskiLatestSpeechDate ?? null);
      } catch {
        setError(t("errors.loadSessionFailed"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date, t]);

  useEffect(() => {
    const fetchValidDates = async () => {
      try {
        setDatesLoading(true);
        const response = await fetch("/api/session-dates");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: { date: string }[] = await response.json();
        setValidDates(new Set(data.map((item) => item.date)));
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("fi-FI", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateTime?: string) => {
    if (!dateTime) return "-";
    const normalized = dateTime.includes("T")
      ? dateTime
      : dateTime.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleTimeString("fi-FI", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return "-";
    const normalized = dateTime.includes("T")
      ? dateTime
      : dateTime.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("fi-FI", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseVaskiSubjects = (subjects?: string | null) => {
    if (!subjects) return [];
    return subjects
      .split(" | ")
      .map((subject) => subject.trim())
      .filter(Boolean);
  };

  const formatVaskiAuthor = (section: Section) => {
    const name = [
      section.vaski_author_first_name,
      section.vaski_author_last_name,
    ]
      .filter(Boolean)
      .join(" ");
    const parts = [
      name,
      section.vaski_author_role,
      section.vaski_author_organization,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" • ") : null;
  };

  const buildValtiopaivaAsiakirjaUrl = (tunnus?: string | null) => {
    if (!tunnus || !tunnus.trim()) return null;
    return `/valtiopaivaasiakirjat/${tunnus.trim().replaceAll(" ", "+")}`;
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
            fontSize: "0.7rem",
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
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiType")}:{" "}
                {section.vaski_document_type_name ||
                  section.vaski_document_type_code}
              </Typography>
            )}
            {section.vaski_eduskunta_tunnus && (
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiTunnus")}: {section.vaski_eduskunta_tunnus}
              </Typography>
            )}
            {docNumber && (
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiDocNumber")}: {docNumber}
              </Typography>
            )}
            {section.vaski_status && (
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiStatus")}: {section.vaski_status}
              </Typography>
            )}
            {section.vaski_creation_date && (
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiCreated")}: {section.vaski_creation_date}
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
            sx={{ fontSize: "0.75rem", color: colors.textSecondary, mt: 0.25 }}
          >
            {t("sessions.vaskiAuthor")}: {authorLine}
          </Typography>
        )}
        {section.vaski_source_reference && (
          <Typography
            sx={{ fontSize: "0.75rem", color: colors.textTertiary, mt: 0.25 }}
          >
            {t("sessions.vaskiSourceReference")}:{" "}
            {section.vaski_source_reference}
          </Typography>
        )}
        {section.vaski_summary && (
          <Typography
            sx={{
              fontSize: "0.75rem",
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
            {t("sessions.vaskiSummary")}: {section.vaski_summary}
          </Typography>
        )}
        {subjects.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
            <Typography
              sx={{ fontSize: "0.75rem", color: colors.textSecondary, mr: 0.5 }}
            >
              {t("sessions.vaskiSubjects")}:
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

  const renderSessionDocuments = (session: SessionWithSections) => {
    const docs = session.documents || [];
    if (docs.length === 0) return null;

    const labelForKind = (kind: SessionDocument["document_kind"]) => {
      if (kind === "agenda") return t("sessions.sessionAgenda");
      if (kind === "minutes") return t("sessions.sessionMinutes");
      return t("sessions.sessionRollCall");
    };

    return (
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${colors.dataBorder}`,
          background: "#fff",
        }}
      >
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 1,
          }}
        >
          {t("sessions.sessionDocuments")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {docs.map((doc) => {
            const docNumber =
              doc.document_number_text && doc.parliamentary_year_text
                ? `${doc.document_number_text}/${doc.parliamentary_year_text}`
                : null;
            return (
              <Box
                key={`${doc.document_kind}-${doc.id}`}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: `1px solid ${colors.primaryLight}20`,
                  background: `${colors.primaryLight}08`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.25,
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
                    label={labelForKind(doc.document_kind)}
                    size="small"
                    sx={{
                      fontSize: "0.625rem",
                      height: 20,
                      background: colors.primaryLight,
                      color: "#fff",
                    }}
                  />
                  {(doc.type_name_fi || doc.document_type_code) && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
                    >
                      {doc.type_name_fi || doc.document_type_code}
                    </Typography>
                  )}
                  {doc.eduskunta_tunnus && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {doc.eduskunta_tunnus}
                    </Typography>
                  )}
                </Box>
                {doc.title && (
                  <Typography
                    sx={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: colors.textPrimary,
                    }}
                  >
                    {doc.title}
                  </Typography>
                )}
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  {docNumber && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.vaskiDocNumber")}: {docNumber}
                    </Typography>
                  )}
                  {doc.status_text && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.vaskiStatus")}: {doc.status_text}
                    </Typography>
                  )}
                  {doc.created_at && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.vaskiCreated")}: {doc.created_at}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
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
            fontSize: "0.75rem",
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
                      fontSize: "0.625rem",
                      height: 20,
                      background: `${colors.warning}40`,
                      color: colors.textPrimary,
                    }}
                  />
                )}
                {notice.sent_at && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                  >
                    {t("sessions.noticeSent")}: {formatDateTime(notice.sent_at)}
                  </Typography>
                )}
                {notice.valid_until && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                  >
                    {t("sessions.noticeValidUntil")}:{" "}
                    {formatDateTime(notice.valid_until)}
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
            fontSize: "0.75rem",
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
                      fontSize: "0.625rem",
                      height: 20,
                      background: `${colors.warning}40`,
                      color: colors.textPrimary,
                    }}
                  />
                )}
                {notice.sent_at && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                  >
                    {t("sessions.noticeSent")}: {formatDateTime(notice.sent_at)}
                  </Typography>
                )}
                {notice.valid_until && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                  >
                    {t("sessions.noticeValidUntil")}:{" "}
                    {formatDateTime(notice.valid_until)}
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

  const parseIdentifierForSort = (
    identifier?: string | null,
  ): number[] | null => {
    if (!identifier) return null;
    const normalized = identifier.trim();
    if (!/^\d+(\.\d+)*$/.test(normalized)) return null;
    const parts = normalized
      .split(".")
      .map((part) => Number.parseInt(part, 10))
      .filter((part) => !Number.isNaN(part));
    return parts.length > 0 ? parts : null;
  };

  const compareMinutesItems = (
    a: SessionMinutesItem,
    b: SessionMinutesItem,
  ) => {
    const aParts = parseIdentifierForSort(a.identifier_text);
    const bParts = parseIdentifierForSort(b.identifier_text);

    if (aParts && bParts) {
      const maxLen = Math.max(aParts.length, bParts.length);
      for (let i = 0; i < maxLen; i++) {
        const aVal = aParts[i] ?? -1;
        const bVal = bParts[i] ?? -1;
        if (aVal !== bVal) return aVal - bVal;
      }
    } else if (aParts) {
      return -1;
    } else if (bParts) {
      return 1;
    }

    const aOrdinal =
      typeof a.ordinal === "number" ? a.ordinal : Number.MAX_SAFE_INTEGER;
    const bOrdinal =
      typeof b.ordinal === "number" ? b.ordinal : Number.MAX_SAFE_INTEGER;
    if (aOrdinal !== bOrdinal) return aOrdinal - bOrdinal;

    return a.id - b.id;
  };

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
              fontSize: "0.75rem",
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
            sx={{
              textTransform: "none",
              borderColor: colors.primaryLight,
              color: colors.primaryLight,
              fontSize: "0.75rem",
            }}
          >
            {isExpanded ? t("sessions.hideMinutes") : t("sessions.showMinutes")}
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
                      t("sessions.noTitle")}
                  </Typography>
                  {item.section_id && item.section_key && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        const targetSectionKey = item.section_key!;
                        setFocusedSectionKey(targetSectionKey);
                        if (!expandedSections.has(item.section_id!)) {
                          void toggleSection(
                            item.section_id!,
                            targetSectionKey,
                          );
                        }
                        requestAnimationFrame(() =>
                          scrollToSection(targetSectionKey),
                        );
                      }}
                      sx={{ textTransform: "none", fontSize: "0.75rem" }}
                    >
                      {t("sessions.openSection")}
                    </Button>
                  )}
                </Box>
                <Box
                  sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}
                >
                  {item.identifier_text && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.identifier")}: {item.identifier_text}
                    </Typography>
                  )}
                  {item.processing_title &&
                    item.processing_title !== item.title && (
                      <Typography
                        sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                      >
                        {t("sessions.processing")}: {item.processing_title}
                      </Typography>
                    )}
                  {item.note && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
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
              fontSize: "0.75rem",
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
            sx={{
              textTransform: "none",
              borderColor: colors.primaryLight,
              color: colors.primaryLight,
              fontSize: "0.75rem",
            }}
          >
            {isExpanded
              ? t("sessions.hideAttachments")
              : t("sessions.showAttachments")}
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
                    t("sessions.attachment")}
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}
                >
                  {attachment.related_document_tunnus && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.relatedDocument")}:{" "}
                      {attachment.related_document_tunnus}
                    </Typography>
                  )}
                  {attachment.file_name && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.fileName")}: {attachment.file_name}
                    </Typography>
                  )}
                  {attachment.native_id && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.nativeId")}: {attachment.native_id}
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
        <Box sx={{ py: 1, textAlign: "center" }}>
          <CircularProgress size={18} sx={{ color: themedColors.primary }} />
        </Box>
      );
    }
    if (links.length === 0) return null;

    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography
          sx={{
            fontSize: "0.75rem",
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
                {link.document_tunnus && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
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
                      sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
                    >
                      {link.document_type_name || link.document_type_code}
                    </Typography>
                  )}
                  {link.document_created_at && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.vaskiCreated")}: {link.document_created_at}
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

  const fetchSpeeches = async (
    sectionId: number,
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

  const toggleSection = async (sectionId: number, sectionKey: string) => {
    const isExpanding = !expandedSections.has(sectionId);

    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });

    if (isExpanding) {
      let resolvedLinks = sectionLinks[sectionKey];

      if (!sectionSpeechData[sectionId]) {
        setLoadingSpeeches((prev) => new Set(prev).add(sectionId));
        try {
          const data = await fetchSpeeches(sectionId, sectionKey);
          setSectionSpeechData((prev) => ({ ...prev, [sectionId]: data }));
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
          if (res.ok) {
            const votings: Voting[] = await res.json();
            setSectionVotings((prev) => ({ ...prev, [sectionId]: votings }));
          }
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
          resolvedLinks = links;
          setSectionLinks((prev) => ({ ...prev, [sectionKey]: links }));
        } finally {
          setLoadingLinks((prev) => {
            const next = new Set(prev);
            next.delete(sectionKey);
            return next;
          });
        }
      }

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
    } finally {
      setLoadingMoreSpeeches((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("sessions.title")}
        subtitle={t("sessions.subtitle")}
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
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
                    ? t("sessions.noSessionsSelected")
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
            {t("sessions.noSessionsForDate")}
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
                    {t("sessions.nearestSessions")}
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
                    {session.key || t("sessions.session")}
                  </Link>
                  {session.number !== undefined && (
                    <Chip
                      label={`${t("sessions.sessionNumber")}: ${session.number}`}
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
                      label={`${t("sessions.sessionType")}: ${session.type}`}
                      size="small"
                      sx={{
                        fontSize: "0.6875rem",
                        height: 22,
                        background: "#fff",
                        color: colors.textSecondary,
                      }}
                    />
                  )}
                  {session.state && (
                    <Chip
                      label={`${t("sessions.sessionState")}: ${session.state}`}
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
                        sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
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
                    label={`${session.section_count} ${t("home.sections")}`}
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
                    label={`${session.voting_count} ${t("home.votings")}`}
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
                      sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
                    >
                      {t("sessions.startReported")}:{" "}
                      {formatTime(session.start_time_reported)}
                    </Typography>
                  )}
                  {session.start_time_actual && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
                    >
                      {t("sessions.startActual")}:{" "}
                      {formatTime(session.start_time_actual)}
                    </Typography>
                  )}
                  {session.agenda_state && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
                    >
                      {t("sessions.agendaState")}: {session.agenda_state}
                    </Typography>
                  )}
                  {session.year !== undefined && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
                    >
                      {t("sessions.sessionYear")}: {session.year}
                    </Typography>
                  )}
                </Box>

                {renderSessionDocuments(session)}
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
                          {t("sessions.speechContentLatest", {
                            date: formatDate(vaskiLatestSpeechDate),
                            defaultValue: "",
                          })}
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

                    return (
                      <Box
                        key={section.id}
                        id={`session-section-${section.key}`}
                        sx={{
                          borderBottom: `1px solid ${colors.dataBorder}`,
                          background: isFocusedSection
                            ? `${colors.primaryLight}10`
                            : "transparent",
                        }}
                      >
                        <Box
                          sx={{
                            p: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            cursor: "pointer",
                            "&:hover": { background: colors.backgroundSubtle },
                            transition: "background 0.15s",
                          }}
                          onClick={() => toggleSection(section.id, section.key)}
                        >
                          <Chip
                            label={section.ordinal}
                            size="small"
                            sx={{
                              background: colors.primary,
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: "0.7rem",
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
                                t("sessions.noTitle")}
                            </Typography>
                            {section.identifier && (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: colors.textTertiary,
                                }}
                              >
                                {section.identifier}
                              </Typography>
                            )}
                            {section.note && (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
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
                                    fontSize: "0.75rem",
                                    color: colors.textTertiary,
                                  }}
                                >
                                  {t("sessions.processing")}:{" "}
                                  {section.processing_title}
                                </Typography>
                              )}
                            {section.resolution && (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: colors.textTertiary,
                                }}
                              >
                                {t("sessions.resolution")}: {section.resolution}
                              </Typography>
                            )}
                            {renderVaskiInfo(section, true)}
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                                mt: 0.75,
                              }}
                            >
                              <Chip
                                label={`${t("sessions.votings")}: ${section.voting_count ?? 0}`}
                                size="small"
                                sx={{
                                  fontSize: "0.6875rem",
                                  height: 20,
                                  background: `${themedColors.success}15`,
                                  color: themedColors.success,
                                }}
                              />
                              <Chip
                                label={`${t("sessions.speeches")}: ${section.speech_count ?? 0}`}
                                size="small"
                                sx={{
                                  fontSize: "0.6875rem",
                                  height: 20,
                                  background: `${colors.primaryLight}20`,
                                  color: colors.primaryLight,
                                }}
                              />
                              <Chip
                                label={`${t("sessions.speakers")}: ${section.speaker_count ?? 0}`}
                                size="small"
                                sx={{ fontSize: "0.6875rem", height: 20 }}
                              />
                              <Chip
                                label={`${t("sessions.parties")}: ${section.party_count ?? 0}`}
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
                                    fontSize: "0.75rem",
                                    color: colors.textTertiary,
                                  }}
                                >
                                  {t("sessions.agendaKey")}:{" "}
                                  {section.agenda_key}
                                </Typography>
                              )}
                              {section.vaski_id !== undefined &&
                                section.vaski_id !== null && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.75rem",
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {t("sessions.vaskiId")}: {section.vaski_id}
                                  </Typography>
                                )}
                              {section.modified_datetime && (
                                <Typography
                                  sx={{
                                    fontSize: "0.75rem",
                                    color: colors.textTertiary,
                                  }}
                                >
                                  {t("sessions.sectionUpdated")}:{" "}
                                  {formatDateTime(section.modified_datetime)}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <IconButton
                            size="small"
                            sx={{ color: colors.primaryLight, flexShrink: 0 }}
                          >
                            {isExpanded ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </Box>

                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box
                            sx={{
                              px: 2,
                              pb: 2,
                              borderTop: `1px solid ${colors.dataBorder}`,
                            }}
                          >
                            {renderVaskiInfo(section, false)}
                            {renderSectionLinks(section)}
                            {renderSectionNotices(session, section.key)}
                            {/* Votings */}
                            {loadingVotings.has(section.id) ? (
                              <Box sx={{ py: 2, textAlign: "center" }}>
                                <CircularProgress
                                  size={20}
                                  sx={{ color: themedColors.primary }}
                                />
                              </Box>
                            ) : votings.length > 0 ? (
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
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: colors.textSecondary,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {t("sessions.votings")} ({votings.length})
                                </Typography>
                                {votings.map((voting) => {
                                  const isPassed = voting.n_yes > voting.n_no;
                                  return (
                                    <Box
                                      key={voting.id}
                                      sx={{
                                        p: 1.5,
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
                                          mb: 1,
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <HowToVoteIcon
                                          sx={{
                                            fontSize: 16,
                                            color: isPassed
                                              ? themedColors.success
                                              : themedColors.error,
                                          }}
                                        />
                                        <Link
                                          href={refs.voting(
                                            voting.id,
                                            session.key,
                                            session.date,
                                          )}
                                          underline="hover"
                                          sx={{
                                            fontWeight: 600,
                                            fontSize: "0.8125rem",
                                            flex: 1,
                                            minWidth: 0,
                                            color: colors.textPrimary,
                                          }}
                                        >
                                          {voting.title}
                                        </Link>
                                        <Chip
                                          label={
                                            isPassed
                                              ? t("sessions.passed")
                                              : t("sessions.rejected")
                                          }
                                          size="small"
                                          sx={{
                                            fontSize: "0.625rem",
                                            height: 20,
                                            background: isPassed
                                              ? `${themedColors.success}20`
                                              : `${themedColors.error}20`,
                                            color: isPassed
                                              ? themedColors.success
                                              : themedColors.error,
                                            fontWeight: 600,
                                          }}
                                        />
                                      </Box>
                                      <VoteMarginBar
                                        yes={voting.n_yes}
                                        no={voting.n_no}
                                        empty={voting.n_abstain}
                                        absent={voting.n_absent}
                                        height={8}
                                      />
                                      <Box
                                        sx={{
                                          display: "flex",
                                          gap: 1.5,
                                          mt: 0.75,
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: "0.6875rem",
                                            color: themedColors.success,
                                            fontWeight: 600,
                                          }}
                                        >
                                          {t("common.yes")} {voting.n_yes}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: "0.6875rem",
                                            color: themedColors.error,
                                            fontWeight: 600,
                                          }}
                                        >
                                          {t("common.no")} {voting.n_no}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: "0.6875rem",
                                            color: colors.textTertiary,
                                          }}
                                        >
                                          {t("common.empty")} {voting.n_abstain}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: "0.6875rem",
                                            color: colors.textTertiary,
                                          }}
                                        >
                                          {t("common.absent")} {voting.n_absent}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            ) : null}

                            {/* Speeches */}
                            {loadingSpeeches.has(section.id) ? (
                              <Box sx={{ py: 2, textAlign: "center" }}>
                                <CircularProgress
                                  size={20}
                                  sx={{ color: themedColors.primary }}
                                />
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
                                    fontSize: "0.75rem",
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
                                      fontSize: "0.75rem",
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {t("sessions.speechContentPending")}
                                  </Typography>
                                )}
                                {!hasSpeechContent && vaskiLatestSpeechDate && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.75rem",
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {t("sessions.speechContentLatest", {
                                      date: formatDate(vaskiLatestSpeechDate),
                                      defaultValue: "",
                                    })}
                                  </Typography>
                                )}
                                {speeches.map((speech) => (
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
                                          speech.ordinal_number ||
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
                                ))}
                                {/* Load more button */}
                                {speechData &&
                                  speechData.page < speechData.totalPages && (
                                    <Box sx={{ textAlign: "center", mt: 1 }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          loadMoreSpeeches(
                                            section.id,
                                            section.key,
                                          );
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
                                        {t("sessions.loadMore")} (
                                        {speeches.length}/{speechData.total})
                                      </Button>
                                    </Box>
                                  )}
                              </Box>
                            ) : null}

                            {/* No content */}
                            {!loadingSpeeches.has(section.id) &&
                              !loadingVotings.has(section.id) &&
                              speeches.length === 0 &&
                              votings.length === 0 && (
                                <Typography
                                  sx={{
                                    py: 2,
                                    textAlign: "center",
                                    fontSize: "0.8125rem",
                                    color: colors.textTertiary,
                                  }}
                                >
                                  {t("sessions.noContent")}
                                </Typography>
                              )}
                          </Box>
                        </Collapse>
                      </Box>
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
                                  label={section.ordinal}
                                  size="small"
                                  sx={{
                                    background: "#fff",
                                    color: colors.textSecondary,
                                    fontWeight: 600,
                                    fontSize: "0.7rem",
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
                                    t("sessions.noTitle")}
                                </Typography>
                              </Box>
                              {section.identifier && (
                                <Typography
                                  sx={{
                                    fontSize: "0.75rem",
                                    color: colors.textTertiary,
                                    mt: 0.25,
                                  }}
                                >
                                  {section.identifier}
                                </Typography>
                              )}
                              {section.note && (
                                <Typography
                                  sx={{
                                    fontSize: "0.75rem",
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
                                      fontSize: "0.75rem",
                                      color: colors.textTertiary,
                                      mt: 0.25,
                                    }}
                                  >
                                    {t("sessions.processing")}:{" "}
                                    {section.processing_title}
                                  </Typography>
                                )}
                              {section.resolution && (
                                <Typography
                                  sx={{
                                    fontSize: "0.75rem",
                                    color: colors.textTertiary,
                                    mt: 0.25,
                                  }}
                                >
                                  {t("sessions.resolution")}:{" "}
                                  {section.resolution}
                                </Typography>
                              )}
                              {renderVaskiInfo(section, true)}

                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  flexWrap: "wrap",
                                  mt: 1,
                                }}
                              >
                                <Chip
                                  label={`${t("sessions.votings")}: ${votingCount}`}
                                  size="small"
                                  sx={{
                                    fontSize: "0.6875rem",
                                    height: 22,
                                    background: `${themedColors.success}15`,
                                    color: themedColors.success,
                                  }}
                                />
                                <Chip
                                  label={`${t("sessions.speeches")}: ${speechCount}`}
                                  size="small"
                                  sx={{
                                    fontSize: "0.6875rem",
                                    height: 22,
                                    background: `${colors.primaryLight}20`,
                                    color: colors.primaryLight,
                                  }}
                                />
                                <Chip
                                  label={`${t("sessions.speakers")}: ${section.speaker_count ?? 0}`}
                                  size="small"
                                  sx={{ fontSize: "0.6875rem", height: 22 }}
                                />
                                <Chip
                                  label={`${t("sessions.parties")}: ${section.party_count ?? 0}`}
                                  size="small"
                                  sx={{ fontSize: "0.6875rem", height: 22 }}
                                />
                                {!hasSpeechContent && speeches.length > 0 && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.75rem",
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {t("sessions.speechContentPending")}
                                  </Typography>
                                )}
                                {!hasSpeechContent &&
                                  speeches.length > 0 &&
                                  vaskiLatestSpeechDate && (
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        color: colors.textTertiary,
                                      }}
                                    >
                                      {t("sessions.speechContentLatest", {
                                        date: formatDate(vaskiLatestSpeechDate),
                                        defaultValue: "",
                                      })}
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
                                      fontSize: "0.75rem",
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {t("sessions.agendaKey")}:{" "}
                                    {section.agenda_key}
                                  </Typography>
                                )}
                                {section.vaski_id !== undefined &&
                                  section.vaski_id !== null && (
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        color: colors.textTertiary,
                                      }}
                                    >
                                      {t("sessions.vaskiId")}:{" "}
                                      {section.vaski_id}
                                    </Typography>
                                  )}
                                {section.modified_datetime && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.75rem",
                                      color: colors.textTertiary,
                                    }}
                                  >
                                    {t("sessions.sectionUpdated")}:{" "}
                                    {formatDateTime(section.modified_datetime)}
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
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {isExpanded
                                    ? t("sessions.hideDetails")
                                    : t("sessions.showDetails")}
                                </Button>
                              </Box>

                              <Collapse
                                in={isExpanded}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box sx={{ mt: 1.5 }}>
                                  {renderVaskiInfo(section, false)}
                                  {renderSectionLinks(section)}
                                  {renderSectionNotices(session, section.key)}
                                  {loadingVotings.has(section.id) ? (
                                    <Box sx={{ py: 1, textAlign: "center" }}>
                                      <CircularProgress
                                        size={20}
                                        sx={{ color: themedColors.primary }}
                                      />
                                    </Box>
                                  ) : votings.length > 0 ? (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 1,
                                      }}
                                    >
                                      {votings.map((voting) => {
                                        const isPassed =
                                          voting.n_yes > voting.n_no;
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
                                                  color: isPassed
                                                    ? themedColors.success
                                                    : themedColors.error,
                                                }}
                                              />
                                              <Link
                                                href={refs.voting(
                                                  voting.id,
                                                  session.key,
                                                  session.date,
                                                )}
                                                underline="hover"
                                                sx={{
                                                  fontWeight: 600,
                                                  fontSize: "0.8125rem",
                                                  flex: 1,
                                                  minWidth: 0,
                                                  color: colors.textPrimary,
                                                }}
                                              >
                                                {voting.title}
                                              </Link>
                                            </Box>
                                            <VoteMarginBar
                                              yes={voting.n_yes}
                                              no={voting.n_no}
                                              empty={voting.n_abstain}
                                              absent={voting.n_absent}
                                              height={8}
                                            />
                                          </Box>
                                        );
                                      })}
                                    </Box>
                                  ) : null}

                                  {loadingSpeeches.has(section.id) ? (
                                    <Box sx={{ py: 1, textAlign: "center" }}>
                                      <CircularProgress
                                        size={20}
                                        sx={{ color: themedColors.primary }}
                                      />
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
                                            fontSize: "0.75rem",
                                            color: colors.textTertiary,
                                          }}
                                        >
                                          {t("sessions.speechContentPending")}
                                        </Typography>
                                      )}
                                      {!hasSpeechContent &&
                                        vaskiLatestSpeechDate && (
                                          <Typography
                                            sx={{
                                              fontSize: "0.75rem",
                                              color: colors.textTertiary,
                                            }}
                                          >
                                            {t("sessions.speechContentLatest", {
                                              date: formatDate(
                                                vaskiLatestSpeechDate,
                                              ),
                                              defaultValue: "",
                                            })}
                                          </Typography>
                                        )}
                                      {speeches.map((speech) => (
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
                                                speech.ordinal_number ||
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
                                      ))}
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
