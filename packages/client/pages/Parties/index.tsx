import {
  Alert,
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { colors, spacing } from "#client/theme";
import { DataCard, PageHeader } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { PartyDetail } from "./PartyDetail";

const PARTY_COLORS: Record<string, string> = {
  KOK: "#0066CC",
  SDP: "#E11931",
  PS: "#FFDE55",
  KESK: "#3AAA35",
  VIHR: "#61BF1A",
  VAS: "#AA0000",
  RKP: "#FFD500",
  KD: "#1E90FF",
  LIIK: "#00A0DC",
};

interface PartySummary {
  party_code: string;
  party_name: string;
  member_count: number;
  is_in_government: number;
  participation_rate: number;
  female_count: number;
  male_count: number;
  average_age: number;
}

type RoleFilter = "all" | "government" | "opposition";
type SortField =
  | "party_name"
  | "member_count"
  | "participation_rate"
  | "average_age";
type SortDirection = "asc" | "desc";

const Parties = () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const { selectedHallituskausi } = useHallituskausi();
  const [parties, setParties] = useState<PartySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<PartySummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortField, setSortField] = useState<SortField>("member_count");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const asOfDate = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!selectedHallituskausi) return today;
    let value = selectedHallituskausi.endDate || today;
    if (selectedHallituskausi.endDate) {
      const [year, month, day] = selectedHallituskausi.endDate
        .split("-")
        .map((part) => Number(part));
      const end = new Date(Date.UTC(year, month - 1, day));
      end.setUTCDate(end.getUTCDate() - 1);
      const previousDay = end.toISOString().slice(0, 10);
      value =
        previousDay >= selectedHallituskausi.startDate
          ? previousDay
          : selectedHallituskausi.startDate;
    }
    if (value < selectedHallituskausi.startDate) {
      value = selectedHallituskausi.startDate;
    }
    if (selectedHallituskausi.endDate && value > selectedHallituskausi.endDate) {
      value = selectedHallituskausi.endDate;
    }
    return value;
  }, [selectedHallituskausi]);

  useEffect(() => {
    const params = new URLSearchParams({ asOfDate });
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
      params.set("governmentName", selectedHallituskausi.name);
      params.set("governmentStartDate", selectedHallituskausi.startDate);
    }
    fetch(`/api/parties/summary?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setParties(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [asOfDate, selectedHallituskausi]);

  const handleCardClick = (party: PartySummary) => {
    setSelectedParty(party);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedParty(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection(field === "party_name" ? "asc" : "desc");
  };

  const filteredParties = useMemo(() => {
    const needle = searchValue.trim().toLowerCase();
    return parties.filter((party) => {
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "government" && party.is_in_government === 1) ||
        (roleFilter === "opposition" && party.is_in_government === 0);
      const matchesSearch =
        needle.length === 0 ||
        party.party_name.toLowerCase().includes(needle) ||
        party.party_code.toLowerCase().includes(needle);
      return matchesRole && matchesSearch;
    });
  }, [parties, roleFilter, searchValue]);

  const visibleParties = useMemo(() => {
    const sorted = [...filteredParties].sort((a, b) => {
      if (sortField === "party_name") {
        const comparison = a.party_name.localeCompare(b.party_name, "fi");
        return sortDirection === "asc" ? comparison : -comparison;
      }
      const left = a[sortField] ?? 0;
      const right = b[sortField] ?? 0;
      const comparison = left - right;
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredParties, sortDirection, sortField]);

  const summary = useMemo(() => {
    const totalMembers = parties.reduce((sum, p) => sum + p.member_count, 0);
    const governmentParties = parties.filter(
      (p) => p.is_in_government === 1,
    ).length;
    const oppositionParties = parties.length - governmentParties;
    const weightedParticipation =
      totalMembers > 0
        ? parties.reduce(
            (sum, p) => sum + p.member_count * (p.participation_rate ?? 0),
            0,
          ) / totalMembers
        : 0;
    return {
      totalMembers,
      governmentParties,
      oppositionParties,
      weightedParticipation,
    };
  }, [parties]);

  const getParticipationColor = (rate: number) => {
    if (rate >= 90) return colors.success;
    if (rate >= 75) return colors.warning;
    return colors.error;
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box>
        <PageHeader
          title={t("parties.title")}
          subtitle={t("parties.subtitle")}
        />
        <Alert severity="error">{error}</Alert>
      </Box>
    );

  return (
    <Box>
      <PageHeader title={t("parties.title")} subtitle={t("parties.subtitle")} />
      {selectedHallituskausi && (
        <Alert severity="info" sx={{ mb: spacing.md }}>
          Rajattu hallituskauteen: {selectedHallituskausi.label}
        </Alert>
      )}

      <Grid container spacing={spacing.md} sx={{ mb: spacing.md }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <DataCard sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
              {t("parties.totalParties", "Puolueita")}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
              {parties.length}
            </Typography>
          </DataCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <DataCard sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
              {t("parties.totalMembers", "Kansanedustajia")}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
              {summary.totalMembers}
            </Typography>
          </DataCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <DataCard sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
              {t("parties.government", "Hallitus")} / {t("parties.opposition", "Oppositio")}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
              {summary.governmentParties} / {summary.oppositionParties}
            </Typography>
          </DataCard>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <DataCard sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
              {t("parties.weightedParticipation", "Painotettu osallistuminen")}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
              {summary.weightedParticipation.toFixed(1)}%
            </Typography>
          </DataCard>
        </Grid>
      </Grid>

      <DataCard sx={{ p: 2, mb: spacing.md }}>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            label={t("common.search", "Haku")}
            placeholder={t(
              "parties.searchPlaceholder",
              "Hae puolueen nimellä tai tunnuksella",
            )}
            sx={{
              minWidth: { xs: "100%", sm: 280 },
              "& .MuiInputBase-input": { fontSize: "0.9rem" },
            }}
          />
          {(["all", "government", "opposition"] as const).map((role) => {
            const selected = roleFilter === role;
            const label =
              role === "all"
                ? t("parties.filters.all", "Kaikki")
                : role === "government"
                  ? t("parties.government")
                  : t("parties.opposition");
            return (
              <Chip
                key={role}
                clickable
                label={label}
                onClick={() => setRoleFilter(role)}
                sx={{
                  fontWeight: 600,
                  bgcolor: selected ? colors.primary : themedColors.backgroundPaper,
                  color: selected ? "white" : themedColors.textSecondary,
                  border: `1px solid ${selected ? colors.primary : themedColors.dataBorder}`,
                }}
              />
            );
          })}
          <Typography variant="body2" sx={{ ml: "auto", color: themedColors.textSecondary }}>
            {t("parties.showingResults", {
              defaultValue: "Näytetään {{shown}} / {{total}} puolueesta",
              shown: visibleParties.length,
              total: parties.length,
            })}
          </Typography>
        </Box>
      </DataCard>

      {visibleParties.length === 0 && (
        <Alert severity="info">{t("common.noData", "Ei tietoja")}</Alert>
      )}

      {visibleParties.length > 0 && (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            display: { xs: "none", md: "block" },
            borderRadius: 1,
            border: `1px solid ${themedColors.dataBorder}`,
            overflow: "hidden",
            mb: spacing.md,
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: colors.primary }}>
                <TableCell sx={{ color: "white", fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === "party_name"}
                    direction={sortField === "party_name" ? sortDirection : "asc"}
                    onClick={() => handleSort("party_name")}
                    sx={{
                      color: "white !important",
                      "& .MuiTableSortLabel-icon": { color: "white !important" },
                    }}
                  >
                    {t("parties.table.party", "Puolue")}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700 }}>
                  {t("parties.table.status", "Asema")}
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === "member_count"}
                    direction={sortField === "member_count" ? sortDirection : "desc"}
                    onClick={() => handleSort("member_count")}
                    sx={{
                      color: "white !important",
                      "& .MuiTableSortLabel-icon": { color: "white !important" },
                    }}
                  >
                    {t("parties.table.members", "Jäseniä")}
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === "participation_rate"}
                    direction={
                      sortField === "participation_rate" ? sortDirection : "desc"
                    }
                    onClick={() => handleSort("participation_rate")}
                    sx={{
                      color: "white !important",
                      "& .MuiTableSortLabel-icon": { color: "white !important" },
                    }}
                  >
                    {t("parties.table.participation", "Osallistuminen")}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700 }}>
                  {t("parties.table.genderSplit", "Sukupuolijakauma")}
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortField === "average_age"}
                    direction={sortField === "average_age" ? sortDirection : "desc"}
                    onClick={() => handleSort("average_age")}
                    sx={{
                      color: "white !important",
                      "& .MuiTableSortLabel-icon": { color: "white !important" },
                    }}
                  >
                    {t("parties.table.averageAge", "Keski-ikä")}
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleParties.map((party) => {
                const partyColor = PARTY_COLORS[party.party_code] || colors.neutral;
                const female = party.female_count ?? 0;
                const male = party.male_count ?? 0;
                const totalKnownGender = female + male;
                const femaleShare =
                  totalKnownGender > 0 ? (female / totalKnownGender) * 100 : 0;
                const maleShare =
                  totalKnownGender > 0 ? (male / totalKnownGender) * 100 : 0;
                return (
                  <TableRow
                    key={party.party_code}
                    hover
                    onClick={() => handleCardClick(party)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: `${colors.primary}08` },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: partyColor,
                            flexShrink: 0,
                          }}
                        />
                        <Box>
                          <Typography fontWeight={700}>{party.party_name}</Typography>
                          <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                            {party.party_code}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          party.is_in_government === 1
                            ? t("parties.government")
                            : t("parties.opposition")
                        }
                        sx={{
                          fontWeight: 700,
                          bgcolor:
                            party.is_in_government === 1
                              ? colors.coalitionBackground
                              : colors.oppositionBackground,
                          color:
                            party.is_in_government === 1
                              ? colors.coalitionColor
                              : colors.oppositionColor,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700}>{party.member_count}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${(party.participation_rate ?? 0).toFixed(1)}%`}
                        size="small"
                        sx={{
                          minWidth: 72,
                          fontWeight: 700,
                          bgcolor: `${getParticipationColor(party.participation_rate ?? 0)}20`,
                          color: getParticipationColor(party.participation_rate ?? 0),
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                        {t("parties.womenShort", "N")}: {female} | {t("parties.menShort", "M")}
                        : {male}
                      </Typography>
                      <Box
                        sx={{
                          mt: 0.5,
                          height: 8,
                          borderRadius: 4,
                          overflow: "hidden",
                          display: "flex",
                          bgcolor: themedColors.backgroundSubtle,
                        }}
                      >
                        <Box
                          sx={{
                            width: `${femaleShare}%`,
                            bgcolor: colors.errorLight,
                          }}
                        />
                        <Box
                          sx={{
                            width: `${maleShare}%`,
                            bgcolor: colors.info,
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600}>
                        {(party.average_age ?? 0).toFixed(1)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {visibleParties.length > 0 && (
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          <DataCard sx={{ p: 0 }}>
            {visibleParties.map((party, index) => {
              const partyColor = PARTY_COLORS[party.party_code] || colors.neutral;
              const female = party.female_count ?? 0;
              const male = party.male_count ?? 0;
              const totalKnownGender = female + male;
              const femaleShare =
                totalKnownGender > 0 ? (female / totalKnownGender) * 100 : 0;
              const maleShare =
                totalKnownGender > 0 ? (male / totalKnownGender) * 100 : 0;

              return (
                <Box key={party.party_code}>
                  <ButtonBase
                    onClick={() => handleCardClick(party)}
                    sx={{
                      width: "100%",
                      display: "block",
                      textAlign: "left",
                    }}
                  >
                    <Box sx={{ p: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              bgcolor: partyColor,
                            }}
                          />
                          <Typography fontWeight={700}>{party.party_name}</Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={party.party_code}
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 1.5,
                          mb: 1.5,
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                            {t("parties.members")}
                          </Typography>
                          <Typography fontWeight={700}>{party.member_count}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                            {t("parties.participation")}
                          </Typography>
                          <Typography fontWeight={700}>
                            {(party.participation_rate ?? 0).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                            {t("parties.table.averageAge", "Keski-ikä")}
                          </Typography>
                          <Typography fontWeight={700}>
                            {(party.average_age ?? 0).toFixed(1)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                            {t("parties.table.status", "Asema")}
                          </Typography>
                          <Typography fontWeight={700}>
                            {party.is_in_government === 1
                              ? t("parties.government")
                              : t("parties.opposition")}
                          </Typography>
                        </Box>
                      </Box>

                      <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                        {t("parties.womenShort", "N")}: {female} | {t("parties.menShort", "M")}:
                        {" "}
                        {male}
                      </Typography>
                      <Box
                        sx={{
                          mt: 0.5,
                          height: 8,
                          borderRadius: 4,
                          overflow: "hidden",
                          display: "flex",
                          bgcolor: themedColors.backgroundSubtle,
                        }}
                      >
                        <Box
                          sx={{
                            width: `${femaleShare}%`,
                            bgcolor: colors.errorLight,
                          }}
                        />
                        <Box
                          sx={{
                            width: `${maleShare}%`,
                            bgcolor: colors.info,
                          }}
                        />
                      </Box>
                    </Box>
                  </ButtonBase>
                  {index < visibleParties.length - 1 && (
                    <Box
                      sx={{
                        borderBottom: `1px solid ${themedColors.dataBorder}`,
                        mx: 2,
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </DataCard>
        </Box>
      )}

      <PartyDetail
        open={dialogOpen}
        onClose={handleDialogClose}
        party={selectedParty}
        asOfDate={asOfDate}
        startDate={selectedHallituskausi?.startDate}
        endDate={selectedHallituskausi?.endDate || undefined}
        governmentName={selectedHallituskausi?.name}
        governmentStartDate={selectedHallituskausi?.startDate}
      />
    </Box>
  );
};

export default Parties;
