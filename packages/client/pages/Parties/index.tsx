import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AssessmentIcon from "@mui/icons-material/Assessment";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupsIcon from "@mui/icons-material/Groups";
import InsightsIcon from "@mui/icons-material/Insights";
import PieChartOutlineIcon from "@mui/icons-material/PieChartOutline";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Drawer,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import PartyDiscipline from "#client/pages/Insights/PartyDiscipline";
import PartyParticipation from "#client/pages/Insights/PartyParticipation";
import { colors, commonStyles, spacing } from "#client/theme";
import {
  DataCard,
  EmptyState,
  MetricCard,
  PageIntro,
} from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { formatDateFi } from "#client/utils/date-time";
import { apiFetch } from "#client/utils/fetch";
import { PartyDetail } from "./PartyDetail";
import { getPartyColor } from "./partyColors";
import {
  buildPartySelectionUrl,
  normalizePartyCode,
  parseSelectedPartyCode,
} from "./url-state";

type PartySummary = ApiRouteItem<`/api/parties/summary`>;

type RoleFilter = "all" | "government" | "opposition";
type SortField =
  | "member_count"
  | "participation_rate"
  | "average_age"
  | "party_name";

const SORT_FIELDS: ReadonlyArray<{
  field: SortField;
  labelKey:
    | "sort.members"
    | "sort.participation"
    | "sort.averageAge"
    | "sort.alphabetical";
}> = [
  { field: "member_count", labelKey: "sort.members" },
  { field: "participation_rate", labelKey: "sort.participation" },
  { field: "average_age", labelKey: "sort.averageAge" },
  { field: "party_name", labelKey: "sort.alphabetical" },
];

const shiftIsoDateByMonths = (value: string, months: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
};

