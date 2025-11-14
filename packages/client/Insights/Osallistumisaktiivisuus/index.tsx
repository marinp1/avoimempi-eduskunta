import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Fade,
  TextField,
  Grid,
  IconButton,
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import CloseIcon from "@mui/icons-material/Close";
import { GlassCard, StatCard } from "../../theme/components";
import { commonStyles, colors, spacing, gradients } from "../../theme";
import { useThemedColors } from "../../theme/ThemeContext";
import { ParticipationData } from "./types";
import { ParticipationTable } from "./ParticipationTable";
import { HistoricalComparison } from "./HistoricalComparison";

interface OsallistumisaktiivisuusProps {
  onClose: () => void;
  initialPersonId?: number | null;
}

export default function Osallistumisaktiivisuus({
  onClose,
  initialPersonId,
}: OsallistumisaktiivisuusProps) {
  const themedColors = useThemedColors();
  const [data, setData] = useState<ParticipationData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(
    initialPersonId || null,
  );

  // Set selectedPersonId when initialPersonId changes
  useEffect(() => {
    if (initialPersonId) {
      setSelectedPersonId(initialPersonId);
    }
  }, [initialPersonId]);

  // Compute statistics
  const stats = React.useMemo(() => {
    if (data.length === 0) {
      return {
        averageParticipation: 0,
        highestParticipation: 0,
        lowestParticipation: 0,
        totalRepresentatives: 0,
      };
    }

    const participationRates = data.map((d) => d.participation_rate);
    const average =
      participationRates.reduce((a, b) => a + b, 0) / participationRates.length;
    const highest = Math.max(...participationRates);
    const lowest = Math.min(...participationRates);

    return {
      averageParticipation: Math.round(average * 10) / 10,
      highestParticipation: Math.round(highest * 10) / 10,
      lowestParticipation: Math.round(lowest * 10) / 10,
      totalRepresentatives: data.length,
    };
  }, [data]);

  // Fetch participation data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const response = await fetch(
          `/api/insights/participation?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch participation data");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      {/* Fixed Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "background.default",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ p: spacing.md }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: spacing.sm,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <HowToVoteIcon sx={{ fontSize: 32, color: colors.primary }} />
              <Typography variant="h4" sx={commonStyles.gradientText}>
                Äänestysosallistuminen
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="large">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Seuraa kansanedustajien äänestysosallistumista eri hallitusten
            aikana. Tiedot perustuvat äänestystietoihin ja ministeritietoihin.
          </Typography>
        </Box>
      </Box>

      {/* Scrollable Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          p: spacing.lg,
        }}
      >
        <Box>
          {/* Statistics */}
          {!loading && !error && data.length > 0 && (
            <Box>
              <Grid container spacing={spacing.sm} sx={{ mb: spacing.md }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Edustajia"
                    value={stats.totalRepresentatives.toString()}
                    gradient={gradients.info}
                    icon="👥"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Keskiarvo"
                    value={`${stats.averageParticipation}%`}
                    gradient={gradients.primary}
                    icon="📊"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Korkein"
                    value={`${stats.highestParticipation}%`}
                    gradient={gradients.success}
                    icon="🏆"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <StatCard
                    title="Matalin"
                    value={`${stats.lowestParticipation}%`}
                    gradient={gradients.warning}
                    icon="⚠️"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Filters */}
          <Box>
            <GlassCard sx={{ mb: spacing.md }}>
              <Box sx={{ p: spacing.md }}>
                <Typography
                  variant="h6"
                  sx={{ mb: spacing.sm, fontWeight: 600 }}
                >
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
              </Box>
            </GlassCard>
          </Box>

          {/* Loading State */}
          {loading && (
            <Box sx={commonStyles.centeredFlex} py={spacing.xl}>
              <CircularProgress />
            </Box>
          )}

          {/* Error State */}
          {error && (
            <Alert severity="error" sx={{ mb: spacing.md }}>
              {error}
            </Alert>
          )}

          {/* Participation Table */}
          {!loading && !error && data.length > 0 && (
            <Box>
              <ParticipationTable
                data={data}
                onSelectPerson={setSelectedPersonId}
              />
            </Box>
          )}

          {/* Historical Comparison */}
          {!loading && !error && selectedPersonId && (
            <Box sx={{ mt: spacing.md }}>
              <HistoricalComparison
                personId={selectedPersonId}
                startDate={startDate}
                endDate={endDate}
                onClose={() => setSelectedPersonId(null)}
              />
            </Box>
          )}

          {/* No Data State */}
          {!loading && !error && data.length === 0 && (
            <Alert severity="info">
              Ei äänestystietoja valitulle aikavälille.
            </Alert>
          )}

          {/* Footer */}
          <Box sx={{ mt: spacing.lg, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Lähde: Eduskunnan avoin data API
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
