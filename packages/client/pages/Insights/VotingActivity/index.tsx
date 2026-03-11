import HowToVoteIcon from "@mui/icons-material/HowToVote";
import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  intersectDateRangeWithHallituskausi,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, commonStyles, spacing } from "#client/theme";
import { MetricCard, PanelHeader, ToolbarCard } from "#client/theme/components";
import { apiFetch } from "#client/utils/fetch";
import { HistoricalComparison } from "./HistoricalComparison";
import { ParticipationTable } from "./ParticipationTable";
import type { ParticipationData } from "./types";

interface OsallistumisaktiivisuusProps {
  onClose: () => void;
  initialPersonId?: number | null;
}

export default function Osallistumisaktiivisuus({
  onClose,
  initialPersonId,
}: OsallistumisaktiivisuusProps) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tInsights } = useScopedTranslation("insights");
  const { selectedHallituskausi } = useHallituskausi();
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

  const effectiveDateRange = React.useMemo(
    () =>
      intersectDateRangeWithHallituskausi(
        {
          startDate,
          endDate,
        },
        selectedHallituskausi,
      ),
    [endDate, selectedHallituskausi, startDate],
  );

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
        if (effectiveDateRange.startDate) {
          params.set("startDate", effectiveDateRange.startDate);
        }
        if (effectiveDateRange.endDate) {
          params.set("endDate", effectiveDateRange.endDate);
        }

        const response = await apiFetch(
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
  }, [effectiveDateRange.endDate, effectiveDateRange.startDate]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <PanelHeader
        title={tInsights("votingActivity.title")}
        subtitle={tInsights("votingActivity.description")}
        icon={<HowToVoteIcon sx={{ fontSize: 28, color: colors.primary }} />}
        onClose={onClose}
        sticky
      />

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
                  <MetricCard
                    label={tInsights("votingActivity.members")}
                    value={stats.totalRepresentatives.toString()}
                    icon="👥"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    label={tInsights("votingActivity.average")}
                    value={`${stats.averageParticipation}%`}
                    icon="📊"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    label={tInsights("votingActivity.highest")}
                    value={`${stats.highestParticipation}%`}
                    icon="🏆"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <MetricCard
                    label={tInsights("votingActivity.lowest")}
                    value={`${stats.lowestParticipation}%`}
                    icon="⚠️"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Filters */}
          <Box>
            <ToolbarCard title={tInsights("votingActivity.filters")} sx={{ mb: spacing.md }}>
              <Box>
                <Grid container spacing={spacing.sm}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label={tInsights("votingActivity.startDate")}
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
                      label={tInsights("votingActivity.endDate")}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={commonStyles.styledTextField}
                    />
                  </Grid>
                </Grid>
                {selectedHallituskausi && (
                  <Alert severity="info" sx={{ mt: spacing.sm }}>
                    {tCommon("filteredByGovernmentPeriodLine", {
                      value: selectedHallituskausi.label,
                    })}
                  </Alert>
                )}
              </Box>
            </ToolbarCard>
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
                startDate={effectiveDateRange.startDate}
                endDate={effectiveDateRange.endDate}
                onClose={() => setSelectedPersonId(null)}
              />
            </Box>
          )}

          {/* No Data State */}
          {!loading && !error && data.length === 0 && (
            <Alert severity="info">{tInsights("votingActivity.noData")}</Alert>
          )}

          {/* Footer */}
          <Box sx={{ mt: spacing.lg, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {tInsights("votingActivity.source")}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
