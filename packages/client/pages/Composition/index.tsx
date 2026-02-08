import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupsIcon from "@mui/icons-material/Groups";
import PieChartIcon from "@mui/icons-material/PieChart";
import {
  Alert,
  Box,
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
import { commonStyles, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { RepresentativeDetails } from "./Details";

type MemberWithExtras = DatabaseQueries.GetParliamentComposition & {
  party_name?: string;
  is_in_government?: number;
};

export default () => {
  const themedColors = useThemedColors();

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
    setDate(newDate);
    updateURL(newDate);
  };

  const handleRowClick = (member: DatabaseQueries.GetParliamentComposition) => {
    setSelectedRepresentative(member);
    setDialogOpen(true);
    updateURL(undefined, member.person_id);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRepresentative(null);
    updateURL(undefined, null);
  };

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
            <CardContent sx={{ p: { xs: 2, sm: spacing.lg }, textAlign: "center" }}>
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
                Eduskunnan kokoonpano
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: spacing.md, maxWidth: 600, mx: "auto" }}
              >
                Selaa kansanedustajia ja heidän tietojaan
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
                sx={{
                  maxWidth: 280,
                  "& .MuiOutlinedInput-root": {
                    background: themedColors.backgroundPaper,
                  },
                }}
              />
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
                      Jäsentä yhteensä
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
                  Puolueiden jako
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
                          label={`${data.total} jäsentä`}
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
                            label={`Hallitus: ${data.inGovernment}`}
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
                            label={`Oppositio: ${data.total - data.inGovernment}`}
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

      {/* Loading / Error states */}
      {loading && (
        <Box sx={{ ...commonStyles.centeredFlex, py: spacing.xl }}>
          <CircularProgress sx={{ color: themedColors.primary }} />
        </Box>
      )}
      {!loading && error && (
        <Alert
          severity="error"
          sx={{ py: spacing.sm, textAlign: "center", mb: spacing.lg }}
        >
          {error}
        </Alert>
      )}

      {/* Mobile Card List */}
      {!loading && !error && (
        <Fade in timeout={700}>
          <Box>
            <Box sx={{ display: { xs: "block", lg: "none" } }}>
              {members.map((m) => (
                <Card
                  key={m.person_id}
                  onClick={() => handleRowClick(m)}
                  sx={{
                    mb: 1.5,
                    cursor: "pointer",
                    border: `1px solid ${themedColors.dataBorder}`,
                    transition: "all 0.2s ease-in-out",
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
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, color: themedColors.textPrimary }}
                      >
                        {m.first_name} {m.last_name}
                      </Typography>
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
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
                      Nimi
                    </TableCell>
                    <TableCell sx={{ ...commonStyles.tableHeader }}>
                      Puolue
                    </TableCell>
                    <TableCell
                      sx={{ ...commonStyles.tableHeader }}
                      align="center"
                    >
                      Hallitus
                    </TableCell>
                    <TableCell sx={{ ...commonStyles.tableHeader }}>
                      Sukupuoli
                    </TableCell>
                    <TableCell sx={{ ...commonStyles.tableHeader }}>
                      Syntymäaika
                    </TableCell>
                    <TableCell sx={{ ...commonStyles.tableHeader }}>
                      Syntymäpaikka
                    </TableCell>
                    <TableCell sx={{ ...commonStyles.tableHeader }}>
                      Ammatti
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((m, index) => (
                    <TableRow
                      key={m.person_id}
                      hover
                      sx={{
                        ...commonStyles.tableRow,
                        borderBottom: `1px solid ${themedColors.dataBorder}`,
                        "&:hover": {
                          background: `${themedColors.primary}08`,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
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
                      onClick={() => handleRowClick(m)}
                    >
                      <TableCell
                        sx={{
                          ...commonStyles.dataCell,
                          color: themedColors.textPrimary,
                          py: 2.5,
                        }}
                      >
                        {m.first_name} {m.last_name}
                      </TableCell>
                      <TableCell sx={{ py: 2.5 }}>
                        {(m as any).party_name ? (
                          <Chip
                            label={(m as any).party_name}
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
                        {(m as any).is_in_government === 1 ? (
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
