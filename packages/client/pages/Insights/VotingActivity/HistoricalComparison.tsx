import CloseIcon from "@mui/icons-material/Close";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, gradients, spacing } from "#client/theme";
import { DataCard } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";
import type { ParticipationByGovernmentData } from "./types";

interface HistoricalComparisonProps {
  personId: number;
  onClose: () => void;
  startDate?: string;
  endDate?: string;
}

export function HistoricalComparison({
  personId,
  onClose,
  startDate,
  endDate,
}: HistoricalComparisonProps) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tComposition } = useScopedTranslation("composition");
  const { t: tDocuments } = useScopedTranslation("documents");
  const { t: tInsights } = useScopedTranslation("insights");
  const { t: tParties } = useScopedTranslation("parties");
  const themedColors = useThemedColors();
  const [data, setData] = React.useState<ParticipationByGovernmentData[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const response = await apiFetch(
          `/api/insights/participation/${personId}/by-government?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch participation data by government");
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
  }, [personId, startDate, endDate]);

  const sortedData = React.useMemo(() => {
    return [...data].sort(
      (a, b) =>
        new Date(b.government_start).getTime() -
        new Date(a.government_start).getTime(),
    );
  }, [data]);

  const representativeName =
    sortedData.length > 0
      ? `${sortedData[0].first_name} ${sortedData[0].last_name}`
      : "";

  const getTrendIcon = (current: number, previous: number | null) => {
    if (previous === null) return <TrendingFlatIcon fontSize="small" />;
    const diff = current - previous;
    if (diff > 1)
      return <TrendingUpIcon fontSize="small" sx={{ color: colors.success }} />;
    if (diff < -1)
      return <TrendingDownIcon fontSize="small" sx={{ color: colors.error }} />;
    return <TrendingFlatIcon fontSize="small" sx={{ color: colors.neutral }} />;
  };

  const getParticipationColor = (rate: number): string => {
    if (rate >= 90) return colors.success;
    if (rate >= 70) return colors.warning;
    return colors.error;
  };

  const getRoleChip = (wasInGovernment: 0 | 1, wasInCoalition: 0 | 1) => {
    if (wasInGovernment) {
      return (
        <Chip
          label={tComposition("details.minister")}
          size="small"
          sx={{
            backgroundColor: themedColors.ministerBackground,
            color: themedColors.ministerColor,
            fontWeight: 600,
          }}
        />
      );
    } else if (wasInCoalition) {
      return (
        <Chip
          label={tComposition("details.filters.government")}
          size="small"
          sx={{
            backgroundColor: themedColors.coalitionBackground,
            color: themedColors.coalitionColor,
            fontWeight: 600,
          }}
        />
      );
    } else {
      return (
        <Chip
          label={tComposition("details.filters.opposition")}
          size="small"
          sx={{
            backgroundColor: themedColors.oppositionBackground,
            color: themedColors.oppositionColor,
            fontWeight: 600,
          }}
        />
      );
    }
  };

  return (
    <DataCard>
      <Box sx={{ p: spacing.md }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: spacing.sm,
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            {representativeName} -{" "}
            {tInsights("votingActivity.historicalComparison")}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: spacing.md }}
        >
          {tInsights("votingActivity.historicalSubtitle")}
        </Typography>

        {loading && (
          <Box
            sx={{ display: "flex", justifyContent: "center", py: spacing.md }}
          >
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: spacing.md }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    background: gradients.scraper,
                  }}
                >
                  <TableCell sx={{ color: "white", fontWeight: 600 }}>
                    {tParties("government")}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    {tDocuments("committeeRole")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    {tInsights("votingActivity.votings")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    {tCommon("total")}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    {tParties("table.participation")}
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    {tInsights("votingActivity.trend")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedData.map((row, index) => {
                  const previousRate =
                    index < sortedData.length - 1
                      ? sortedData[index + 1].participation_rate
                      : null;

                  return (
                    <TableRow
                      key={`${row.person_id}-${row.government}-${index}`}
                      sx={{
                        "&:hover": {
                          backgroundColor: `${themedColors.accent}0D`,
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {row.government}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getRoleChip(
                          row.was_in_government,
                          row.was_in_coalition,
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {row.votes_cast}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {row.total_votings}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${row.participation_rate}%`}
                          size="small"
                          sx={{
                            backgroundColor: `${getParticipationColor(row.participation_rate)}20`,
                            color: getParticipationColor(
                              row.participation_rate,
                            ),
                            fontWeight: 700,
                            minWidth: 70,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {getTrendIcon(row.participation_rate, previousRate)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && !error && sortedData.length === 0 && (
          <Box sx={{ textAlign: "center", py: spacing.md }}>
            <Typography variant="body2" color="text.secondary">
              {tInsights("votingActivity.noPersonData")}
            </Typography>
          </Box>
        )}

        {!loading && !error && sortedData.length === 1 && (
          <Box
            sx={{
              mt: spacing.sm,
              p: spacing.sm,
              backgroundColor: `${themedColors.info}1A`,
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color={colors.info}>
              {tInsights("votingActivity.historicalNeedsMoreData")}
            </Typography>
          </Box>
        )}
      </Box>
    </DataCard>
  );
}
