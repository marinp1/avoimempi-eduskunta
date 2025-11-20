import CloseIcon from "@mui/icons-material/Close";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import {
  Alert,
  Box,
  CardContent,
  Checkbox,
  CircularProgress,
  Fade,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors, commonStyles, spacing } from "../theme";
import { GlassCard } from "../theme/components";
import { useThemedColors } from "../theme/ThemeContext";

interface PartyParticipationData {
  government: string;
  government_start: string;
  government_end: string | null;
  party_name: string;
  votes_cast: number;
  total_votings: number;
  participation_rate: number;
  party_member_count: number;
  was_in_coalition: number;
}

interface PartyParticipationProps {
  onClose: () => void;
}

// Colors for different parties (Finnish party colors)
const PARTY_COLORS: Record<string, string> = {
  KOK: "#0066CC", // Kokoomus - Blue
  SDP: "#E11931", // SDP - Red
  PS: "#FFDE55", // Perussuomalaiset - Yellow
  KESK: "#3AAA35", // Keskusta - Green
  VIHR: "#61BF1A", // Vihreät - Light Green
  VAS: "#AA0000", // Vasemmisto - Dark Red
  RKP: "#FFD500", // RKP - Yellow
  KD: "#1E90FF", // KD - Light Blue
  LIIK: "#00A0DC", // Liike Nyt - Cyan
  default: "#999999", // Default gray
};

