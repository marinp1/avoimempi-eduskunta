import React from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import { ParticipationByGovernmentData } from "./types";
import { GlassCard } from "../../theme/components";
import { colors, spacing, gradients } from "../../theme";
import { useThemedColors } from "../../theme/ThemeContext";

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

        const response = await fetch(
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

  const formatGovernment = (name: string): string => {
    return name;
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
          label="Ministeri"
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
          label="Hallituspuolue"
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
          label="Oppositio"
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
    <GlassCard>
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
            {representativeName} - Historiallinen vertailu
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
          Äänestysosallistuminen eri hallitusten aikana
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
                    Hallitus
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    Rooli
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    Äänestyksiä
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    Yhteensä
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    Osallistuminen
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ color: "white", fontWeight: 600 }}
                  >
                    Trendi
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
                          {formatGovernment(row.government)}
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
              Ei tietoja tälle edustajalle.
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
              Vain yksi hallitus saatavilla. Historiallinen vertailu vaatii
              useamman hallituksen.
            </Typography>
          </Box>
        )}
      </Box>
    </GlassCard>
  );
}
