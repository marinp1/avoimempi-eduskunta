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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import { ParticipationData } from "./types";
import { GlassCard } from "../../theme/components";
import { colors, spacing } from "../../theme";

interface HistoricalComparisonProps {
  personId: number;
  data: ParticipationData[];
  onClose: () => void;
}

export function HistoricalComparison({
  personId,
  data,
  onClose,
}: HistoricalComparisonProps) {
  const sortedData = React.useMemo(() => {
    return [...data].sort(
      (a, b) =>
        new Date(b.term_start).getTime() - new Date(a.term_start).getTime(),
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

  const formatTerm = (start: string, end: string): string => {
    const startYear = new Date(start).getFullYear();
    const endYear = end ? new Date(end).getFullYear() : "nykyinen";
    return `${startYear}–${endYear}`;
  };

  const getParticipationColor = (rate: number): string => {
    if (rate >= 90) return colors.success;
    if (rate >= 70) return colors.warning;
    return colors.error;
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
          Äänestysosallistuminen eri vaalikausilla
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                <TableCell sx={{ color: "white", fontWeight: 600 }}>
                  Vaalikausi
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
                    key={`${row.person_id}-${row.term_start}-${row.term_end || "current"}-${index}`}
                    sx={{
                      "&:hover": {
                        background: "rgba(102, 126, 234, 0.05)",
                      },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {formatTerm(row.term_start, row.term_end)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{row.votes_cast}</Typography>
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
                          color: getParticipationColor(row.participation_rate),
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

        {sortedData.length === 0 && (
          <Box sx={{ textAlign: "center", py: spacing.md }}>
            <Typography variant="body2" color="text.secondary">
              Ei tietoja tälle edustajalle.
            </Typography>
          </Box>
        )}

        {sortedData.length === 1 && (
          <Box
            sx={{
              mt: spacing.sm,
              p: spacing.sm,
              background: "rgba(33, 150, 243, 0.1)",
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color={colors.info}>
              Vain yksi vaalikausi saatavilla. Historiallinen vertailu vaatii
              useamman vaalikauden.
            </Typography>
          </Box>
        )}
      </Box>
    </GlassCard>
  );
}
