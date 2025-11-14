import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  Chip,
  Typography,
  Tooltip,
} from "@mui/material";
import { ParticipationData, SortField, SortDirection } from "./types";
import { GlassCard } from "../../theme/components";
import { colors, commonStyles, spacing } from "../../theme";

interface ParticipationTableProps {
  data: ParticipationData[];
  onSelectPerson?: (personId: number) => void;
}

export function ParticipationTable({
  data,
  onSelectPerson,
}: ParticipationTableProps) {
  const [sortField, setSortField] = useState<SortField>("participation_rate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "participation_rate" ? "desc" : "asc");
    }
  };

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null values
      if (aVal === null) aVal = "";
      if (bVal === null) bVal = "";

      // Compare
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? comparison : -comparison;
      } else {
        const comparison = aVal - bVal;
        return sortDirection === "asc" ? comparison : -comparison;
      }
    });
  }, [data, sortField, sortDirection]);

  const getParticipationColor = (rate: number): string => {
    if (rate >= 90) return colors.success;
    if (rate >= 70) return colors.warning;
    return colors.error;
  };

  const formatTerm = (start: string, end: string): string => {
    const startYear = new Date(start).getFullYear();
    const endYear = end ? new Date(end).getFullYear() : "nykyinen";
    return `${startYear}–${endYear}`;
  };

  return (
    <GlassCard>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Sija
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                <TableSortLabel
                  active={sortField === "sort_name"}
                  direction={sortField === "sort_name" ? sortDirection : "asc"}
                  onClick={() => handleSort("sort_name")}
                  sx={{
                    color: "white !important",
                    "&:hover": { color: "rgba(255,255,255,0.8) !important" },
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                  }}
                >
                  Edustaja
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                Vaalikausi
              </TableCell>
              <TableCell align="right" sx={{ color: "white", fontWeight: 600 }}>
                <TableSortLabel
                  active={sortField === "votes_cast"}
                  direction={sortField === "votes_cast" ? sortDirection : "asc"}
                  onClick={() => handleSort("votes_cast")}
                  sx={{
                    color: "white !important",
                    "&:hover": { color: "rgba(255,255,255,0.8) !important" },
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                  }}
                >
                  Äänestyksiä
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ color: "white", fontWeight: 600 }}>
                Yhteensä
              </TableCell>
              <TableCell align="right" sx={{ color: "white", fontWeight: 600 }}>
                <TableSortLabel
                  active={sortField === "participation_rate"}
                  direction={
                    sortField === "participation_rate" ? sortDirection : "desc"
                  }
                  onClick={() => handleSort("participation_rate")}
                  sx={{
                    color: "white !important",
                    "&:hover": { color: "rgba(255,255,255,0.8) !important" },
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                  }}
                >
                  Osallistuminen
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row, index) => (
              <TableRow
                key={`${row.person_id}-${row.term_start}-${row.term_end || "current"}-${index}`}
                sx={{
                  ...commonStyles.interactiveHover,
                  cursor: onSelectPerson ? "pointer" : "default",
                }}
                onClick={() => onSelectPerson?.(row.person_id)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    #{index + 1}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {row.first_name} {row.last_name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
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
                  <Tooltip
                    title={`${row.votes_cast} / ${row.total_votings} äänestystä`}
                  >
                    <Box sx={{ display: "inline-flex", alignItems: "center" }}>
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
                    </Box>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </GlassCard>
  );
}
