import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, commonStyles, gradients } from "#client/theme";
import { DataCard } from "#client/theme/components";
import type { ParticipationData, SortDirection, SortField } from "./types";

interface ParticipationTableProps {
  data: ParticipationData[];
  onSelectPerson?: (personId: number) => void;
}

export function ParticipationTable({
  data,
  onSelectPerson,
}: ParticipationTableProps) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tComposition } = useScopedTranslation("composition");
  const { t: tInsights } = useScopedTranslation("insights");
  const { t: tParties } = useScopedTranslation("parties");
  const [sortField, setSortField] = useState<SortField>("participation_rate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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

  // Paginate data
  const paginatedData = React.useMemo(() => {
    const startIndex = page * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  const getParticipationColor = (rate: number): string => {
    if (rate >= 90) return colors.success;
    if (rate >= 70) return colors.warning;
    return colors.error;
  };

  return (
    <DataCard>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                background: gradients.scraper,
              }}
            >
              <TableCell sx={{ color: "white", fontWeight: 600 }}>
                {tInsights("votingActivity.rank")}
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
                  {tComposition("table.name")}
                </TableSortLabel>
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
                  {tInsights("votingActivity.votings")}
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" sx={{ color: "white", fontWeight: 600 }}>
                {tCommon("total")}
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
                  {tParties("table.participation")}
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => {
              const globalIndex = page * rowsPerPage + index;
              return (
                <TableRow
                  key={`${row.person_id}-${index}`}
                  sx={{
                    ...commonStyles.interactiveHover,
                    cursor: onSelectPerson ? "pointer" : "default",
                  }}
                  onClick={() => onSelectPerson?.(row.person_id)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      #{globalIndex + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {row.first_name} {row.last_name}
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
                      title={tInsights("votingActivity.voteRatioTooltip", {
                        cast: row.votes_cast,
                        total: row.total_votings,
                      })}
                    >
                      <Box
                        sx={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                        }}
                      >
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
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", mt: 0.35 }}
                        >
                          {tCommon("voteRatio", {
                            cast: row.votes_cast,
                            total: row.total_votings,
                          })}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={sortedData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage={tCommon("rowsPerPage")}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} / ${
            count !== -1 ? count : tCommon("moreThan", { value: to })
          }`
        }
      />
    </DataCard>
  );
}
