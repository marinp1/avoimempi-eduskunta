import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EventIcon from "@mui/icons-material/Event";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { colors } from "#client/theme/index";
import { commonStyles } from "#client/theme";
import { DataCard, PageHeader, VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

type SessionWithSections = {
  id: number;
  key: string;
  date: string;
  description?: string;
  agenda_title?: string;
  agenda_state?: string;
  section_count: number;
  voting_count: number;
  sections?: Section[];
};

type Section = {
  id: number;
  key: string;
  ordinal: number;
  title: string;
  processing_title?: string;
  identifier?: string;
  resolution?: string;
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

export default () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();

  const [sessions, setSessions] = useState<SessionWithSections[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(getInitialDate());
  const [error, setError] = useState<string | null>(null);
  const [validDates, setValidDates] = useState<Set<string>>(new Set());
  const [datesLoading, setDatesLoading] = useState(true);

  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [sectionSpeechData, setSectionSpeechData] = useState<Record<number, SpeechData>>({});
  const [sectionVotings, setSectionVotings] = useState<Record<number, Voting[]>>({});
  const [loadingSpeeches, setLoadingSpeeches] = useState<Set<number>>(new Set());
  const [loadingVotings, setLoadingVotings] = useState<Set<number>>(new Set());
  const [loadingMoreSpeeches, setLoadingMoreSpeeches] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setExpandedSections(new Set());
        const res = await fetch(`/api/day/${date}/sessions`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SessionWithSections[] = await res.json();
        setSessions(data);
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
    const handlePopState = () => setDate(getInitialDate());
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

  const isValidDate = (dateString: string): boolean => validDates.has(dateString);

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

  const fetchSpeeches = async (sectionId: number, sectionKey: string, offset = 0) => {
    const res = await fetch(
      `/api/sections/${sectionKey}/speeches?limit=${SPEECH_PAGE_SIZE}&offset=${offset}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SpeechData;
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
          <TextField
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarTodayIcon sx={{ fontSize: 16, color: colors.primaryLight }} />
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
        }
      />

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
          {!datesLoading && validDates.size > 0 && (() => {
            const { before, after } = findNearestValidDates(date);
            return before || after ? (
              <DataCard sx={{ p: 2.5 }}>
                <Typography
                  sx={{ fontSize: "0.8125rem", fontWeight: 600, color: colors.textSecondary, mb: 1.5 }}
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
              <EventIcon sx={{ fontSize: 20, color: colors.primaryLight }} />
              <Typography sx={{ fontWeight: 600, fontSize: "1rem", color: colors.textPrimary }}>
                {formatDate(date)}
              </Typography>
            </Box>
          </Box>

          {sessions.map((session) => (
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
                <Typography sx={{ fontWeight: 700, fontSize: "0.9375rem", color: colors.textPrimary }}>
                  {session.key || t("sessions.session")}
                </Typography>
                {session.section_count > 0 && (
                  <Chip
                    label={`${session.section_count} ${t("home.sections")}`}
                    size="small"
                    sx={{ fontSize: "0.6875rem", height: 22, background: `${colors.primaryLight}20`, color: colors.primaryLight }}
                  />
                )}
                {session.voting_count > 0 && (
                  <Chip
                    icon={<HowToVoteIcon sx={{ fontSize: 14 }} />}
                    label={`${session.voting_count} ${t("home.votings")}`}
                    size="small"
                    sx={{ fontSize: "0.6875rem", height: 22, background: `${themedColors.success}15`, color: themedColors.success }}
                  />
                )}
                {session.agenda_title && (
                  <Typography sx={{ fontSize: "0.8125rem", color: colors.textSecondary, flex: "1 1 100%" }}>
                    {session.agenda_title}
                  </Typography>
                )}
              </Box>

              {/* Sections list */}
              {session.sections?.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const speechData = sectionSpeechData[section.id];
                const speeches = speechData?.speeches || [];
                const votings = sectionVotings[section.id] || [];

                return (
                  <Box key={section.id} sx={{ borderBottom: `1px solid ${colors.dataBorder}` }}>
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
                          {section.title || section.processing_title || t("sessions.noTitle")}
                        </Typography>
                        {section.identifier && (
                          <Typography sx={{ fontSize: "0.75rem", color: colors.textTertiary }}>
                            {section.identifier}
                          </Typography>
                        )}
                        {section.processing_title && section.processing_title !== section.title && (
                          <Typography sx={{ fontSize: "0.75rem", color: colors.textTertiary }}>
                            {t("sessions.processing")}: {section.processing_title}
                          </Typography>
                        )}
                        {section.resolution && (
                          <Typography sx={{ fontSize: "0.75rem", color: colors.textTertiary }}>
                            {t("sessions.resolution")}: {section.resolution}
                          </Typography>
                        )}
                      </Box>
                      <IconButton size="small" sx={{ color: colors.primaryLight, flexShrink: 0 }}>
                        {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </Box>

                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box sx={{ px: 2, pb: 2, borderTop: `1px solid ${colors.dataBorder}` }}>
                        {/* Votings */}
                        {loadingVotings.has(section.id) ? (
                          <Box sx={{ py: 2, textAlign: "center" }}>
                            <CircularProgress size={20} sx={{ color: themedColors.primary }} />
                          </Box>
                        ) : votings.length > 0 ? (
                          <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                            <Typography
                              sx={{ fontSize: "0.75rem", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase" }}
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
                                    background: isPassed ? `${themedColors.success}08` : `${themedColors.error}08`,
                                  }}
                                >
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                                    <HowToVoteIcon sx={{ fontSize: 16, color: isPassed ? themedColors.success : themedColors.error }} />
                                    <Typography sx={{ fontWeight: 600, fontSize: "0.8125rem", flex: 1, minWidth: 0 }}>
                                      {voting.title}
                                    </Typography>
                                    <Chip
                                      label={isPassed ? t("sessions.passed") : t("sessions.rejected")}
                                      size="small"
                                      sx={{
                                        fontSize: "0.625rem",
                                        height: 20,
                                        background: isPassed ? `${themedColors.success}20` : `${themedColors.error}20`,
                                        color: isPassed ? themedColors.success : themedColors.error,
                                        fontWeight: 600,
                                      }}
                                    />
                                  </Box>
                                  <VoteMarginBar yes={voting.n_yes} no={voting.n_no} empty={voting.n_abstain} absent={voting.n_absent} height={8} />
                                  <Box sx={{ display: "flex", gap: 1.5, mt: 0.75 }}>
                                    <Typography sx={{ fontSize: "0.6875rem", color: themedColors.success, fontWeight: 600 }}>
                                      {t("common.yes")} {voting.n_yes}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.6875rem", color: themedColors.error, fontWeight: 600 }}>
                                      {t("common.no")} {voting.n_no}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.6875rem", color: colors.textTertiary }}>
                                      {t("common.empty")} {voting.n_abstain}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.6875rem", color: colors.textTertiary }}>
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
                            <CircularProgress size={20} sx={{ color: themedColors.primary }} />
                          </Box>
                        ) : speeches.length > 0 ? (
                          <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                            <Typography
                              sx={{ fontSize: "0.75rem", fontWeight: 600, color: colors.textSecondary, textTransform: "uppercase" }}
                            >
                              {t("sessions.speeches")} ({speechData?.total ?? speeches.length})
                            </Typography>
                            {speeches.map((speech) => (
                              <Box
                                key={speech.id}
                                sx={{ p: 1.5, borderRadius: 1, background: colors.backgroundSubtle }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: speech.content ? 1 : 0 }}>
                                  <Chip
                                    label={speech.ordinal_number || speech.ordinal}
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
                                  <Typography sx={{ fontWeight: 600, fontSize: "0.8125rem", flex: 1 }}>
                                    {speech.first_name} {speech.last_name}
                                  </Typography>
                                  {speech.party_abbreviation && (
                                    <Chip
                                      label={speech.party_abbreviation}
                                      size="small"
                                      sx={{ fontSize: "0.625rem", height: 18 }}
                                    />
                                  )}
                                  {speech.speech_type && (
                                    <Typography sx={{ fontSize: "0.6875rem", color: colors.textTertiary }}>
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
                            {speechData && speechData.page < speechData.totalPages && (
                              <Box sx={{ textAlign: "center", mt: 1 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadMoreSpeeches(section.id, section.key);
                                  }}
                                  disabled={loadingMoreSpeeches.has(section.id)}
                                  sx={{
                                    textTransform: "none",
                                    borderColor: colors.primaryLight,
                                    color: colors.primaryLight,
                                    fontSize: "0.8125rem",
                                  }}
                                >
                                  {loadingMoreSpeeches.has(section.id) ? (
                                    <CircularProgress size={16} sx={{ mr: 1 }} />
                                  ) : null}
                                  {t("sessions.loadMore")} ({speeches.length}/{speechData.total})
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
                            <Typography sx={{ py: 2, textAlign: "center", fontSize: "0.8125rem", color: colors.textTertiary }}>
                              {t("sessions.noContent")}
                            </Typography>
                          )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          ))}
        </DataCard>
      )}
    </Box>
  );
};
