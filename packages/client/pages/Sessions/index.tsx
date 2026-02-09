import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EventIcon from "@mui/icons-material/Event";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
  Alert,
  Box,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Fade,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { commonStyles, spacing } from "#client/theme";
import { GlassCard } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

type SessionWithSections = DatabaseTables.Session & {
  agenda_title?: string;
  agenda_state?: string;
  sections?: DatabaseTables.Section[];
  section_count: number;
  voting_count: number;
};

const getInitialDate = (): string => {
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get("date");
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return dateParam;
  }
  return new Date().toISOString().split("T")[0];
};

export default () => {
  const themedColors = useThemedColors();

  const [sessions, setSessions] = useState<SessionWithSections[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [date, setDate] = useState<string>(getInitialDate());
  const [error, setError] = useState<string | null>(null);
  const [validDates, setValidDates] = useState<Set<string>>(new Set());
  const [datesLoading, setDatesLoading] = useState<boolean>(true);

  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(),
  );
  const [sectionSpeeches, setSectionSpeeches] = useState<
    Record<number, DatabaseTables.Speech[]>
  >({});
  const [loadingSpeeches, setLoadingSpeeches] = useState<Set<number>>(
    new Set(),
  );
  const [sectionVotings, setSectionVotings] = useState<
    Record<number, DatabaseTables.Voting[]>
  >({});
  const [loadingVotings, setLoadingVotings] = useState<Set<number>>(
    new Set(),
  );

  // Fetch sessions with sections when date changes
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
      } catch (err) {
        console.error(err);
        setError("Tietojen lataaminen epäonnistui.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  // Fetch valid session dates on mount
  useEffect(() => {
    const fetchValidDates = async () => {
      try {
        setDatesLoading(true);
        const response = await fetch("/api/session-dates");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: { date: string }[] = await response.json();
        setValidDates(new Set(data.map((item) => item.date)));
      } catch (err) {
        console.error("Failed to fetch valid dates:", err);
      } finally {
        setDatesLoading(false);
      }
    };
    fetchValidDates();
  }, []);

  // Handle browser back/forward
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

  const isValidDate = (dateString: string): boolean =>
    validDates.has(dateString);

  const findNearestValidDates = (
    targetDate: string,
  ): { before: string | null; after: string | null } => {
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

  // Toggle section expansion and lazy-load speeches/votings
  const toggleSection = async (sectionId: number, sectionKey: string) => {
    const isExpanding = !expandedSections.has(sectionId);

    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });

    if (isExpanding) {
      if (!sectionSpeeches[sectionId]) {
        setLoadingSpeeches((prev) => new Set(prev).add(sectionId));
        try {
          const res = await fetch(`/api/sections/${sectionKey}/speeches`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const speeches: DatabaseTables.Speech[] = await res.json();
          setSectionSpeeches((prev) => ({ ...prev, [sectionId]: speeches }));
        } catch (err) {
          console.error("Failed to fetch speeches:", err);
        } finally {
          setLoadingSpeeches((prev) => {
            const newSet = new Set(prev);
            newSet.delete(sectionId);
            return newSet;
          });
        }
      }

      if (!sectionVotings[sectionId]) {
        setLoadingVotings((prev) => new Set(prev).add(sectionId));
        try {
          const res = await fetch(`/api/sections/${sectionKey}/votings`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const votings: DatabaseTables.Voting[] = await res.json();
          setSectionVotings((prev) => ({ ...prev, [sectionId]: votings }));
        } catch (err) {
          console.error("Failed to fetch votings:", err);
        } finally {
          setLoadingVotings((prev) => {
            const newSet = new Set(prev);
            newSet.delete(sectionId);
            return newSet;
          });
        }
      }
    }
  };

  const renderSections = (session: SessionWithSections) => {
    if (!session.sections || session.sections.length === 0) return null;

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: spacing.sm,
        }}
      >
        {session.sections.map((section) => {
          const isSectionExpanded = expandedSections.has(section.id);
          const speeches = sectionSpeeches[section.id] || [];
          const votings = sectionVotings[section.id] || [];
          const isLoadingSpeechesForSection = loadingSpeeches.has(section.id);
          const isLoadingVotingsForSection = loadingVotings.has(section.id);

          return (
            <Box
              key={section.id}
              sx={{
                borderRadius: 1,
                background: "rgba(102, 126, 234, 0.05)",
                border: "1px solid rgba(102, 126, 234, 0.1)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  p: { xs: 1.5, sm: spacing.sm },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, sm: spacing.sm },
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Chip
                    label={section.ordinal}
                    size="small"
                    sx={{
                      background: themedColors.primary,
                      color: themedColors.backgroundPaper,
                      fontWeight: 600,
                      fontSize: "0.7rem",
                      height: 22,
                      minWidth: 30,
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: themedColors.textPrimary,
                        wordBreak: "break-word",
                      }}
                    >
                      {section.title ||
                        section.processing_title ||
                        "Ei otsikkoa"}
                    </Typography>
                    {section.identifier && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: themedColors.textSecondary,
                          display: "block",
                        }}
                      >
                        Tunniste: {section.identifier}
                      </Typography>
                    )}
                    {section.processing_title &&
                      section.processing_title !== section.title && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: themedColors.textSecondary,
                            display: "block",
                          }}
                        >
                          Käsittely: {section.processing_title}
                        </Typography>
                      )}
                    {section.resolution && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: themedColors.textSecondary,
                          display: "block",
                          mt: 0.5,
                        }}
                      >
                        Päätös: {section.resolution}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => toggleSection(section.id, section.key)}
                  sx={{ color: themedColors.primary, flexShrink: 0 }}
                >
                  {isSectionExpanded ? (
                    <KeyboardArrowUpIcon />
                  ) : (
                    <KeyboardArrowDownIcon />
                  )}
                </IconButton>
              </Box>
              <Collapse in={isSectionExpanded} timeout="auto" unmountOnExit>
                <Box
                  sx={{
                    p: { xs: 1.5, sm: spacing.sm },
                    pt: 0,
                    borderTop: "1px solid rgba(102, 126, 234, 0.1)",
                  }}
                >
                  {/* Votings */}
                  {isLoadingVotingsForSection ? (
                    <Box sx={{ py: spacing.sm, textAlign: "center" }}>
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
                        mb: speeches.length > 0 ? spacing.md : 0,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: themedColors.textSecondary,
                          textTransform: "uppercase",
                          mt: 1,
                        }}
                      >
                        Äänestykset ({votings.length})
                      </Typography>
                      {votings.map((voting) => {
                        const isPassed = voting.n_yes > voting.n_no;
                        return (
                          <Box
                            key={voting.id}
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                              p: { xs: 1.5, sm: spacing.sm },
                              borderRadius: 1,
                              background: themedColors.backgroundPaper,
                              border: `1px solid ${isPassed ? "rgba(76, 175, 80, 0.3)" : "rgba(244, 67, 54, 0.3)"}`,
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
                              <HowToVoteIcon
                                sx={{
                                  color: isPassed
                                    ? themedColors.success
                                    : themedColors.error,
                                  fontSize: 18,
                                }}
                              />
                              <Chip
                                label={voting.number}
                                size="small"
                                sx={{
                                  background: "rgba(102, 126, 234, 0.2)",
                                  color: themedColors.primary,
                                  fontWeight: 600,
                                  fontSize: "0.65rem",
                                  height: 18,
                                  minWidth: 24,
                                }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  flex: 1,
                                  minWidth: 0,
                                }}
                              >
                                {voting.title}
                              </Typography>
                              <Chip
                                label={isPassed ? "Hyväksytty" : "Hylätty"}
                                size="small"
                                sx={{
                                  background: isPassed
                                    ? "rgba(76, 175, 80, 0.15)"
                                    : "rgba(244, 67, 54, 0.15)",
                                  color: isPassed
                                    ? themedColors.success
                                    : themedColors.error,
                                  fontWeight: 600,
                                  fontSize: "0.65rem",
                                  height: 20,
                                }}
                              />
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                gap: { xs: 1, sm: 2 },
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: themedColors.success,
                                  fontWeight: 600,
                                }}
                              >
                                Kyllä: {voting.n_yes}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: themedColors.error,
                                  fontWeight: 600,
                                }}
                              >
                                Ei: {voting.n_no}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: themedColors.textSecondary,
                                  fontWeight: 600,
                                }}
                              >
                                Tyhjä: {voting.n_abstain}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: themedColors.textSecondary,
                                  fontWeight: 600,
                                }}
                              >
                                Poissa: {voting.n_absent}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: themedColors.textSecondary,
                                  fontWeight: 600,
                                }}
                              >
                                Yhteensä: {voting.n_total}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : null}

                  {/* Speeches */}
                  {isLoadingSpeechesForSection ? (
                    <Box sx={{ py: spacing.sm, textAlign: "center" }}>
                      <CircularProgress
                        size={20}
                        sx={{ color: themedColors.primary }}
                      />
                    </Box>
                  ) : speeches.length > 0 ? (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: themedColors.textSecondary,
                          textTransform: "uppercase",
                          mt: 1,
                        }}
                      >
                        Puheenvuorot ({speeches.length})
                      </Typography>
                      {speeches.map((speech) => (
                        <Box
                          key={speech.id}
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            p: { xs: 1.5, sm: spacing.sm },
                            borderRadius: 1,
                            background: themedColors.backgroundPaper,
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
                              label={speech.ordinal_number || speech.ordinal}
                              size="small"
                              sx={{
                                background: "rgba(102, 126, 234, 0.2)",
                                color: themedColors.primary,
                                fontWeight: 600,
                                fontSize: "0.65rem",
                                height: 18,
                                minWidth: 24,
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {speech.first_name} {speech.last_name}
                            </Typography>
                            {speech.party_abbreviation && (
                              <Chip
                                label={speech.party_abbreviation}
                                size="small"
                                sx={{
                                  background: "rgba(102, 126, 234, 0.1)",
                                  color: themedColors.primary,
                                  fontSize: "0.65rem",
                                  height: 18,
                                }}
                              />
                            )}
                            {speech.speech_type && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: themedColors.textSecondary,
                                }}
                              >
                                {speech.speech_type}
                              </Typography>
                            )}
                          </Box>
                          {(speech as any).content && (
                            <Box
                              sx={{
                                p: { xs: 1.5, sm: spacing.sm },
                                borderRadius: 1,
                                background: "rgba(102, 126, 234, 0.03)",
                                borderLeft: `3px solid ${themedColors.primary}`,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  color: themedColors.textPrimary,
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.6,
                                  fontSize: {
                                    xs: "0.8125rem",
                                    sm: "0.875rem",
                                  },
                                }}
                              >
                                {(speech as any).content}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : null}

                  {/* No content message */}
                  {!isLoadingSpeechesForSection &&
                    !isLoadingVotingsForSection &&
                    speeches.length === 0 &&
                    votings.length === 0 && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: spacing.sm, textAlign: "center", mt: 1 }}
                      >
                        Ei puheenvuoroja tai äänestyksiä
                      </Typography>
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
      {/* Header Card with Date Picker */}
      <Fade in timeout={500}>
        <Box>
          <GlassCard
            sx={{
              mb: spacing.lg,
              background: themedColors.glassBackground,
              border: `1px solid ${themedColors.glassBorder}`,
            }}
          >
            <CardContent
              sx={{ p: { xs: 2, sm: spacing.lg }, textAlign: "center" }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.sm,
                  mb: spacing.md,
                }}
              >
                <EventIcon
                  sx={{
                    fontSize: { xs: 32, sm: 40 },
                    color: themedColors.primary,
                  }}
                />
                <Typography
                  variant="h4"
                  component="h1"
                  sx={{
                    background: themedColors.primaryGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontWeight: 700,
                    fontSize: { xs: "1.5rem", sm: "2.125rem" },
                  }}
                >
                  Istunnot
                </Typography>
              </Box>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: spacing.md }}
              >
                Selaa eduskunnan täysistuntoja
              </Typography>
              <TextField
                label="Valitse päivämäärä"
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarTodayIcon sx={{ color: themedColors.primary }} />
                    </InputAdornment>
                  ),
                }}
                helperText={
                  !datesLoading && !isValidDate(date)
                    ? "Valitulla päivällä ei ole istuntoja"
                    : "Valitse päivä jonka istuntoja haluat tarkastella"
                }
                error={!datesLoading && !isValidDate(date)}
                sx={{
                  maxWidth: 280,
                  "& .MuiOutlinedInput-root": {
                    background: themedColors.backgroundPaper,
                  },
                }}
              />
            </CardContent>
          </GlassCard>
        </Box>
      </Fade>

      {loading ? (
        <Box sx={{ ...commonStyles.centeredFlex, py: spacing.xl }}>
          <CircularProgress sx={{ color: themedColors.primary }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ py: spacing.sm }}>
          {error}
        </Alert>
      ) : sessions.length === 0 ? (
        <Fade in timeout={600}>
          <Box>
            <Alert severity="info" sx={{ py: spacing.sm, mb: spacing.md }}>
              Ei istuntoja valitulla päivämäärällä.
            </Alert>
            {!datesLoading &&
              validDates.size > 0 &&
              (() => {
                const { before, after } = findNearestValidDates(date);
                return before || after ? (
                  <GlassCard
                    sx={{
                      background: themedColors.backgroundPaper,
                      border: `1px solid ${themedColors.dataBorder}`,
                    }}
                  >
                    <CardContent sx={{ p: spacing.md }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: themedColors.textSecondary,
                          mb: spacing.sm,
                          fontWeight: 600,
                        }}
                      >
                        Lähimmät istunnot:
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          gap: spacing.sm,
                          flexWrap: "wrap",
                        }}
                      >
                        {before && (
                          <Chip
                            label={formatDate(before)}
                            onClick={() => handleDateChange(before)}
                            sx={{
                              background: themedColors.primary,
                              color: themedColors.backgroundPaper,
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
                              background: themedColors.primary,
                              color: themedColors.backgroundPaper,
                              fontWeight: 600,
                              cursor: "pointer",
                              "&:hover": { opacity: 0.9 },
                            }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </GlassCard>
                ) : null;
              })()}
          </Box>
        </Fade>
      ) : (
        <>
          {sessions.map((session, sessionIndex) => (
            <Fade in timeout={600 + sessionIndex * 100} key={session.id}>
              <Box>
                <GlassCard
                  sx={{
                    mb: spacing.lg,
                    background: themedColors.backgroundPaper,
                    border: `1px solid ${themedColors.dataBorder}`,
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: spacing.lg } }}>
                    {/* Session header */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: spacing.sm,
                        mb: spacing.sm,
                      }}
                    >
                      <EventIcon
                        sx={{
                          fontSize: { xs: 24, sm: 32 },
                          color: themedColors.primary,
                        }}
                      />
                      <Typography
                        variant="h5"
                        sx={{
                          color: themedColors.primary,
                          fontWeight: 700,
                        }}
                      >
                        {session.key || "Istunto"}
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        color: themedColors.textSecondary,
                        fontWeight: 500,
                        mb: spacing.sm,
                      }}
                    >
                      {formatDate(date)}
                    </Typography>
                    {session.agenda_title && (
                      <Typography
                        variant="body1"
                        sx={{
                          color: themedColors.textPrimary,
                          fontWeight: 500,
                          mb: spacing.sm,
                        }}
                      >
                        {session.agenda_title}
                      </Typography>
                    )}

                    {/* Summary chips */}
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: spacing.sm,
                        mb:
                          session.sections && session.sections.length > 0
                            ? spacing.md
                            : 0,
                      }}
                    >
                      {session.section_count > 0 && (
                        <Chip
                          label={`${session.section_count} kohtaa`}
                          size="small"
                          sx={{
                            background: "rgba(102, 126, 234, 0.1)",
                            color: themedColors.primary,
                            fontWeight: 600,
                          }}
                        />
                      )}
                      {session.voting_count > 0 && (
                        <Chip
                          icon={
                            <HowToVoteIcon
                              sx={{
                                fontSize: 16,
                                color: themedColors.success,
                              }}
                            />
                          }
                          label={`${session.voting_count} äänestystä`}
                          size="small"
                          sx={{
                            background: "rgba(76, 175, 80, 0.1)",
                            color: themedColors.success,
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>

                    {/* Sections */}
                    {renderSections(session)}
                  </CardContent>
                </GlassCard>
              </Box>
            </Fade>
          ))}
        </>
      )}
    </Box>
  );
};