const Parties = () => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tParties } = useScopedTranslation("parties");
  const themedColors = useThemedColors();
  const { selectedHallituskausi } = useHallituskausi();

  const [parties, setParties] = useState<PartySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortField, setSortField] = useState<SortField>("member_count");
  const [selectedPartyCode, setSelectedPartyCode] = useState<string | null>(
    () => parseSelectedPartyCode(window.location.search),
  );
  const [activeInsightDrawer, setActiveInsightDrawer] = useState<
    "partyParticipation" | "partyDiscipline" | null
  >(null);

  const profileRef = useRef<HTMLDivElement | null>(null);
  const selectionSourceRef = useRef<"user" | "url" | "sync">("url");

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
    if (
      selectedHallituskausi.endDate &&
      value > selectedHallituskausi.endDate
    ) {
      value = selectedHallituskausi.endDate;
    }
    return value;
  }, [selectedHallituskausi]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ asOfDate });
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
      params.set("governmentName", selectedHallituskausi.name);
      params.set("governmentStartDate", selectedHallituskausi.startDate);
    }
    apiFetch(`/api/parties/summary?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setParties(data);
        setLoading(false);
      })
      .catch((fetchError) => {
        setError(fetchError.message);
        setLoading(false);
      });
  }, [asOfDate, selectedHallituskausi]);

  useEffect(() => {
    const handlePopState = () => {
      selectionSourceRef.current = "url";
      setSelectedPartyCode(parseSelectedPartyCode(window.location.search));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const writeSelectedPartyCode = (
    partyCode: string | null,
    method: "push" | "replace",
  ) => {
    const normalizedPartyCode = normalizePartyCode(partyCode);
    const nextUrl = buildPartySelectionUrl(
      window.location.pathname,
      window.location.search,
      normalizedPartyCode,
    );
    if (method === "replace") window.history.replaceState({}, "", nextUrl);
    else window.history.pushState({}, "", nextUrl);
    setSelectedPartyCode(normalizedPartyCode);
  };

  const handlePartySelect = (partyCode: string) => {
    selectionSourceRef.current = "user";
    writeSelectedPartyCode(partyCode, "push");
  };

  const clearSelection = (method: "push" | "replace" = "push") => {
    selectionSourceRef.current = "sync";
    writeSelectedPartyCode(null, method);
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
        party.party_code.toLowerCase().includes(needle) ||
        (party.party_display_code ?? "").toLowerCase().includes(needle);
      return matchesRole && matchesSearch;
    });
  }, [parties, roleFilter, searchValue]);

  const visibleParties = useMemo(() => {
    const sorted = [...filteredParties].sort((left, right) => {
      if (sortField === "party_name") {
        return left.party_name.localeCompare(right.party_name, "fi");
      }
      return (right[sortField] ?? 0) - (left[sortField] ?? 0);
    });
    return sorted;
  }, [filteredParties, sortField]);

  const selectedParty = useMemo(
    () =>
      selectedPartyCode
        ? parties.find(
            (party) =>
              normalizePartyCode(party.party_code) === selectedPartyCode,
          ) || null
        : null,
    [parties, selectedPartyCode],
  );

  useEffect(() => {
    if (loading || !selectedPartyCode) return;
    const exists = parties.some(
      (party) => normalizePartyCode(party.party_code) === selectedPartyCode,
    );
    if (exists) return;
    clearSelection("replace");
  }, [loading, parties, selectedPartyCode]);

  useEffect(() => {
    if (!selectedParty || selectionSourceRef.current !== "user") return;
    profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    selectionSourceRef.current = "sync";
  }, [selectedParty]);

  const selectedPartyVisible = selectedParty
    ? visibleParties.some(
        (party) =>
          normalizePartyCode(party.party_code) ===
          normalizePartyCode(selectedParty.party_code),
      )
    : true;

  const summary = useMemo(() => {
    const totalMembers = parties.reduce(
      (sum, party) => sum + party.member_count,
      0,
    );
    const governmentParties = parties.filter(
      (party) => party.is_in_government === 1,
    ).length;
    const oppositionParties = parties.length - governmentParties;
    const weightedParticipation =
      totalMembers > 0
        ? parties.reduce(
            (sum, party) =>
              sum + party.member_count * (party.participation_rate ?? 0),
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

  const highlights = useMemo(() => {
    const largestParty = [...parties].sort(
      (left, right) => right.member_count - left.member_count,
    )[0];
    const highestParticipation = [...parties].sort(
      (left, right) =>
        (right.participation_rate ?? 0) - (left.participation_rate ?? 0),
    )[0];
    const youngestParty = [...parties]
      .filter((party) => (party.average_age ?? 0) > 0)
      .sort(
        (left, right) => (left.average_age ?? 0) - (right.average_age ?? 0),
      )[0];
    return {
      largestParty,
      highestParticipation,
      youngestParty,
    };
  }, [parties]);

  const getParticipationColor = (rate: number) => {
    if (rate >= 90) return colors.success;
    if (rate >= 75) return colors.warning;
    return colors.error;
  };

  const scopeText = selectedHallituskausi
    ? tParties("scope.government", {
        period: selectedHallituskausi.label,
      })
    : tParties("scope.current");
  const participationWindow = useMemo(() => {
    const start =
      selectedHallituskausi?.startDate ?? shiftIsoDateByMonths(asOfDate, -6);
    const end = asOfDate;
    return tParties("participationWindow", {
      start: formatDateFi(start, start),
      end: formatDateFi(end, end),
    });
  }, [asOfDate, selectedHallituskausi]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box>
        <PageIntro title={tParties("title")} subtitle={tParties("subtitle")} />
        <Alert severity="error">{error}</Alert>
      </Box>
    );

  return (
    <Box>
      <PageIntro
        title={tParties("title")}
        summary={
          selectedHallituskausi
            ? tParties("summaryGovernment", {
                period: selectedHallituskausi.label,
              })
            : tParties("summaryCurrent")
        }
        mobileMode="compact"
        mobileAnchorId="parties-content"
        mobileStatsPlacement="hidden"
        mobileSummary={
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <Chip
              size="small"
              label={`${tParties("totalParties")}: ${parties.length}`}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              label={`${tParties("totalMembers")}: ${summary.totalMembers}`}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              label={`${summary.governmentParties} / ${summary.oppositionParties}`}
              sx={{ fontWeight: 700 }}
            />
          </Box>
        }
        chips={
          selectedHallituskausi ? (
            <Chip
              size="small"
              label={selectedHallituskausi.label}
              sx={{ fontWeight: 700 }}
            />
          ) : undefined
        }
        stats={
          <Grid container spacing={spacing.md}>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label={tParties("totalParties")}
                value={parties.length}
                icon={<GroupsIcon fontSize="small" />}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label={tParties("totalMembers")}
                value={summary.totalMembers}
                icon={<AccountBalanceIcon fontSize="small" />}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label={tParties("governmentBreakdown")}
                value={`${summary.governmentParties} / ${summary.oppositionParties}`}
                icon={<PieChartOutlineIcon fontSize="small" />}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <MetricCard
                label={tParties("weightedParticipation")}
                value={`${summary.weightedParticipation.toFixed(1)}%`}
                icon={<InsightsIcon fontSize="small" />}
              />
            </Grid>
          </Grid>
        }
        footer={
          <Box>
            {selectedHallituskausi && (
              <Alert severity="info" sx={{ mb: 1.5 }}>
                {tParties("hallituskausiNotice", {
                  period: selectedHallituskausi.label,
                })}
              </Alert>
            )}
            <Typography
              variant="body2"
              sx={{ color: themedColors.textSecondary }}
            >
              {scopeText}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                display: "block",
                mt: 0.5,
              }}
            >
              {participationWindow}
            </Typography>
          </Box>
        }
      />

      <Box id="parties-content">
        <Grid container spacing={spacing.md} sx={{ mb: spacing.md }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <HighlightCard
              title={tParties("highlights.largestParty")}
              party={highlights.largestParty}
              value={
                highlights.largestParty
                  ? tParties("highlights.membersValue", {
                      count: highlights.largestParty.member_count,
                    })
                  : null
              }
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <HighlightCard
              title={tParties("highlights.highestParticipation")}
              party={highlights.highestParticipation}
              value={
                highlights.highestParticipation
                  ? `${(highlights.highestParticipation.participation_rate ?? 0).toFixed(1)}%`
                  : null
              }
              caption={
                highlights.highestParticipation
                  ? tCommon("voteRatio", {
                      cast: highlights.highestParticipation.votes_cast ?? 0,
                      total: highlights.highestParticipation.total_votings ?? 0,
                    })
                  : null
              }
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <HighlightCard
              title={tParties("highlights.youngestAverageAge")}
              party={highlights.youngestParty}
              value={
                highlights.youngestParty
                  ? tParties("highlights.averageAgeValue", {
                      age: (highlights.youngestParty.average_age ?? 0).toFixed(
                        1,
                      ),
                    })
                  : null
              }
            />
          </Grid>
        </Grid>

        <DataCard sx={{ p: { xs: 2, md: 2.5 }, mb: spacing.md }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              flexDirection: { xs: "column", md: "row" },
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {tParties("comparisonTitle")}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: themedColors.textSecondary }}
              >
                {tParties("comparisonSubtitle")}
              </Typography>
            </Box>
            {selectedParty && (
              <Button
                variant="outlined"
                onClick={() => clearSelection()}
                sx={commonStyles.compactOutlinedPrimaryButton}
              >
                {tParties("clearSelection")}
              </Button>
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
              mb: 2,
            }}
          >
            <TextField
              size="small"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              label={tCommon("search")}
              placeholder={tParties("searchPlaceholder")}
              sx={{
                minWidth: { xs: "100%", md: 280 },
                "& .MuiInputBase-input": { fontSize: "0.9rem" },
              }}
            />

            {(["all", "government", "opposition"] as const).map((role) => {
              const selected = roleFilter === role;
              const label =
                role === "all"
                  ? tParties("filters.all")
                  : role === "government"
                    ? tParties("government")
                    : tParties("opposition");
              return (
                <Chip
                  key={role}
                  clickable
                  label={label}
                  onClick={() => setRoleFilter(role)}
                  sx={{
                    fontWeight: 600,
                    bgcolor: selected
                      ? colors.primary
                      : themedColors.backgroundPaper,
                    color: selected ? "white" : themedColors.textSecondary,
                    border: `1px solid ${selected ? colors.primary : themedColors.dataBorder}`,
                  }}
                />
              );
            })}

            <Typography
              variant="body2"
              sx={{ color: themedColors.textSecondary, ml: { md: "auto" } }}
            >
              {tParties("sortBy")}
            </Typography>
            {SORT_FIELDS.map((option) => {
              const selected = sortField === option.field;
              return (
                <Chip
                  key={option.field}
                  clickable
                  label={tParties(option.labelKey)}
                  onClick={() => setSortField(option.field)}
                  sx={{
                    fontWeight: 600,
                    bgcolor: selected
                      ? `${colors.primary}12`
                      : themedColors.backgroundPaper,
                    color: selected
                      ? colors.primary
                      : themedColors.textSecondary,
                    border: `1px solid ${selected ? colors.primaryLight : themedColors.dataBorder}`,
                  }}
                />
              );
            })}
          </Box>

          <Typography
            variant="body2"
            sx={{ color: themedColors.textSecondary, mb: 2 }}
          >
            {tParties("showingResults", {
              shown: visibleParties.length,
              total: parties.length,
            })}
          </Typography>

          {!selectedPartyVisible && selectedParty && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {tParties("selectedHiddenByFilters", {
                party: selectedParty.party_name,
              })}
            </Alert>
          )}

          {visibleParties.length === 0 ? (
            <EmptyState
              title={tCommon("noData")}
              description={tParties("noResultsDescription")}
              icon={<GroupsIcon fontSize="inherit" />}
            />
          ) : (
            <>
              <TableContainer
                sx={{
                  display: { xs: "none", md: "block" },
                  borderRadius: 2,
                  border: `1px solid ${themedColors.dataBorder}`,
                  overflow: "hidden",
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={commonStyles.tableHeaderRow}>
                      <TableCell>{tParties("table.party")}</TableCell>
                      <TableCell>{tParties("table.status")}</TableCell>
                      <TableCell align="right">
                        {tParties("table.members")}
                      </TableCell>
                      <TableCell align="right">
                        {tParties("table.participation")}
                      </TableCell>
                      <TableCell>{tParties("table.genderSplit")}</TableCell>
                      <TableCell align="right">
                        {tParties("table.averageAge")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleParties.map((party) => (
                      <DesktopPartyRow
                        key={party.party_code}
                        party={party}
                        selected={
                          selectedPartyCode ===
                          normalizePartyCode(party.party_code)
                        }
                        onSelect={handlePartySelect}
                        getParticipationColor={getParticipationColor}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: { xs: "block", md: "none" } }}>
                <DataCard sx={{ p: 0 }}>
                  {visibleParties.map((party, index) => (
                    <MobilePartyCard
                      key={party.party_code}
                      party={party}
                      selected={
                        selectedPartyCode ===
                        normalizePartyCode(party.party_code)
                      }
                      isLast={index === visibleParties.length - 1}
                      onSelect={handlePartySelect}
                    />
                  ))}
                </DataCard>
              </Box>
            </>
          )}
        </DataCard>

        <Box ref={profileRef}>
          {selectedParty ? (
            <PartyDetail
              party={selectedParty}
              partyColor={getPartyColor(selectedParty.party_code)}
              asOfDate={asOfDate}
              startDate={selectedHallituskausi?.startDate}
              endDate={selectedHallituskausi?.endDate || undefined}
              governmentName={selectedHallituskausi?.name}
              governmentStartDate={selectedHallituskausi?.startDate}
              onClearSelection={() => clearSelection()}
            />
          ) : (
            <EmptyState
              title={tParties("profilePlaceholderTitle")}
              description={tParties("profilePlaceholderDescription")}
              icon={<InsightsIcon fontSize="inherit" />}
            />
          )}
        </Box>
      </Box>

      {/* Analytics sections */}
      <Box sx={{ mt: 4 }}>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 1.5,
            fontWeight: 700,
            color: themedColors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {tParties("analyticsSection.title")}
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              key: "partyParticipation" as const,
              icon: <AssessmentIcon sx={{ fontSize: 24 }} />,
              title: tParties("analyticsSection.partyParticipation.title"),
              description: tParties(
                "analyticsSection.partyParticipation.description",
              ),
            },
            {
              key: "partyDiscipline" as const,
              icon: <GavelIcon sx={{ fontSize: 24 }} />,
              title: tParties("analyticsSection.partyDiscipline.title"),
              description: tParties(
                "analyticsSection.partyDiscipline.description",
              ),
            },
          ].map((card) => (
            <Grid key={card.key} size={{ xs: 12, sm: 6 }}>
              <DataCard sx={{ height: "100%", p: 0 }}>
                <CardActionArea
                  onClick={() => setActiveInsightDrawer(card.key)}
                  sx={{ height: "100%", borderRadius: "inherit" }}
                >
                  <CardContent
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                        }}
                      >
                        <Box
                          sx={{
                            color: themedColors.primary,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {card.icon}
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.9375rem",
                            lineHeight: 1.3,
                          }}
                        >
                          {card.title}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: themedColors.textSecondary,
                        lineHeight: 1.5,
                      }}
                    >
                      {card.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </DataCard>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Drawer
        anchor="right"
        open={activeInsightDrawer === "partyParticipation"}
        onClose={() => setActiveInsightDrawer(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" },
            maxWidth: "1400px",
          },
        }}
      >
        <PartyParticipation onClose={() => setActiveInsightDrawer(null)} />
      </Drawer>
      <Drawer
        anchor="right"
        open={activeInsightDrawer === "partyDiscipline"}
        onClose={() => setActiveInsightDrawer(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" },
            maxWidth: "1400px",
          },
        }}
      >
        <PartyDiscipline onClose={() => setActiveInsightDrawer(null)} />
      </Drawer>
    </Box>
  );
};

const HighlightCard: React.FC<{
  title: string;
  party?: PartySummary;
  value: string | null;
  caption?: string | null;
}> = ({ title, party, value, caption }) => {
  const themedColors = useThemedColors();
  const { t: tParties } = useScopedTranslation("parties");
  const partyColor = party ? getPartyColor(party.party_code) : colors.neutral;
  const visibleCode = party?.party_display_code ?? party?.party_code ?? "";

  return (
    <DataCard sx={{ p: 2.25, height: "100%" }}>
      <Typography
        variant="caption"
        sx={{
          color: themedColors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {title}
      </Typography>
      {party ? (
        <>
          <Box
            sx={{
              mt: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: partyColor,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontWeight: 700 }}>{party.party_name}</Typography>
          </Box>
          <Typography
            sx={{
              mt: 1,
              fontSize: "1.35rem",
              fontWeight: 700,
              color: partyColor,
            }}
          >
            {value}
          </Typography>
          {caption ? (
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.35,
                color: themedColors.textSecondary,
              }}
            >
              {caption}
            </Typography>
          ) : null}
          <Typography
            variant="body2"
            sx={{ mt: 0.5, color: themedColors.textSecondary }}
          >
            {tParties("highlights.partyCode", { code: visibleCode })}
          </Typography>
        </>
      ) : (
        <Typography
          variant="body2"
          sx={{ mt: 1.5, color: themedColors.textSecondary }}
        >
          {tParties("noResultsDescription")}
        </Typography>
      )}
    </DataCard>
  );
};

const DesktopPartyRow: React.FC<{
  party: PartySummary;
  selected: boolean;
  onSelect: (partyCode: string) => void;
  getParticipationColor: (rate: number) => string;
}> = ({ party, selected, onSelect, getParticipationColor }) => {
  const themedColors = useThemedColors();
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tParties } = useScopedTranslation("parties");
  const partyColor = getPartyColor(party.party_code);
  const visibleCode = party.party_display_code ?? party.party_code;
  const female = party.female_count ?? 0;
  const male = party.male_count ?? 0;
  const totalKnownGender = female + male;
  const femaleShare =
    totalKnownGender > 0 ? (female / totalKnownGender) * 100 : 0;
  const maleShare = totalKnownGender > 0 ? (male / totalKnownGender) * 100 : 0;

  return (
    <TableRow
      hover
      onClick={() => onSelect(party.party_code)}
      sx={{
        ...commonStyles.tableRow,
        bgcolor: selected ? `${partyColor}10` : undefined,
      }}
    >
      <TableCell
        sx={{
          borderLeft: selected
            ? `4px solid ${partyColor}`
            : "4px solid transparent",
        }}
      >
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
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary }}
            >
              {visibleCode}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={
            party.is_in_government === 1
              ? tParties("government")
              : tParties("opposition")
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
        <Box
          sx={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
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
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary, mt: 0.35 }}
          >
            {tCommon("voteRatio", {
              cast: party.votes_cast ?? 0,
              total: party.total_votings ?? 0,
            })}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Typography
          variant="caption"
          sx={{ color: themedColors.textSecondary }}
        >
          {tParties("genderSplitLine", {
            womenLabel: tParties("womenShort"),
            female,
            menLabel: tParties("menShort"),
            male,
          })}
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
          <Box sx={{ width: `${femaleShare}%`, bgcolor: colors.errorLight }} />
          <Box sx={{ width: `${maleShare}%`, bgcolor: colors.info }} />
        </Box>
      </TableCell>
      <TableCell align="right">
        <Typography fontWeight={600}>
          {(party.average_age ?? 0).toFixed(1)}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

const MobilePartyCard: React.FC<{
  party: PartySummary;
  selected: boolean;
  isLast: boolean;
  onSelect: (partyCode: string) => void;
}> = ({ party, selected, isLast, onSelect }) => {
  const themedColors = useThemedColors();
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tParties } = useScopedTranslation("parties");
  const partyColor = getPartyColor(party.party_code);
  const visibleCode = party.party_display_code ?? party.party_code;
  const female = party.female_count ?? 0;
  const male = party.male_count ?? 0;
  const totalKnownGender = female + male;
  const femaleShare =
    totalKnownGender > 0 ? (female / totalKnownGender) * 100 : 0;
  const maleShare = totalKnownGender > 0 ? (male / totalKnownGender) * 100 : 0;

  return (
    <Box>
      <ButtonBase
        onClick={() => onSelect(party.party_code)}
        sx={{
          width: "100%",
          display: "block",
          textAlign: "left",
          borderLeft: `4px solid ${selected ? partyColor : "transparent"}`,
          background: selected ? `${partyColor}10` : "transparent",
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
            <Chip size="small" label={visibleCode} sx={{ fontWeight: 700 }} />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <MetricBlock
              label={tParties("members")}
              value={String(party.member_count)}
            />
            <MetricBlock
              label={tParties("participation")}
              value={`${(party.participation_rate ?? 0).toFixed(1)}%`}
              caption={tCommon("voteRatio", {
                cast: party.votes_cast ?? 0,
                total: party.total_votings ?? 0,
              })}
            />
            <MetricBlock
              label={tParties("table.averageAge")}
              value={(party.average_age ?? 0).toFixed(1)}
            />
            <MetricBlock
              label={tParties("table.status")}
              value={
                party.is_in_government === 1
                  ? tParties("government")
                  : tParties("opposition")
              }
            />
          </Box>

          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {tParties("genderSplitLine", {
              womenLabel: tParties("womenShort"),
              female,
              menLabel: tParties("menShort"),
              male,
            })}
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
              sx={{ width: `${femaleShare}%`, bgcolor: colors.errorLight }}
            />
            <Box sx={{ width: `${maleShare}%`, bgcolor: colors.info }} />
          </Box>
        </Box>
      </ButtonBase>
      {!isLast && (
        <Box
          sx={{
            borderBottom: `1px solid ${themedColors.dataBorder}`,
            mx: 2,
          }}
        />
      )}
    </Box>
  );
};

const MetricBlock: React.FC<{
  label: string;
  value: string;
  caption?: string;
}> = ({ label, value, caption }) => {
  const themedColors = useThemedColors();

  return (
    <Box>
      <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
        {label}
      </Typography>
      <Typography fontWeight={700}>{value}</Typography>
      {caption ? (
        <Typography
          variant="caption"
          sx={{ color: themedColors.textTertiary, display: "block", mt: 0.25 }}
        >
          {caption}
        </Typography>
      ) : null}
    </Box>
  );
};

export default Parties;
