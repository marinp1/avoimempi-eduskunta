import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import EventIcon from "@mui/icons-material/Event";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PieChartIcon from "@mui/icons-material/PieChart";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { colors } from "#client/theme/index";
import { commonStyles, spacing } from "#client/theme";
import {
  DataCard,
  PageHeader,
  MetricCard,
  VoteMarginBar,
} from "#client/theme/components";
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

type Member = {
  person_id: number;
  first_name: string;
  last_name: string;
  party_name?: string;
  is_in_government?: number;
  gender?: string;
  profession?: string;
};

const Home = () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();

  const [sessions, setSessions] = useState<SessionWithSections[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingComposition, setLoadingComposition] = useState(true);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(),
  );
  const [sectionSpeeches, setSectionSpeeches] = useState<
    Record<number, Speech[]>
  >({});
  const [sectionVotings, setSectionVotings] = useState<
    Record<number, Voting[]>
  >({});
  const [loadingSpeeches, setLoadingSpeeches] = useState<Set<number>>(
    new Set(),
  );
  const [loadingVotings, setLoadingVotings] = useState<Set<number>>(new Set());

  // Fetch latest session date, then load that session
  useEffect(() => {
    const fetchLatestSession = async () => {
      try {
        setLoadingSessions(true);
        const datesRes = await fetch("/api/session-dates");
        if (!datesRes.ok) throw new Error("Failed to fetch dates");
        const dates: { date: string }[] = await datesRes.json();
        if (dates.length === 0) {
          setSessions([]);
          setLoadingSessions(false);
          return;
        }
        const latest = dates.sort((a, b) => b.date.localeCompare(a.date))[0]
          .date;
        setLatestDate(latest);

        const sessionsRes = await fetch(`/api/day/${latest}/sessions`);
        if (!sessionsRes.ok) throw new Error("Failed to fetch sessions");
        const sessionsData: SessionWithSections[] = await sessionsRes.json();
        setSessions(sessionsData);
      } catch {
        setError(t("home.loadingError"));
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchLatestSession();
  }, [t]);

  // Fetch current composition
  useEffect(() => {
    const fetchComposition = async () => {
      try {
        setLoadingComposition(true);
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`/api/composition/${today}`);
        if (!res.ok) throw new Error("Failed to fetch composition");
        const data: Member[] = await res.json();
        setMembers(data);
      } catch {
        // Non-critical - just won't show composition
      } finally {
        setLoadingComposition(false);
      }
    };
    fetchComposition();
  }, []);

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

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("fi-FI", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
      if (!sectionSpeeches[sectionId]) {
        setLoadingSpeeches((prev) => new Set(prev).add(sectionId));
        try {
          const res = await fetch(
            `/api/sections/${sectionKey}/speeches?limit=100`,
          );
          if (res.ok) {
            const data = await res.json();
            const speeches: Speech[] = data.speeches ?? data;
            setSectionSpeeches((prev) => ({ ...prev, [sectionId]: speeches }));
          }
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

  return (
    <Box>
      <PageHeader title={t("home.title")} subtitle={t("home.subtitle")} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ─── Parliament Composition ─── */}
      {loadingComposition ? (
        <Box sx={{ ...commonStyles.centeredFlex, py: 4 }}>
          <CircularProgress size={28} sx={{ color: themedColors.primary }} />
        </Box>
      ) : (
        stats.totalMembers > 0 && (
          <Box sx={{ mb: 4 }}>
            {/* Summary row */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid size={{ xs: 4 }}>
                <MetricCard
                  label={t("home.totalMPs")}
                  value={stats.totalMembers}
                  icon={<GroupsIcon fontSize="small" />}
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <MetricCard
                  label={t("home.government")}
                  value={stats.inGovernment}
                  icon={<AccountBalanceIcon fontSize="small" />}
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
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
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                {stats.partyGroups.map(([party, data]) => (
                  <Box
                    key={party}
                    sx={{
                      flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 1px)" },
                      p: 2,
                      borderBottom: `1px solid ${colors.dataBorder}`,
                      borderRight: { sm: `1px solid ${colors.dataBorder}` },
                      "&:nth-of-type(2n)": { borderRight: { sm: "none" } },
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          color: colors.textPrimary,
                        }}
                      >
                        {party}
                      </Typography>
                      {data.inGovernment > 0 ? (
                        <Chip
                          label={t("home.governmentChip")}
                          size="small"
                          sx={{
                            fontSize: "0.625rem",
                            height: 18,
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
                            fontSize: "0.625rem",
                            height: 18,
                            background: `${themedColors.warning}20`,
                            color: themedColors.warning,
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                    <Chip
                      label={`${data.total} ${t("home.seats")}`}
                      size="small"
                      sx={{
                        background: colors.primaryLight,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </DataCard>
          </Box>
        )
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
              {t("home.latestSession")}
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
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    color: colors.textPrimary,
                  }}
                >
                  {session.key}
                </Typography>
                {session.section_count > 0 && (
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
                )}
                {session.voting_count > 0 && (
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
                )}
              </Box>

              {/* Sections list */}
              {session.sections?.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const speeches = sectionSpeeches[section.id] || [];
                const hasSpeechContent = speeches.some((speech) => speech.content);
                const votings = sectionVotings[section.id] || [];

                return (
                  <Box
                    key={section.id}
                    sx={{ borderBottom: `1px solid ${colors.dataBorder}` }}
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
                            "Ei otsikkoa"}
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
                                    <Typography
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: "0.8125rem",
                                        flex: 1,
                                        minWidth: 0,
                                      }}
                                    >
                                      {voting.title}
                                    </Typography>
                                    <Chip
                                      label={
                                        isPassed ? "Hyväksytty" : "Hylätty"
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
                                    sx={{ display: "flex", gap: 1.5, mt: 0.75 }}
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
                              {t("sessions.speeches")} ({speeches.length})
                            </Typography>
                            {!hasSpeechContent && (
                              <Typography
                                sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                              >
                                {t("sessions.speechContentPending")}
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
                                      speech.ordinal_number || speech.ordinal
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
                                      sx={{ fontSize: "0.625rem", height: 18 }}
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
                          </Box>
                        ) : null}

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
                              {t("sessions.noSpeeches")}
                            </Typography>
                          )}
                      </Box>
                    </Collapse>
                  </Box>
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
