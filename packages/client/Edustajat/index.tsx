import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  Box,
  Alert,
  CardContent,
  InputAdornment,
  Fade,
  Chip,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import GroupsIcon from "@mui/icons-material/Groups";
import PieChartIcon from "@mui/icons-material/PieChart";
import { RepresentativeDetails } from "./Details";
import { GlassCard, StatCard } from "../theme/components";
import { commonStyles, colors, spacing, gradients } from "../theme";

type MemberWithExtras = DatabaseQueries.GetParliamentComposition & {
  party_name?: string;
  is_in_government?: number;
};

export default function App() {
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
  }, [members]);

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
  }, [members]);

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
              borderRadius: 3,
              background: "#ffffff",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <CardContent sx={{ p: spacing.lg, textAlign: "center" }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  color: colors.primary,
                  fontWeight: 700,
                  mb: spacing.md,
                  letterSpacing: "-0.01em",
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
                      <CalendarTodayIcon sx={{ color: colors.primary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  maxWidth: 280,
                  "& .MuiOutlinedInput-root": {
                    background: "#ffffff",
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
                borderRadius: 3,
                background: "#ffffff",
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <CardContent sx={{ p: spacing.lg }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    color: colors.primary,
                    fontWeight: 700,
                    mb: spacing.md,
                    textAlign: "center",
                    letterSpacing: "-0.01em",
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
                    gap: spacing.md,
                    mb: spacing.lg,
                  }}
                >
                  <Box
                    sx={{
                      textAlign: "center",
                      p: spacing.lg,
                      borderRadius: 2,
                      background: "rgba(0, 53, 128, 0.04)",
                      border: "2px solid rgba(0, 53, 128, 0.15)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: colors.primary,
                        boxShadow: "0 4px 12px rgba(0, 53, 128, 0.15)",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <GroupsIcon
                      sx={{ fontSize: 48, color: colors.primary, mb: 1.5 }}
                    />
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 700,
                        color: colors.primary,
                        fontSize: "3rem",
                        mb: 0.5,
                      }}
                    >
                      {stats.totalMembers}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ color: colors.textSecondary, fontWeight: 600 }}
                    >
                      Jäsentä yhteensä
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      textAlign: "center",
                      p: spacing.lg,
                      borderRadius: 2,
                      background: "rgba(46, 125, 50, 0.04)",
                      border: "2px solid rgba(46, 125, 50, 0.15)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: colors.success,
                        boxShadow: "0 4px 12px rgba(46, 125, 50, 0.15)",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <AccountBalanceIcon
                      sx={{ fontSize: 48, color: colors.success, mb: 1.5 }}
                    />
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 700,
                        color: colors.success,
                        fontSize: "3rem",
                        mb: 0.5,
                      }}
                    >
                      {stats.inGovernment}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ color: colors.textSecondary, fontWeight: 600 }}
                    >
                      Hallituksessa
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: colors.textTertiary, fontWeight: 500 }}
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
                      p: spacing.lg,
                      borderRadius: 2,
                      background: "rgba(239, 108, 0, 0.04)",
                      border: "2px solid rgba(239, 108, 0, 0.15)",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: colors.warning,
                        boxShadow: "0 4px 12px rgba(239, 108, 0, 0.15)",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <PieChartIcon
                      sx={{ fontSize: 48, color: colors.warning, mb: 1.5 }}
                    />
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 700,
                        color: colors.warning,
                        fontSize: "3rem",
                        mb: 0.5,
                      }}
                    >
                      {stats.inOpposition}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ color: colors.textSecondary, fontWeight: 600 }}
                    >
                      Oppositiossa
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: colors.textTertiary, fontWeight: 500 }}
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
                    fontWeight: 700,
                    color: colors.primary,
                    mb: spacing.md,
                    fontSize: "1.25rem",
                  }}
                >
                  Puolueiden jako
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {stats.partyGroups.map(([party, data]) => (
                    <Box
                      key={party}
                      sx={{
                        flex: "1 1 300px",
                        p: spacing.md,
                        borderRadius: 2,
                        background: "#ffffff",
                        border: "1px solid #e0e0e0",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&:hover": {
                          borderColor: colors.primary,
                          boxShadow: "0 2px 8px rgba(0, 53, 128, 0.1)",
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
                          sx={{ fontWeight: 700, color: colors.textPrimary }}
                        >
                          {party}
                        </Typography>
                        <Chip
                          label={`${data.total} jäsentä`}
                          size="small"
                          sx={{
                            background: colors.primary,
                            color: "#ffffff",
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
                                sx={{ fontSize: 16, color: colors.success }}
                              />
                            }
                            label={`Hallitus: ${data.inGovernment}`}
                            size="small"
                            sx={{
                              background: "rgba(46, 125, 50, 0.1)",
                              color: colors.success,
                              fontWeight: 600,
                              border: `1px solid ${colors.success}`,
                            }}
                          />
                        )}
                        {data.total - data.inGovernment > 0 && (
                          <Chip
                            label={`Oppositio: ${data.total - data.inGovernment}`}
                            size="small"
                            sx={{
                              background: "rgba(239, 108, 0, 0.1)",
                              color: colors.warning,
                              fontWeight: 600,
                              border: `1px solid ${colors.warning}`,
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

      {/* Main Table */}
      <Fade in timeout={700}>
        <Box>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              background: "#ffffff",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              mb: spacing.lg,
              overflow: "hidden",
            }}
          >
            {loading ? (
              <Box sx={{ ...commonStyles.centeredFlex, py: spacing.xl }}>
                <CircularProgress sx={{ color: colors.primary }} />
              </Box>
            ) : error ? (
              <Alert
                severity="error"
                sx={{ py: spacing.sm, textAlign: "center" }}
              >
                {error}
              </Alert>
            ) : (
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      background: gradients.primary,
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
                      <TableCell sx={{ ...commonStyles.dataCell, py: 2.5 }}>
                        {m.first_name} {m.last_name}
                      </TableCell>
                      <TableCell sx={{ py: 2.5 }}>
                        {(m as any).party_name ? (
                          <Chip
                            label={(m as any).party_name}
                            size="small"
                            sx={{
                              background: colors.primary,
                              color: "#ffffff",
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
                              color: colors.success,
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
                      <TableCell sx={{ ...commonStyles.labelCell, py: 2.5 }}>
                        {m.gender}
                      </TableCell>
                      <TableCell sx={{ ...commonStyles.labelCell, py: 2.5 }}>
                        {m.birth_date}
                      </TableCell>
                      <TableCell sx={{ ...commonStyles.labelCell, py: 2.5 }}>
                        {m.birth_place}
                      </TableCell>
                      <TableCell sx={{ ...commonStyles.labelCell, py: 2.5 }}>
                        {m.profession}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        </Box>
      </Fade>

      {/* Dialog */}
      <RepresentativeDetails
        open={dialogOpen}
        onClose={handleCloseDialog}
        selectedRepresentative={selectedRepresentative}
        selectedDate={date}
      />

      {/* Footer */}
      <Fade in timeout={900}>
        <Box>
          <Box
            sx={{
              mt: spacing.lg,
              p: spacing.md,
              textAlign: "center",
              borderRadius: 3,
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              Tietolähde: Eduskunnan avoin data
            </Typography>
          </Box>
        </Box>
      </Fade>
    </Box>
  );
}
