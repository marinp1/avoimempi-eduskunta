import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EventIcon from "@mui/icons-material/Event";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import {
  Alert,
  Box,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Fade,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { commonStyles, spacing } from "#client/theme";
import { GlassCard } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

type SessionWithAgenda = DatabaseTables.Session & {
  agenda_title?: string;
  agenda_state?: string;
};

type SpeechWithSection = DatabaseTables.ExcelSpeech & {
  section_title?: string;
  section_processing_title?: string;
  section_ordinal?: number;
};

type GroupedSpeeches = {
  key: string;
  document: string;
  processing_phase: string;
  section_title?: string;
  section_processing_title?: string;
  speeches: SpeechWithSection[];
};

// Initialize from URL
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

  const [sessions, setSessions] = useState<SessionWithAgenda[]>([]);
  const [speeches, setSpeeches] = useState<SpeechWithSection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [date, setDate] = useState<string>(getInitialDate());
  const [error, setError] = useState<string | null>(null);
  const [validDates, setValidDates] = useState<Set<string>>(new Set());
  const [datesLoading, setDatesLoading] = useState<boolean>(true);

  // Fetch data when date changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch sessions
        const sessionsRes = await fetch(`/api/day/${date}/session`);
        if (!sessionsRes.ok) throw new Error(`HTTP ${sessionsRes.status}`);
        const sessionsData: SessionWithAgenda[] = await sessionsRes.json();
        setSessions(sessionsData);

        // Fetch speeches
        const speechesRes = await fetch(`/api/day/${date}/speeches`);
        if (!speechesRes.ok) throw new Error(`HTTP ${speechesRes.status}`);
        const speechesData: SpeechWithSection[] = await speechesRes.json();
        setSpeeches(speechesData);
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
        const dateSet = new Set(data.map((item) => item.date));
        setValidDates(dateSet);
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
    const handlePopState = () => {
      const newDate = getInitialDate();
      setDate(newDate);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update URL function
  const updateURL = (newDate: string) => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    params.set("date", newDate);
    window.history.pushState({}, "", url.toString());
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    updateURL(newDate);
  };

  // Check if a date has valid sessions
  const isValidDate = (dateString: string): boolean => {
    return validDates.has(dateString);
  };

  // Find nearest valid dates (before and after)
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

  // Format date to Finnish format
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("fi-FI", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (timeString: string) => {
    if (!timeString) return "-";
    try {
      const date = new Date(timeString);
      if (Number.isNaN(date.getTime())) return timeString;
      return date.toLocaleTimeString("fi-FI", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeString;
    }
  };

  // Group speeches by document and processing phase
  const groupedSpeeches: GroupedSpeeches[] = React.useMemo(() => {
    const groups = new Map<string, GroupedSpeeches>();
    speeches.forEach((speech) => {
      const key = `${speech.document}_${speech.processing_phase}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key: key,
          document: speech.document || "Ei dokumenttia",
          processing_phase: speech.processing_phase || "Ei vaihetta",
          section_title: speech.section_title,
          section_processing_title: speech.section_processing_title,
          speeches: [],
        });
      }
      groups.get(key)?.speeches.push(speech);
    });
    return Array.from(groups.values());
  }, [speeches]);

  // Get session title
  const sessionTitle = sessions.length > 0 ? sessions[0].agenda_title : null;

  return (
    <Box>
      {/* Header Card */}
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
                <CalendarTodayIcon
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
                  Päivät
                </Typography>
              </Box>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: spacing.md }}
              >
                Selaa eduskunnan istuntoja päivittäin
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
                              "&:hover": {
                                opacity: 0.9,
                              },
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
                              "&:hover": {
                                opacity: 0.9,
                              },
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
          {/* Session Information */}
          <Fade in timeout={600}>
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
                        letterSpacing: "0",
                      }}
                    >
                      {sessions[0]?.key || "Istunto"}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: themedColors.textSecondary,
                      fontWeight: 500,
                      mb: spacing.md,
                    }}
                  >
                    {formatDate(date)}
                  </Typography>
                  {sessionTitle && (
                    <Typography
                      variant="body1"
                      sx={{
                        color: themedColors.textPrimary,
                        fontWeight: 500,
                        mb: spacing.md,
                      }}
                    >
                      {sessionTitle}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: spacing.sm,
                      mt: spacing.md,
                    }}
                  >
                    {sessions.length > 1 &&
                      sessions.map((session) => (
                        <Chip
                          key={session.id}
                          label={session.key}
                          sx={{
                            background: themedColors.primary,
                            color: themedColors.backgroundPaper,
                            fontWeight: 600,
                            fontSize: "0.875rem",
                          }}
                        />
                      ))}
                    {speeches.length > 0 && (
                      <Chip
                        icon={
                          <RecordVoiceOverIcon
                            sx={{
                              fontSize: 16,
                              color: themedColors.backgroundPaper,
                            }}
                          />
                        }
                        label={`${speeches.length} puheenvuoroa`}
                        sx={{
                          background: themedColors.success,
                          color: themedColors.backgroundPaper,
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Box>
                </CardContent>
              </GlassCard>
            </Box>
          </Fade>

          {/* Speeches grouped by document and processing phase */}
          {groupedSpeeches.length > 0 ? (
            groupedSpeeches.map((group, groupIndex) => (
              <Fade in timeout={700 + groupIndex * 100} key={group.key}>
                <Box>
                  <Paper
                    elevation={0}
                    sx={{
                      mb: spacing.lg,
                      borderRadius: 1,
                      background: themedColors.backgroundPaper,
                      border: `1px solid ${themedColors.dataBorder}`,
                      boxShadow:
                        "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Group Header */}
                    <Box
                      sx={{
                        p: spacing.md,
                        background: themedColors.primaryGradient,
                      }}
                    >
                      {/* Document Name - Prominent Display */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: spacing.sm,
                          mb: spacing.xs,
                        }}
                      >
                        <Chip
                          label={group.document}
                          sx={{
                            background: "rgba(255,255,255,0.95)",
                            color: themedColors.primary,
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            height: 32,
                            px: 1,
                          }}
                        />
                      </Box>

                      <Typography
                        variant="h6"
                        sx={{
                          color: themedColors.backgroundPaper,
                          fontWeight: 600,
                          mb: spacing.xs,
                        }}
                      >
                        {group.section_title || group.document}
                      </Typography>
                      {group.section_processing_title && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: "rgba(255,255,255,0.9)",
                            fontWeight: 500,
                          }}
                        >
                          {group.section_processing_title}
                        </Typography>
                      )}
                      <Box
                        sx={{
                          display: "flex",
                          gap: spacing.sm,
                          mt: spacing.sm,
                          flexWrap: "wrap",
                        }}
                      >
                        <Chip
                          label={group.processing_phase}
                          size="small"
                          sx={{
                            background: "rgba(255,255,255,0.2)",
                            color: themedColors.backgroundPaper,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                          }}
                        />
                        <Chip
                          label={`${group.speeches.length} puheenvuoroa`}
                          size="small"
                          sx={{
                            background: "rgba(255,255,255,0.2)",
                            color: themedColors.backgroundPaper,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Speeches List */}
                    <Box sx={{ p: spacing.md }}>
                      {group.speeches.map((speech, speechIndex) => (
                        <Box key={speech.excel_id || speechIndex}>
                          <Box
                            sx={{
                              p: spacing.md,
                              borderRadius: 1,
                              background: "rgba(102, 126, 234, 0.03)",
                              transition: "all 0.2s ease-in-out",
                              "&:hover": {
                                background: "rgba(102, 126, 234, 0.06)",
                                boxShadow:
                                  "0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
                              },
                            }}
                          >
                            {/* Speech Header */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mb: spacing.sm,
                                flexWrap: "wrap",
                                gap: spacing.sm,
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: spacing.sm,
                                  flex: 1,
                                }}
                              >
                                <Chip
                                  label={speech.ordinal || speechIndex + 1}
                                  size="small"
                                  sx={{
                                    background: themedColors.primary,
                                    color: themedColors.backgroundPaper,
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    minWidth: 32,
                                  }}
                                />
                                <Typography
                                  variant="subtitle1"
                                  sx={{
                                    fontWeight: 700,
                                    color: themedColors.textPrimary,
                                  }}
                                >
                                  {speech.first_name} {speech.last_name}
                                </Typography>
                                {speech.party && (
                                  <Chip
                                    label={speech.party}
                                    size="small"
                                    sx={{
                                      background: "rgba(102, 126, 234, 0.2)",
                                      color: themedColors.primary,
                                      fontWeight: 600,
                                      fontSize: "0.7rem",
                                    }}
                                  />
                                )}
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: spacing.sm,
                                }}
                              >
                                {speech.start_time && (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: themedColors.textSecondary,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {formatTime(speech.start_time)}
                                    {speech.end_time &&
                                      ` - ${formatTime(speech.end_time)}`}
                                  </Typography>
                                )}
                              </Box>
                            </Box>

                            {/* Speech Metadata */}
                            <Box
                              sx={{
                                display: "flex",
                                gap: spacing.xs,
                                mb: spacing.sm,
                                flexWrap: "wrap",
                              }}
                            >
                              {speech.speech_type && (
                                <Chip
                                  label={speech.speech_type}
                                  size="small"
                                  sx={{
                                    background: "rgba(76, 175, 80, 0.15)",
                                    color: themedColors.success,
                                    fontWeight: 500,
                                    fontSize: "0.7rem",
                                    height: 22,
                                  }}
                                />
                              )}
                              {speech.position && (
                                <Chip
                                  label={speech.position}
                                  size="small"
                                  sx={{
                                    background: "rgba(255, 152, 0, 0.15)",
                                    color: themedColors.warning,
                                    fontWeight: 500,
                                    fontSize: "0.7rem",
                                    height: 22,
                                  }}
                                />
                              )}
                            </Box>

                            {/* Speech Content */}
                            {speech.content && (
                              <Box
                                sx={{
                                  p: spacing.md,
                                  borderRadius: 1,
                                  background: themedColors.backgroundPaper,
                                  borderLeft: `3px solid ${themedColors.primary}`,
                                  mt: spacing.sm,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: themedColors.textPrimary,
                                    whiteSpace: "pre-wrap",
                                    lineHeight: 1.7,
                                  }}
                                >
                                  {speech.content}
                                </Typography>
                              </Box>
                            )}

                            {/* Minutes URL */}
                            {speech.minutes_url && (
                              <Box sx={{ mt: spacing.sm }}>
                                <Typography
                                  variant="caption"
                                  component="a"
                                  href={speech.minutes_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{
                                    color: themedColors.primary,
                                    textDecoration: "none",
                                    fontWeight: 500,
                                    "&:hover": {
                                      textDecoration: "underline",
                                    },
                                  }}
                                >
                                  Avaa pöytäkirja →
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {/* Divider between speeches */}
                          {speechIndex < group.speeches.length - 1 && (
                            <Divider sx={{ my: spacing.md }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Box>
              </Fade>
            ))
          ) : (
            <Fade in timeout={700}>
              <Alert severity="info">
                Ei puheenvuoroja valitulla päivämäärällä.
              </Alert>
            </Fade>
          )}
        </>
      )}
    </Box>
  );
};