export default function PartyParticipation({
  onClose,
}: PartyParticipationProps) {
  const themedColors = useThemedColors();
  const [data, setData] = useState<PartyParticipationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedParties, setSelectedParties] = useState<Set<string>>(
    new Set(),
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(
        `/api/insights/party-participation-by-government?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch party participation data");
      }

      const result = await response.json();
      setData(result);

      // Initialize with all parties selected
      const parties = new Set<string>(result.map((d: any) => d.party_name));
      setSelectedParties(parties);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Transform data for chart
  const chartData = React.useMemo(() => {
    if (data.length === 0) return [];

    // Group by government
    const byGovernment: Record<
      string,
      Record<string, { participation_rate: number; was_in_coalition: number }>
    > = {};

    data.forEach((item) => {
      if (!byGovernment[item.government]) {
        byGovernment[item.government] = {};
      }
      byGovernment[item.government][item.party_name] = {
        participation_rate: item.participation_rate,
        was_in_coalition: item.was_in_coalition,
      };
    });

    // Convert to chart format
    return Object.entries(byGovernment).map(([government, parties]) => {
      const point: any = { government };
      Object.entries(parties).forEach(([partyName, partyData]) => {
        point[partyName] = partyData.participation_rate;
        point[`${partyName}_coalition`] = partyData.was_in_coalition;
      });
      return point;
    });
  }, [data]);

  // Get unique parties
  const allParties = React.useMemo(() => {
    return Array.from(new Set(data.map((d) => d.party_name))).sort();
  }, [data]);

  const handlePartyToggle = (party: string) => {
    const newSelected = new Set(selectedParties);
    if (newSelected.has(party)) {
      newSelected.delete(party);
    } else {
      newSelected.add(party);
    }
    setSelectedParties(newSelected);
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: {
      value: number;
      dataKey: string;
      payload: Record<string, number>;
      color: string;
    }[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: themedColors.backgroundPaper,
            padding: spacing.md,
            borderRadius: 2,
            border: `1px solid ${themedColors.glassBorder}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          <Typography
            variant="body1"
            sx={{ fontWeight: 700, mb: spacing.sm, fontSize: "0.9rem" }}
          >
            {label}
          </Typography>
          {payload
            .sort((a, b) => b.value - a.value)
            .map((entry) => {
              const isInCoalition =
                entry.payload[`${entry.dataKey}_coalition`] === 1;
              return (
                <Box
                  key={entry.dataKey}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.xs,
                    mb: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      backgroundColor: entry.color,
                      borderRadius: "50%",
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.primary",
                      fontWeight: isInCoalition ? 700 : 400,
                      fontSize: "0.85rem",
                    }}
                  >
                    {entry.dataKey}: {entry.value}%{isInCoalition && " ★"}
                  </Typography>
                </Box>
              );
            })}
          <Typography
            variant="caption"
            sx={{ display: "block", mt: spacing.sm, color: "text.secondary" }}
          >
            ★ = Hallituspuolue
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          p: spacing.lg,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: spacing.lg }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: spacing.lg, minHeight: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: spacing.lg,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <HowToVoteIcon sx={{ fontSize: 36, color: colors.primary }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Puolueiden äänestysosallistuminen
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </Box>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: spacing.lg }}
      >
        Seuraa puolueiden äänestysosallistumista eri hallitusten aikana.
        Hallituspuolueet merkitty tähdellä (★).
      </Typography>

      {/* Filters */}
      <Fade in timeout={400}>
        <Box sx={{ mb: spacing.lg }}>
          <GlassCard>
            <CardContent sx={{ p: spacing.md }}>
              <Typography variant="h6" sx={{ mb: spacing.sm, fontWeight: 600 }}>
                Suodattimet
              </Typography>
              <Grid container spacing={spacing.sm}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Aloituspäivä"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={commonStyles.styledTextField}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Lopetuspäivä"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={commonStyles.styledTextField}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Box>
      </Fade>

      {/* Party Selection */}
      <Fade in timeout={500}>
        <Box sx={{ mb: spacing.lg }}>
          <GlassCard>
            <CardContent sx={{ p: spacing.md }}>
              <Typography variant="h6" sx={{ mb: spacing.sm, fontWeight: 600 }}>
                Valitse puolueet
              </Typography>
              <FormGroup
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "1fr 1fr 1fr 1fr",
                  },
                  gap: spacing.xs,
                }}
              >
                {allParties.map((party) => (
                  <FormControlLabel
                    key={party}
                    control={
                      <Checkbox
                        checked={selectedParties.has(party)}
                        onChange={() => handlePartyToggle(party)}
                        sx={{
                          color: PARTY_COLORS[party] || PARTY_COLORS.default,
                          "&.Mui-checked": {
                            color: PARTY_COLORS[party] || PARTY_COLORS.default,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: PARTY_COLORS[party] || PARTY_COLORS.default,
                        }}
                      >
                        {party}
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            </CardContent>
          </GlassCard>
        </Box>
      </Fade>

      {/* Chart */}
      <Fade in timeout={600}>
        <Box>
          <GlassCard>
            <CardContent sx={{ p: spacing.lg }}>
              <Typography variant="h5" sx={{ mb: spacing.sm, fontWeight: 600 }}>
                Osallistumisprosentti hallituksittain
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: spacing.lg }}
              >
                Puolueiden äänestysosallistuminen eri hallitusten aikana
              </Typography>

              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="government"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      style={{ fontSize: "12px" }}
                      tick={{ fill: themedColors.textSecondary }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      style={{ fontSize: "14px" }}
                      tick={{ fill: themedColors.textSecondary }}
                      label={{
                        value: "Osallistumisprosentti (%)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: "20px" }}
                      iconType="line"
                    />
                    {allParties
                      .filter((party) => selectedParties.has(party))
                      .map((party) => (
                        <Line
                          key={party}
                          type="monotone"
                          dataKey={party}
                          stroke={PARTY_COLORS[party] || PARTY_COLORS.default}
                          strokeWidth={2}
                          dot={{
                            fill: PARTY_COLORS[party] || PARTY_COLORS.default,
                            r: 4,
                          }}
                          activeDot={{ r: 6 }}
                          name={party}
                        />
                      ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Alert severity="info">
                  Ei dataa valitulle aikavälille tai puolueille.
                </Alert>
              )}
            </CardContent>
          </GlassCard>
        </Box>
      </Fade>

      {/* Summary Statistics */}
      {data.length > 0 && (
        <Fade in timeout={700}>
          <Box sx={{ mt: spacing.lg }}>
            <GlassCard>
              <CardContent sx={{ p: spacing.lg }}>
                <Typography
                  variant="h5"
                  sx={{ mb: spacing.md, fontWeight: 600 }}
                >
                  Yhteenveto
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "1fr 1fr 1fr",
                    },
                    gap: spacing.md,
                  }}
                >
                  <Box
                    sx={{
                      p: spacing.md,
                      borderRadius: 2,
                      background: themedColors.backgroundSubtle,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Hallituksia yhteensä
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {new Set(data.map((d) => d.government)).size}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: spacing.md,
                      borderRadius: 2,
                      background: themedColors.backgroundSubtle,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Puolueita yhteensä
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {allParties.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: spacing.md,
                      borderRadius: 2,
                      background: themedColors.backgroundSubtle,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Keskimääräinen osallistuminen
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {(
                        data.reduce((sum, d) => sum + d.participation_rate, 0) /
                        data.length
                      ).toFixed(1)}
                      %
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </Box>
        </Fade>
      )}
    </Box>
  );
}
