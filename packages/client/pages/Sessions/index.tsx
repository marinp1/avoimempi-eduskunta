import EventIcon from "@mui/icons-material/Event";
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
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { colors, commonStyles, spacing } from "#client/theme";
import { GlassCard } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

type SessionWithAgenda = DatabaseTables.Session & {
  agenda_title?: string;
  agenda_state?: string;
  sections?: DatabaseTables.Section[];
};

type SessionsResponse = {
  sessions: SessionWithAgenda[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default () => {
  const themedColors = useThemedColors();
  const [sessions, setSessions] = useState<SessionWithAgenda[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(),
  );
  const [sectionSpeeches, setSectionSpeeches] = useState<
    Record<number, DatabaseTables.Speech[]>
  >({});
  const [loadingSpeeches, setLoadingSpeeches] = useState<Set<number>>(
    new Set(),
  );
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [_totalCount, setTotalCount] = useState<number>(0);
  const limit = 20;

  // Fetch sessions on mount or page change
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/sessions?page=${page}&limit=${limit}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SessionsResponse = await res.json();
        setSessions(data.sessions);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } catch (err) {
        console.error(err);
        setError("Istuntojen lataaminen epäonnistui.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [page]);

  // Toggle row expansion
  const toggleRow = (sessionId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  // Toggle section expansion and fetch speeches if needed
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

    // Fetch speeches if expanding and not already loaded
    if (isExpanding && !sectionSpeeches[sectionId]) {
      setLoadingSpeeches((prev) => new Set(prev).add(sectionId));
      try {
        const res = await fetch(`/api/sections/${sectionKey}/speeches`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const speeches: DatabaseTables.Speech[] = await res.json();
        setSectionSpeeches((prev) => ({
          ...prev,
          [sectionId]: speeches,
        }));
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
  };

  // Handle page change
  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number,
  ) => {
    setPage(value);
    // Reset expanded rows when changing pages
    setExpandedRows(new Set());
    setExpandedSections(new Set());
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Shared expanded sections content */
  const renderSections = (session: SessionWithAgenda) => {
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
          const isLoadingSpeeches = loadingSpeeches.has(section.id);

          return (
            <Box
              key={section.id}
              sx={{
                borderRadius: 1,
                background: themedColors.isDark
                  ? "rgba(95, 163, 227, 0.1)"
                  : "rgba(102, 126, 234, 0.05)",
                border: themedColors.isDark
                  ? "1px solid rgba(95, 163, 227, 0.2)"
                  : "1px solid rgba(102, 126, 234, 0.1)",
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
                    borderTop: themedColors.isDark
                      ? "1px solid rgba(95, 163, 227, 0.2)"
                      : "1px solid rgba(102, 126, 234, 0.1)",
                  }}
                >
                  {isLoadingSpeeches ? (
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
                                background: themedColors.isDark
                                  ? "rgba(95, 163, 227, 0.3)"
                                  : "rgba(102, 126, 234, 0.2)",
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
                                  background: themedColors.isDark
                                    ? "rgba(95, 163, 227, 0.2)"
                                    : "rgba(102, 126, 234, 0.1)",
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
                                background: themedColors.isDark
                                  ? "rgba(95, 163, 227, 0.08)"
                                  : "rgba(102, 126, 234, 0.03)",
                                borderLeft: `3px solid ${themedColors.primary}`,
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  color: themedColors.textPrimary,
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.6,
                                  fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                                }}
                              >
                                {(speech as any).content}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ py: spacing.sm, textAlign: "center" }}
                    >
                      Ei puheenvuoroja
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
            <CardContent sx={{ p: { xs: 2, sm: spacing.lg }, textAlign: "center" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.sm,
                  mb: spacing.md,
                }}
              >
                <EventIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: themedColors.primary }} />
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
                  Eduskunnan istunnot
                </Typography>
              </Box>
              <Typography variant="body1" color="text.secondary">
                Katsaus eduskunnan täysistuntoihin
              </Typography>
            </CardContent>
          </GlassCard>
        </Box>
      </Fade>

      {/* Main Content */}
      <Fade in timeout={700}>
        <Box>
          {loading ? (
            <Box sx={{ ...commonStyles.centeredFlex, py: spacing.xl }}>
              <CircularProgress sx={{ color: themedColors.primary }} />
            </Box>
          ) : error ? (
            <Alert
              severity="error"
              sx={{ py: spacing.sm, textAlign: "center" }}
            >
              {error}
            </Alert>
          ) : (
            <>
              {/* Mobile card layout */}
              <Box sx={{ display: { xs: "block", md: "none" } }}>
                {sessions.map((session, index) => {
                  const isExpanded = expandedRows.has(session.id);
                  const hasSections =
                    session.sections && session.sections.length > 0;

                  return (
                    <Paper
                      key={session.id}
                      elevation={0}
                      sx={{
                        mb: 1.5,
                        borderRadius: 1,
                        background: themedColors.backgroundPaper,
                        border: `1px solid ${themedColors.dataBorder}`,
                        overflow: "hidden",
                        animation: `fadeIn 0.4s ease-in-out ${index * 0.03}s both`,
                        "@keyframes fadeIn": {
                          from: { opacity: 0, transform: "translateY(8px)" },
                          to: { opacity: 1, transform: "translateY(0)" },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          p: 2,
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 1,
                          cursor: hasSections ? "pointer" : "default",
                        }}
                        onClick={hasSections ? () => toggleRow(session.id) : undefined}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 0.75,
                              flexWrap: "wrap",
                            }}
                          >
                            <EventIcon
                              sx={{
                                color: themedColors.primary,
                                fontSize: 18,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 600 }}
                            >
                              {session.year}/{session.number}
                            </Typography>
                            {hasSections && (
                              <Chip
                                label={`${session.sections.length} kohtaa`}
                                size="small"
                                sx={{
                                  background: themedColors.isDark
                                    ? "rgba(95, 163, 227, 0.2)"
                                    : "rgba(102, 126, 234, 0.1)",
                                  color: themedColors.primary,
                                  fontWeight: 500,
                                  fontSize: "0.65rem",
                                  height: 20,
                                }}
                              />
                            )}
                          </Box>
                          {session.agenda_title ? (
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 500,
                                  color: themedColors.textPrimary,
                                  mb: 0.5,
                                  wordBreak: "break-word",
                                }}
                              >
                                {session.agenda_title}
                              </Typography>
                              {session.agenda_state && (
                                <Chip
                                  label={session.agenda_state}
                                  size="small"
                                  sx={{
                                    background: themedColors.isDark
                                      ? "rgba(76, 175, 80, 0.25)"
                                      : "rgba(76, 175, 80, 0.15)",
                                    color: themedColors.success,
                                    fontWeight: 500,
                                    fontSize: "0.65rem",
                                    height: 20,
                                  }}
                                />
                              )}
                            </Box>
                          ) : (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Ei päiväjärjestystä
                            </Typography>
                          )}
                        </Box>
                        {hasSections && (
                          <IconButton
                            size="small"
                            sx={{ color: themedColors.primary, flexShrink: 0, mt: -0.5 }}
                          >
                            {isExpanded ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        )}
                      </Box>
                      {hasSections && (
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 2, pb: 2 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 600,
                                color: themedColors.primary,
                                mb: spacing.sm,
                              }}
                            >
                              Istunnon kohdat:
                            </Typography>
                            {renderSections(session)}
                          </Box>
                        </Collapse>
                      )}
                    </Paper>
                  );
                })}
              </Box>

              {/* Desktop table layout */}
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  ...commonStyles.glassCard,
                  background: themedColors.glassBackground,
                  border: `1px solid ${themedColors.glassBorder}`,
                  mb: spacing.lg,
                  overflow: "hidden",
                  display: { xs: "none", md: "block" },
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        background: themedColors.primaryGradient,
                      }}
                    >
                      <TableCell
                        sx={{
                          color: themedColors.backgroundPaper,
                          fontWeight: 600,
                        }}
                      >
                        Istunto
                      </TableCell>
                      <TableCell
                        sx={{
                          color: themedColors.backgroundPaper,
                          fontWeight: 600,
                        }}
                      >
                        Päiväjärjestys
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.map((session, index) => {
                      const isExpanded = expandedRows.has(session.id);
                      const hasSections =
                        session.sections && session.sections.length > 0;

                      return (
                        <React.Fragment key={session.id}>
                          <TableRow
                            hover
                            sx={{
                              ...commonStyles.interactiveHover,
                              animation: `fadeIn 0.5s ease-in-out ${index * 0.03}s both`,
                              "@keyframes fadeIn": {
                                from: {
                                  opacity: 0,
                                  transform: "translateY(10px)",
                                },
                                to: {
                                  opacity: 1,
                                  transform: "translateY(0)",
                                },
                              },
                            }}
                          >
                            <TableCell sx={{ fontWeight: 600 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                {hasSections && (
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleRow(session.id)}
                                    sx={{ color: themedColors.primary }}
                                  >
                                    {isExpanded ? (
                                      <KeyboardArrowUpIcon />
                                    ) : (
                                      <KeyboardArrowDownIcon />
                                    )}
                                  </IconButton>
                                )}
                                <EventIcon
                                  sx={{
                                    color: themedColors.primary,
                                    fontSize: 20,
                                  }}
                                />
                                <span>
                                  {session.year}/{session.number}
                                </span>
                                {hasSections && (
                                  <Chip
                                    label={`${session.sections.length} kohtaa`}
                                    size="small"
                                    sx={{
                                      background: themedColors.isDark
                                        ? "rgba(95, 163, 227, 0.2)"
                                        : "rgba(102, 126, 234, 0.1)",
                                      color: themedColors.primary,
                                      fontWeight: 500,
                                      fontSize: "0.7rem",
                                      height: 20,
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box>
                                {session.agenda_title ? (
                                  <>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontWeight: 500,
                                        mb: 0.5,
                                        color: themedColors.textPrimary,
                                      }}
                                    >
                                      {session.agenda_title}
                                    </Typography>
                                    {session.agenda_state && (
                                      <Chip
                                        label={session.agenda_state}
                                        size="small"
                                        sx={{
                                          background: themedColors.isDark
                                            ? "rgba(76, 175, 80, 0.25)"
                                            : "rgba(76, 175, 80, 0.15)",
                                          color: themedColors.success,
                                          fontWeight: 500,
                                          fontSize: "0.7rem",
                                          height: 20,
                                        }}
                                      />
                                    )}
                                  </>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Ei päiväjärjestystä
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                          {hasSections && (
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                sx={{
                                  py: 0,
                                  borderBottom: isExpanded ? undefined : 0,
                                }}
                              >
                                <Collapse
                                  in={isExpanded}
                                  timeout="auto"
                                  unmountOnExit
                                >
                                  <Box sx={{ py: spacing.md, pl: spacing.xl }}>
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        fontWeight: 600,
                                        color: themedColors.primary,
                                        mb: spacing.sm,
                                      }}
                                    >
                                      Istunnon kohdat:
                                    </Typography>
                                    {renderSections(session)}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: spacing.lg,
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="medium"
                sx={{
                  "& .MuiPaginationItem-root": {
                    color: themedColors.textPrimary,
                    fontWeight: 500,
                  },
                  "& .MuiPaginationItem-root.Mui-selected": {
                    background: themedColors.primaryGradient,
                    color: themedColors.backgroundPaper,
                    fontWeight: 600,
                  },
                }}
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>
      </Fade>
    </Box>
  );
};
