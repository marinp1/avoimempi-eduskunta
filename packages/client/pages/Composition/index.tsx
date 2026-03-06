import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupsIcon from "@mui/icons-material/Groups";
import PieChartIcon from "@mui/icons-material/PieChart";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fade,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ItemTraceIcon } from "#client/components/ItemTraceIcon";
import {
  isDateWithinHallituskausi,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { commonStyles, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { RepresentativeDetails } from "./Details";

type MemberWithExtras = DatabaseQueries.GetParliamentComposition & {
  party_name?: string;
  is_in_government?: number;
};

export default () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const { selectedHallituskausi } = useHallituskausi();

  // Initialize from URL
  const getInitialDate = (): string => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    return new Date().toISOString().split("T")[0];
  };

  const getInitialPersonId = (): number | null => {
    const params = new URLSearchParams(window.location.search);
    const personIdParam = params.get("person");
    return personIdParam ? parseInt(personIdParam, 10) : null;
  };

  const [members, setMembers] = useState<MemberWithExtras[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [date, setDate] = useState<string>(getInitialDate());
  const [error, setError] = useState<string | null>(null);

  // New state for dialog
  const [selectedRepresentative, setSelectedRepresentative] =
    useState<DatabaseQueries.GetParliamentComposition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partyFilter, setPartyFilter] = useState<string | null>(null);
  const [govFilter, setGovFilter] = useState<
    "all" | "government" | "opposition"
  >("all");

  // Compute statistics
  const stats = React.useMemo(() => {
    const totalMembers = members.length;
    const inGovernment = members.filter((m) => m.is_in_government === 1).length;
    const inOpposition = totalMembers - inGovernment;

    // Group by party
    const partyGroups = members.reduce(
      (acc, m) => {
        const party = m.party_name || "Ei tiedossa";
        if (!acc[party]) {
          acc[party] = { total: 0, inGovernment: 0 };
        }
        acc[party].total++;
        if (m.is_in_government === 1) {
          acc[party].inGovernment++;
        }
        return acc;
      },
      {} as Record<string, { total: number; inGovernment: number }>,
    );

    // Sort parties by size
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

  // Fetch members when date changes
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/composition/${date}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DatabaseQueries.GetParliamentComposition[] =
          await res.json();
        setMembers(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load members.");
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [date]);

  // Open dialog for person in URL on initial load
  useEffect(() => {
    const personId = getInitialPersonId();
    if (personId && members.length > 0) {
      const member = members.find((m) => m.person_id === personId);
      if (member) {
        setSelectedRepresentative(member);
        setDialogOpen(true);
      }
    }
  }, [members, getInitialPersonId]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const newDate = getInitialDate();
      const personId = getInitialPersonId();

      setDate(newDate);

      if (personId && members.length > 0) {
        const member = members.find((m) => m.person_id === personId);
        if (member) {
          setSelectedRepresentative(member);
          setDialogOpen(true);
        }
      } else {
        setDialogOpen(false);
        setSelectedRepresentative(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [members, getInitialDate, getInitialPersonId]);

  // Update URL function
  const updateURL = (newDate?: string, personId?: number | null) => {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (newDate !== undefined) {
      params.set("date", newDate);
    }

    if (personId !== undefined) {
      if (personId === null) {
        params.delete("person");
      } else {
        params.set("person", personId.toString());
      }
    }

    window.history.pushState({}, "", url.toString());
  };

  const handleDateChange = (newDate: string) => {
    if (
      selectedHallituskausi &&
      !isDateWithinHallituskausi(newDate, selectedHallituskausi)
    ) {
      const clamped =
        newDate < selectedHallituskausi.startDate
          ? selectedHallituskausi.startDate
          : selectedHallituskausi.endDate || newDate;
      setDate(clamped);
      updateURL(clamped);
      return;
    }
    setDate(newDate);
    updateURL(newDate);
  };

  useEffect(() => {
    if (!selectedHallituskausi) return;
    if (isDateWithinHallituskausi(date, selectedHallituskausi)) return;
    const fallback =
      date < selectedHallituskausi.startDate
        ? selectedHallituskausi.startDate
        : selectedHallituskausi.endDate || selectedHallituskausi.startDate;
    setDate(fallback);
    updateURL(fallback);
  }, [date, selectedHallituskausi]);

  const handleRowClick = (member: DatabaseQueries.GetParliamentComposition) => {
    setSelectedRepresentative(member);
    setDialogOpen(true);
    updateURL(undefined, member.person_id);
  };

  const handleActivateOnKeyDown = (
    event: React.KeyboardEvent,
    onActivate: () => void,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRepresentative(null);
    updateURL(undefined, null);
  };

  // Get unique parties for filter
  const uniqueParties = React.useMemo(() => {
    const parties = new Set(members.map((m) => m.party_name).filter(Boolean));
    return Array.from(parties).sort() as string[];
  }, [members]);

  // Filtered members
  const filteredMembers = React.useMemo(() => {
    let result = members;
    if (partyFilter) {
      result = result.filter((m) => m.party_name === partyFilter);
    }
    if (govFilter === "government") {
      result = result.filter((m) => m.is_in_government === 1);
    } else if (govFilter === "opposition") {
      result = result.filter((m) => m.is_in_government !== 1);
    }
    return result;
  }, [members, partyFilter, govFilter]);

  return (
    <Box>
      {/* Header Card */}
      <Fade in timeout={500}>
        <Box>
          <Box
            sx={{
              mb: spacing.lg,
              borderRadius: 1,
              background: themedColors.backgroundPaper,
              border: `1px solid ${themedColors.dataBorder}`,
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent
              sx={{ p: { xs: 2, sm: spacing.lg }, textAlign: "center" }}
            >
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  color: themedColors.primary,
                  fontWeight: 600,
                  mb: spacing.md,
                  letterSpacing: "0",
                  fontSize: { xs: "1.5rem", sm: "2.125rem" },
                }}
              >
                {t("composition.title")}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: spacing.md, maxWidth: 600, mx: "auto" }}
              >
                {t("composition.subtitle")}
              </Typography>
              <TextField
                label={t("common.selectDate")}
                type="date"
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: selectedHallituskausi?.startDate,
                  max: selectedHallituskausi?.endDate || undefined,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarTodayIcon sx={{ color: themedColors.primary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  maxWidth: 280,
                  "& .MuiOutlinedInput-root": {
                    background: themedColors.backgroundPaper,
                  },
                }}
              />
              {selectedHallituskausi && (
                <Alert severity="info" sx={{ mt: spacing.md }}>
                  {t("common.filteredByGovernmentPeriodLine", {
                    value: selectedHallituskausi.label,
                  })}
                </Alert>
              )}
            </CardContent>
          </Box>
        </Box>
      </Fade>

      {/* Parliament Statistics */}
      {!loading && !error && stats.totalMembers > 0 && (
        <Fade in timeout={600}>
          <Box>
            <Box
              sx={{
                mb: spacing.lg,
                borderRadius: 1,
                background: themedColors.backgroundPaper,
                border: `1px solid ${themedColors.dataBorder}`,
                boxShadow:
                  "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: spacing.lg } }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    color: themedColors.primary,
                    fontWeight: 600,
                    mb: spacing.md,
                    textAlign: "center",
                    letterSpacing: "0",
                    fontSize: { xs: "1.25rem", sm: "1.5rem" },
                  }}
                >
                  Eduskunnan jakauma
                </Typography>

                {/* Summary Stats */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(3, 1fr)",
                    },
                    gap: { xs: spacing.sm, sm: spacing.md },
                    mb: spacing.lg,
                  }}
                >
                  <Box
                    sx={{
                      textAlign: "center",
                      p: { xs: spacing.md, sm: spacing.lg },
                      borderRadius: 1,
                      background: `${themedColors.primary}10`,
                      border: `1px solid ${themedColors.primary}40`,
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        borderColor: themedColors.primary,
                        boxShadow: `0 2px 6px ${themedColors.primary}30`,
                      },
                    }}
                  >
                    <GroupsIcon
                      sx={{
                        fontSize: { xs: 36, sm: 48 },
                        color: themedColors.primary,
                        mb: 1,
                      }}
                    />
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 600,
                        color: themedColors.primary,
                        fontSize: { xs: "2rem", sm: "2.5rem" },
                        mb: 0.5,
                      }}
                    >
                      {stats.totalMembers}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: themedColors.textSecondary,
                        fontWeight: 600,
                      }}
                    >
                      {t("composition.distribution.totalMembers")}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      textAlign: "center",
                      p: { xs: spacing.md, sm: spacing.lg },
                      borderRadius: 1,
                      background: `${themedColors.success}10`,
                      border: `1px solid ${themedColors.success}40`,
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        borderColor: themedColors.success,
                        boxShadow: `0 2px 6px ${themedColors.success}30`,
                      },
                    }}
                  >
                    <AccountBalanceIcon
                      sx={{
                        fontSize: { xs: 36, sm: 48 },
                        color: themedColors.success,
                        mb: 1,
                      }}
                    />
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 600,
                        color: themedColors.success,
                        fontSize: { xs: "2rem", sm: "2.5rem" },
                        mb: 0.5,
                      }}
                    >
                      {stats.inGovernment}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: themedColors.textSecondary,
                        fontWeight: 600,
                      }}
                    >
                      Hallituksessa
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textTertiary, fontWeight: 500 }}
                    >
                      {(
                        (stats.inGovernment / stats.totalMembers) *
                        100
                      ).toFixed(1)}
                      % edustajista
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      textAlign: "center",
                      p: { xs: spacing.md, sm: spacing.lg },
                      borderRadius: 1,
                      background: `${themedColors.warning}10`,
                      border: `1px solid ${themedColors.warning}40`,
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        borderColor: themedColors.warning,
                        boxShadow: `0 2px 6px ${themedColors.warning}30`,
                      },
                    }}
                  >
                    <PieChartIcon
                      sx={{
                        fontSize: { xs: 36, sm: 48 },
                        color: themedColors.warning,
                        mb: 1,
                      }}
                    />
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 600,
                        color: themedColors.warning,
                        fontSize: { xs: "2rem", sm: "2.5rem" },
                        mb: 0.5,
                      }}
                    >
                      {stats.inOpposition}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: themedColors.textSecondary,
                        fontWeight: 600,
                      }}
                    >
                      Oppositiossa
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textTertiary, fontWeight: 500 }}
                    >
                      {(
                        (stats.inOpposition / stats.totalMembers) *
                        100
                      ).toFixed(1)}
                      % edustajista
                    </Typography>
                  </Box>
                </Box>

                {/* Party Breakdown */}
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    color: themedColors.primary,
                    mb: spacing.md,
                    fontSize: "1.125rem",
                  }}
                >
                  {t("composition.partyBreakdown.title")}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {stats.partyGroups.map(([party, data]) => (
                    <Box
                      key={party}
                      sx={{
                        flex: { xs: "1 1 100%", sm: "1 1 300px" },
                        p: { xs: spacing.sm, sm: spacing.md },
                        borderRadius: 1,
                        background: themedColors.backgroundPaper,
                        border: `1px solid ${themedColors.dataBorder}`,
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          borderColor: themedColors.primary,
                          boxShadow: `0 2px 6px ${themedColors.primary}30`,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1.5,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            color: themedColors.textPrimary,
                          }}
                        >
                          {party}
                        </Typography>
                        <Chip
                          label={t("composition.partyBreakdown.members", {
                            count: data.total,
                          })}
                          size="small"
                          sx={{
                            background: themedColors.primary,
                            color: "white",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          gap: spacing.sm,
                          mt: spacing.sm,
                          flexWrap: "wrap",
                        }}
                      >
                        {data.inGovernment > 0 && (
                          <Chip
                            icon={
                              <AccountBalanceIcon
                                sx={{
                                  fontSize: 16,
                                  color: themedColors.success,
                                }}
                              />
                            }
                            label={t(
                              "composition.partyBreakdown.governmentCountLine",
                              { count: data.inGovernment },
                            )}
                            size="small"
                            sx={{
                              background: `${themedColors.success}20`,
                              color: themedColors.success,
                              fontWeight: 600,
                              border: `1px solid ${themedColors.success}`,
                            }}
                          />
                        )}
                        {data.total - data.inGovernment > 0 && (
                          <Chip
                            label={t(
                              "composition.partyBreakdown.oppositionCountLine",
                              { count: data.total - data.inGovernment },
                            )}
                            size="small"
                            sx={{
                              background: `${themedColors.warning}20`,
                              color: themedColors.warning,
                              fontWeight: 600,
                              border: `1px solid ${themedColors.warning}`,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Box>
          </Box>
        </Fade>
      )}

      {/* Filter Chips */}
      {!loading && !error && members.length > 0 && (
        <Fade in timeout={650}>
          <Box
            sx={{
              mb: spacing.lg,
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              alignItems: "center",
            }}
          >
            {/* Government/Opposition filter */}
            {(["all", "government", "opposition"] as const).map((g) => (
              <Chip
                key={g}
                label={
                  g === "all"
                    ? t("composition.details.filters.all")
                    : g === "government"
                      ? t("composition.details.filters.government")
                      : t("composition.details.filters.opposition")
                }
                size="small"
                onClick={() => setGovFilter(g)}
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  height: 32,
                  bgcolor:
                    govFilter === g
                      ? themedColors.primary
                      : themedColors.backgroundPaper,
                  color: govFilter === g ? "white" : themedColors.textSecondary,
                  border: `1px solid ${govFilter === g ? themedColors.primary : themedColors.dataBorder}`,
                  "&:hover": {
                    bgcolor:
                      govFilter === g
                        ? themedColors.primary
                        : `${themedColors.primary}10`,
                  },
                }}
              />
            ))}

            <Box
              sx={{
                width: 1,
                height: 24,
                borderLeft: `1px solid ${themedColors.dataBorder}`,
                mx: 0.5,
              }}
            />

            {/* Party filter */}
            {partyFilter && (
              <Chip
                label={`${partyFilter} ✕`}
                size="small"
                onClick={() => setPartyFilter(null)}
                sx={{
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  height: 32,
                  bgcolor: themedColors.primary,
                  color: "white",
                  "&:hover": { bgcolor: themedColors.primary },
                }}
              />
            )}
            {!partyFilter &&
              uniqueParties.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  size="small"
                  onClick={() => setPartyFilter(p)}
                  sx={{
                    fontWeight: 500,
                    fontSize: "0.75rem",
                    height: 28,
                    bgcolor: themedColors.backgroundPaper,
                    color: themedColors.textSecondary,
                    border: `1px solid ${themedColors.dataBorder}`,
                    "&:hover": { bgcolor: `${themedColors.primary}10` },
                  }}
                />
              ))}

            {/* Result count */}
            <Typography
              variant="caption"
              sx={{ color: themedColors.textTertiary, ml: "auto" }}
            >
              {filteredMembers.length} / {members.length} edustajaa
            </Typography>
          </Box>
        </Fade>
      )}

      {/* Loading / Error states */}
      {loading && (
        <Box sx={{ ...commonStyles.centeredFlex, py: spacing.xl }}>
          <CircularProgress sx={{ color: themedColors.primary }} />
        </Box>
      )}
      {!loading && error && (
        <Alert
          severity="error"
          role="status"
          aria-live="polite"
          sx={{ py: spacing.sm, textAlign: "center", mb: spacing.lg }}
        >
          {error}
        </Alert>
      )}

      {/* Mobile Card List */}
      {!loading && !error && (
        <Fade in timeout={700}>
          <Box>
            {filteredMembers.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  mb: spacing.lg,
                  px: 3,
                  py: 4,
                  borderRadius: 1,
                  border: `1px solid ${themedColors.dataBorder}`,
                  background: themedColors.backgroundPaper,
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ color: themedColors.textPrimary, fontWeight: 600 }}
                >
                  {t("composition.noResults")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: themedColors.textSecondary, mt: 0.5 }}
                >
                  {t("composition.noResultsHint")}
                </Typography>
                {(partyFilter || govFilter !== "all") && (
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mt: 2, textTransform: "none" }}
                    onClick={() => {
                      setPartyFilter(null);
                      setGovFilter("all");
                    }}
                  >
                    {t("composition.resetFilters")}
                  </Button>
                )}
              </Paper>
            ) : (
              <>
                <Box sx={{ display: { xs: "block", lg: "none" } }}>
                  {filteredMembers.map((m) => (
                    <Card
                      key={m.person_id}
                      className="trace-hover-parent"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRowClick(m)}
                      onKeyDown={(event) =>
                        handleActivateOnKeyDown(event, () => handleRowClick(m))
                      }
                      sx={{
                        mb: 1.5,
                        cursor: "pointer",
                        border: `1px solid ${themedColors.dataBorder}`,
                        transition: "all 0.2s ease-in-out",
                        "&:focus-visible": {
                          outline: `2px solid ${themedColors.primary}`,
                          outlineOffset: 1,
                        },
                        "&:active": {
                          transform: "scale(0.99)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 600,
                                color: themedColors.textPrimary,
                              }}
                            >
                              {m.first_name} {m.last_name}
                            </Typography>
                            <ItemTraceIcon
                              table="MemberOfParliament"
                              pkName="personId"
                              pkValue={String(m.person_id)}
                              label={`${m.first_name} ${m.last_name}`}
                            />
                          </Box>
                          {m.is_in_government === 1 && (
                            <CheckCircleIcon
                              sx={{
                                color: themedColors.success,
                                fontSize: 20,
                                ml: 1,
                                flexShrink: 0,
                              }}
                              titleAccess="Hallituksessa"
                            />
                          )}
                        </Box>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {m.party_name && (
                            <Chip
                              label={m.party_name}
                              size="small"
                              sx={{
                                background: themedColors.primary,
                                color: "white",
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                height: 26,
                              }}
                            />
                          )}
                          {m.profession && (
                            <Chip
                              label={m.profession}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: "0.75rem",
                                height: 26,
                              }}
                            />
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Box>

                {/* Desktop Table */}
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    borderRadius: 1,
                    background: themedColors.backgroundPaper,
                    border: `1px solid ${themedColors.dataBorder}`,
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
                    mb: spacing.lg,
                    overflow: "hidden",
                    display: { xs: "none", lg: "block" },
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow
                        sx={{
                          background: themedColors.primaryGradient,
                        }}
                      >
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("composition.table.name")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("composition.table.party")}
                        </TableCell>
                        <TableCell
                          sx={{ ...commonStyles.tableHeader }}
                          align="center"
                        >
                          {t("composition.table.government")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("composition.table.gender")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("composition.table.birthDate")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("composition.table.birthPlace")}
                        </TableCell>
                        <TableCell sx={{ ...commonStyles.tableHeader }}>
                          {t("composition.table.occupation")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredMembers.map((m, index) => (
                        <TableRow
                          key={m.person_id}
                          className="trace-hover-parent"
                          hover
                          tabIndex={0}
                          onClick={() => handleRowClick(m)}
                          onKeyDown={(event) =>
                            handleActivateOnKeyDown(event, () =>
                              handleRowClick(m),
                            )
                          }
                          sx={{
                            ...commonStyles.tableRow,
                            borderBottom: `1px solid ${themedColors.dataBorder}`,
                            "&:hover": {
                              background: `${themedColors.primary}08`,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                            },
                            "&:focus-visible": {
                              outline: `2px solid ${themedColors.primary}`,
                              outlineOffset: -2,
                            },
                            animation: `fadeIn 0.3s ease-out ${index * 0.02}s both`,
                            "@keyframes fadeIn": {
                              from: {
                                opacity: 0,
                                transform: "translateY(8px)",
                              },
                              to: {
                                opacity: 1,
                                transform: "translateY(0)",
                              },
                            },
                          }}
                        >
                          <TableCell
                            sx={{
                              ...commonStyles.dataCell,
                              color: themedColors.textPrimary,
                              py: 2.5,
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              {m.first_name} {m.last_name}
                              <ItemTraceIcon
                                table="MemberOfParliament"
                                pkName="personId"
                                pkValue={String(m.person_id)}
                                label={`${m.first_name} ${m.last_name}`}
                              />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 2.5 }}>
                            {m.party_name ? (
                              <Chip
                                label={m.party_name}
                                size="small"
                                sx={{
                                  background: themedColors.primary,
                                  color: "white",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  height: 28,
                                }}
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontWeight: 500 }}
                              >
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2.5 }}>
                            {m.is_in_government === 1 ? (
                              <CheckCircleIcon
                                sx={{
                                  color: themedColors.success,
                                  fontSize: 28,
                                }}
                                titleAccess="Hallituksessa"
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontWeight: 500 }}
                              >
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: themedColors.textSecondary,
                              py: 2.5,
                            }}
                          >
                            {m.gender}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: themedColors.textSecondary,
                              py: 2.5,
                            }}
                          >
                            {m.birth_date}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: themedColors.textSecondary,
                              py: 2.5,
                            }}
                          >
                            {m.birth_place}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: themedColors.textSecondary,
                              py: 2.5,
                            }}
                          >
                            {m.profession}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </Fade>
      )}

      {/* Dialog */}
      <RepresentativeDetails
        open={dialogOpen}
        onClose={handleCloseDialog}
        selectedRepresentative={selectedRepresentative}
        selectedDate={date}
      />
    </Box>
  );
};
