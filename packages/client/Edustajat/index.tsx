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
          <GlassCard sx={{ mb: spacing.lg }}>
            <CardContent sx={{ p: spacing.lg, textAlign: "center" }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  ...commonStyles.gradientText,
                  mb: spacing.md,
                }}
              >
                Eduskunnan kokoonpano
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
                sx={commonStyles.styledTextField}
              />
            </CardContent>
          </GlassCard>
        </Box>
      </Fade>

      {/* Parliament Statistics */}
      {!loading && !error && stats.totalMembers > 0 && (
        <Fade in timeout={600}>
          <Box>
            <GlassCard sx={{ mb: spacing.lg }}>
              <CardContent sx={{ p: spacing.lg }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    ...commonStyles.gradientText,
                    mb: spacing.md,
                    textAlign: "center",
                  }}
                >
                  Eduskunnan jakauma
                </Typography>

                {/* Summary Stats */}
                <Box
                  sx={{
                    display: "flex",
                    gap: spacing.md,
                    mb: spacing.lg,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    sx={{
                      flex: "1 1 200px",
                      textAlign: "center",
                      p: spacing.md,
                      borderRadius: 3,
                      background: "rgba(102, 126, 234, 0.1)",
                    }}
                  >
                    <GroupsIcon
                      sx={{ fontSize: 40, color: colors.primary, mb: 1 }}
                    />
                    <Typography
                      variant="h3"
                      fontWeight="700"
                      color={colors.primary}
                    >
                      {stats.totalMembers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Jäsentä yhteensä
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      flex: "1 1 200px",
                      textAlign: "center",
                      p: spacing.md,
                      borderRadius: 3,
                      background: "rgba(76, 175, 80, 0.1)",
                    }}
                  >
                    <AccountBalanceIcon
                      sx={{ fontSize: 40, color: colors.success, mb: 1 }}
                    />
                    <Typography
                      variant="h3"
                      fontWeight="700"
                      color={colors.success}
                    >
                      {stats.inGovernment}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Hallituksessa
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (
                      {(
                        (stats.inGovernment / stats.totalMembers) *
                        100
                      ).toFixed(1)}
                      %)
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      flex: "1 1 200px",
                      textAlign: "center",
                      p: spacing.md,
                      borderRadius: 3,
                      background: "rgba(255, 152, 0, 0.1)",
                    }}
                  >
                    <PieChartIcon
                      sx={{ fontSize: 40, color: colors.warning, mb: 1 }}
                    />
                    <Typography
                      variant="h3"
                      fontWeight="700"
                      color={colors.warning}
                    >
                      {stats.inOpposition}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Oppositiossa
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (
                      {(
                        (stats.inOpposition / stats.totalMembers) *
                        100
                      ).toFixed(1)}
                      %)
                    </Typography>
                  </Box>
                </Box>

                {/* Party Breakdown */}
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ fontWeight: 600, color: "#667eea", mb: 2 }}
                >
                  Puolueiden jako
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {stats.partyGroups.map(([party, data]) => (
                    <Box
                      key={party}
                      sx={{
                        flex: "1 1 300px",
                        p: 2,
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(102, 126, 234, 0.2)",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body1" fontWeight="600">
                          {party}
                        </Typography>
                        <Chip
                          label={`${data.total} jäsentä`}
                          size="small"
                          sx={{
                            background: "rgba(102, 126, 234, 0.15)",
                            color: "#667eea",
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <Box sx={{ display: "flex", gap: spacing.sm, mt: 1 }}>
                        {data.inGovernment > 0 && (
                          <Chip
                            icon={<AccountBalanceIcon sx={{ fontSize: 16 }} />}
                            label={`Hallitus: ${data.inGovernment}`}
                            size="small"
                            sx={{
                              background: "rgba(76, 175, 80, 0.15)",
                              color: colors.success,
                              fontWeight: 500,
                            }}
                          />
                        )}
                        {data.total - data.inGovernment > 0 && (
                          <Chip
                            label={`Oppositio: ${data.total - data.inGovernment}`}
                            size="small"
                            sx={{
                              background: "rgba(255, 152, 0, 0.15)",
                              color: colors.warning,
                              fontWeight: 500,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </GlassCard>
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
              ...commonStyles.glassCard,
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
                    <TableCell sx={{ color: "white", fontWeight: 600 }}>
                      Nimi
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: 600 }}>
                      Puolue
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: 600 }}>
                      Hallitus
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: 600 }}>
                      Sukupuoli
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: 600 }}>
                      Syntymäaika
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: 600 }}>
                      Syntymäpaikka
                    </TableCell>
                    <TableCell sx={{ color: "white", fontWeight: 600 }}>
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
                        ...commonStyles.interactiveHover,
                        animation: `fadeIn 0.5s ease-in-out ${index * 0.05}s both`,
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
                      onClick={() => handleRowClick(m)}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>
                        {m.first_name} {m.last_name}
                      </TableCell>
                      <TableCell>
                        {(m as any).party_name ? (
                          <Chip
                            label={(m as any).party_name}
                            size="small"
                            sx={{
                              background: "rgba(102, 126, 234, 0.15)",
                              color: "#667eea",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                            }}
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {(m as any).is_in_government === 1 ? (
                          <CheckCircleIcon
                            sx={{
                              color: "#4caf50",
                              fontSize: 24,
                            }}
                            titleAccess="Hallituksessa"
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{m.gender}</TableCell>
                      <TableCell>{m.birth_date}</TableCell>
                      <TableCell>{m.birth_place}</TableCell>
                      <TableCell>{m.profession}</TableCell>
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
