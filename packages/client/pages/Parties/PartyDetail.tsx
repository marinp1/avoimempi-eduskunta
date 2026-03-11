import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Link,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import { colors, commonStyles, spacing } from "#client/theme";
import { DataCard } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";
import { warnInDevelopment } from "#client/utils/request-errors";

type PartySummary = ApiRouteItem<`/api/parties/summary`>;
type PartyMember = ApiRouteItem<`/api/parties/:code/members`>;
type CoalitionOppositionRow =
  ApiRouteItem<`/api/analytics/coalition-opposition`>;
type VotingInlineDetails = ApiRouteResponse<`/api/votings/:id/details`>;
type DissentRow = ApiRouteItem<`/api/analytics/dissent`>;
type PartyDisciplineRow = ApiRouteItem<`/api/analytics/party-discipline`>;

const MembersTab: React.FC<{
  partyCode: string;
  asOfDate: string;
  startDate?: string;
  endDate?: string;
  governmentName?: string;
  governmentStartDate?: string;
}> = ({
  partyCode,
  asOfDate,
  startDate,
  endDate,
  governmentName,
  governmentStartDate,
}) => {
  const themedColors = useThemedColors();
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tParties } = useScopedTranslation("parties");
  const [members, setMembers] = useState<PartyMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ asOfDate });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (governmentName && governmentStartDate) {
      params.set("governmentName", governmentName);
      params.set("governmentStartDate", governmentStartDate);
    }
    apiFetch(`/api/parties/${partyCode}/members?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setMembers(data);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment("Failed to fetch party members", err);
        setMembers([]);
        setError(tParties("detail.membersLoadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    asOfDate,
    endDate,
    governmentName,
    governmentStartDate,
    partyCode,
    startDate,
  ]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!members || members.length === 0)
    return (
      <Typography
        variant="body2"
        sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
      >
        {tParties("detail.noMembers")}
      </Typography>
    );

  return (
    <TableContainer sx={{ maxHeight: 500 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>{tCommon("name")}</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {tParties("detail.municipality")}
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 600,
                display: { xs: "none", sm: "table-cell" },
              }}
            >
              {tParties("detail.profession")}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.person_id}>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  <Link
                    href={refs.member(member.person_id)}
                    underline="hover"
                    color="inherit"
                  >
                    {member.last_name}, {member.first_name}
                  </Link>
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {member.current_municipality || "-"}
                </Typography>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                <Typography variant="body2">
                  {member.profession || "-"}
                </Typography>
              </TableCell>
              <TableCell>
                {member.is_minister === 1 && (
                  <Chip
                    label={tParties("detail.minister")}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor: colors.ministerBackground,
                      color: colors.ministerColor,
                    }}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const VotingTab: React.FC = () => {
  const themedColors = useThemedColors();
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tParties } = useScopedTranslation("parties");
  const { selectedHallituskausi } = useHallituskausi();
  const [data, setData] = useState<CoalitionOppositionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVotingIds, setExpandedVotingIds] = useState<Set<number>>(
    new Set(),
  );
  const [loadingVotingDetails, setLoadingVotingDetails] = useState<Set<number>>(
    new Set(),
  );
  const [votingDetailsById, setVotingDetailsById] = useState<
    Record<number, VotingInlineDetails>
  >({});
  const [failedVotingDetailIds, setFailedVotingDetailIds] = useState<
    Set<number>
  >(new Set());

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: "30" });
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
    }
    apiFetch(`/api/analytics/coalition-opposition?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setError(null);
        setExpandedVotingIds(new Set());
        setLoadingVotingDetails(new Set());
        setVotingDetailsById({});
        setFailedVotingDetailIds(new Set());
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment(
          "Failed to fetch coalition-opposition analytics",
          err,
        );
        setData([]);
        setError(tParties("detail.votingLoadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedHallituskausi]);

  const fetchVotingDetails = async (votingId: number) => {
    if (votingDetailsById[votingId] || loadingVotingDetails.has(votingId))
      return;
    setLoadingVotingDetails((prev) => new Set(prev).add(votingId));
    try {
      const res = await apiFetch(`/api/votings/${votingId}/details`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFailedVotingDetailIds((prev) => {
        const next = new Set(prev);
        next.delete(votingId);
        return next;
      });
      setVotingDetailsById((prev) => ({ ...prev, [votingId]: data }));
    } catch (err) {
      warnInDevelopment(`Failed to fetch voting details for ${votingId}`, err);
      setFailedVotingDetailIds((prev) => new Set(prev).add(votingId));
    } finally {
      setLoadingVotingDetails((prev) => {
        const next = new Set(prev);
        next.delete(votingId);
        return next;
      });
    }
  };

  const toggleVotingDetails = (votingId: number) => {
    const shouldExpand = !expandedVotingIds.has(votingId);
    setExpandedVotingIds((prev) => {
      const next = new Set(prev);
      if (next.has(votingId)) next.delete(votingId);
      else next.add(votingId);
      return next;
    });
    if (shouldExpand) void fetchVotingDetails(votingId);
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!data || data.length === 0)
    return (
      <Typography
        variant="body2"
        sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
      >
        {tParties("detail.noVotingData")}
      </Typography>
    );

  const coalitionYesLabel = tParties("detail.coalition", { context: "yes" });
  const coalitionNoLabel = tParties("detail.coalition", { context: "no" });
  const oppositionYesLabel = tParties("detail.opposition", {
    context: "yes",
  });
  const oppositionNoLabel = tParties("detail.opposition", {
    context: "no",
  });

  const chartData = data.slice(0, 20).map((row) => ({
    title: (row.title || row.section_title || "").slice(0, 30),
    [coalitionYesLabel]: row.coalition_yes,
    [coalitionNoLabel]: row.coalition_no,
    [oppositionYesLabel]: row.opposition_yes,
    [oppositionNoLabel]: row.opposition_no,
  }));

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        {tParties("detail.coalitionVoting")}
      </Typography>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="title"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            style={{ fontSize: "10px" }}
            tick={{ fill: themedColors.textSecondary }}
          />
          <YAxis tick={{ fill: themedColors.textSecondary }} />
          <Tooltip />
          <Bar
            dataKey={coalitionYesLabel}
            stackId="coalition"
            fill={colors.success}
          />
          <Bar
            dataKey={coalitionNoLabel}
            stackId="coalition"
            fill={colors.errorLight}
          />
          <Bar
            dataKey={oppositionYesLabel}
            stackId="opposition"
            fill={colors.coalitionColor}
          />
          <Bar
            dataKey={oppositionNoLabel}
            stackId="opposition"
            fill={colors.warning}
          />
        </BarChart>
      </ResponsiveContainer>

      <Box sx={{ mt: 2 }}>
        {data.slice(0, 20).map((vote) => {
          const isExpanded = expandedVotingIds.has(vote.voting_id);
          const details = votingDetailsById[vote.voting_id];
          const detailsLoading = loadingVotingDetails.has(vote.voting_id);
          return (
            <Box
              key={vote.voting_id}
              sx={{
                py: 1,
                borderBottom: `1px solid ${themedColors.dataBorder}`,
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  sx={{
                    flex: 1,
                    minWidth: 180,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  {vote.title || vote.section_title}
                </Typography>
                <Button
                  size="small"
                  sx={commonStyles.compactActionButton}
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 14,
                        transform: isExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  }
                  onClick={() => toggleVotingDetails(vote.voting_id)}
                >
                  {isExpanded
                    ? tCommon("detailsToggle", { context: "hide" })
                    : tCommon("detailsToggle", { context: "show" })}
                </Button>
                <Button
                  size="small"
                  sx={commonStyles.compactActionButton}
                  endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                  onClick={() => {
                    window.history.pushState(
                      {},
                      "",
                      refs.voting(vote.voting_id, undefined, vote.start_time),
                    );
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                >
                  {tCommon("openView")}
                </Button>
              </Box>
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box
                  sx={{
                    mt: 0.5,
                    p: 1,
                    borderRadius: 1,
                    border: `1px solid ${themedColors.dataBorder}60`,
                    backgroundColor: `${colors.primaryLight}04`,
                  }}
                >
                  {detailsLoading && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={12} />
                      <Typography
                        variant="caption"
                        sx={{ color: themedColors.textSecondary }}
                      >
                        {tCommon("loadingVotingDetails")}
                      </Typography>
                    </Box>
                  )}
                  {!detailsLoading && details && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.75,
                      }}
                    >
                      {details.governmentOpposition && (
                        <Typography
                          variant="caption"
                          sx={{ color: themedColors.textSecondary }}
                        >
                          Hallitus:{" "}
                          {details.governmentOpposition.government_yes} jaa /{" "}
                          {details.governmentOpposition.government_no} ei,
                          Oppositio:{" "}
                          {details.governmentOpposition.opposition_yes} jaa /{" "}
                          {details.governmentOpposition.opposition_no} ei
                        </Typography>
                      )}
                      <VotingResultsTable
                        partyBreakdown={details.partyBreakdown}
                        memberVotes={details.memberVotes}
                      />
                    </Box>
                  )}
                  {!detailsLoading &&
                  !details &&
                  failedVotingDetailIds.has(vote.voting_id) ? (
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {tParties("detail.votingDetailsLoadError")}
                    </Typography>
                  ) : null}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

const DisciplineTab: React.FC<{ partyCode: string; partyName: string }> = ({
  partyCode,
  partyName,
}) => {
  const themedColors = useThemedColors();
  const { t } = useScopedTranslation("parties");
  const { selectedHallituskausi } = useHallituskausi();
  const [disciplineData, setDisciplineData] =
    useState<PartyDisciplineRow | null>(null);
  const [dissents, setDissents] = useState<DissentRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
    }
    const query = params.toString()
      ? (`?${params.toString()}` as `?${string}`)
      : "";
    Promise.all([
      apiFetch(`/api/analytics/party-discipline${query}`, {
        signal: controller.signal,
      }).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      apiFetch(
        `/api/analytics/dissent?limit=200${params.toString() ? `&${params.toString()}` : ""}`,
        { signal: controller.signal },
      ).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ])
      .then(([allDiscipline, allDissents]) => {
        if (controller.signal.aborted) return;
        const partyDiscipline = (allDiscipline as PartyDisciplineRow[]).find(
          (row) => row.party_code === partyCode,
        );
        setDisciplineData(partyDiscipline || null);

        const partyDissents = (allDissents as DissentRow[]).filter(
          (row) => row.party_code === partyCode,
        );
        setDissents(partyDissents);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment("Failed to fetch party discipline data", err);
        setDisciplineData(null);
        setDissents([]);
        setError(t("detail.disciplineLoadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [partyCode, selectedHallituskausi]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!disciplineData)
    return (
      <Typography
        variant="body2"
        sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
      >
        {t("detail.noDisciplineData")}
      </Typography>
    );

  const dissentsByPerson = new Map<number, { name: string; count: number }>();
  dissents?.forEach((row) => {
    const existing = dissentsByPerson.get(row.person_id);
    if (existing) existing.count += 1;
    else {
      dissentsByPerson.set(row.person_id, {
        name: `${row.first_name} ${row.last_name}`,
        count: 1,
      });
    }
  });

  const topDissenters = Array.from(dissentsByPerson.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);

  return (
    <Box>
      <Box
        sx={{
          textAlign: "center",
          p: 3,
          mb: 3,
          borderRadius: 2,
          border: `1px solid ${themedColors.dataBorder}`,
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: themedColors.textSecondary, mb: 1 }}
        >
          {t("detail.disciplineScore")} - {partyName}
        </Typography>
        <Typography
          sx={{
            fontSize: "3rem",
            fontWeight: 700,
            color:
              disciplineData.discipline_rate >= 90
                ? colors.success
                : colors.warning,
          }}
        >
          {disciplineData.discipline_rate.toFixed(1)}%
        </Typography>
        <Typography variant="caption" sx={{ color: themedColors.textTertiary }}>
          {disciplineData.votes_with_majority} / {disciplineData.total_votes}
        </Typography>
      </Box>

      {topDissenters.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {t("detail.topDissenters")}
          </Typography>
          <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
            {topDissenters.map((person) => (
              <Box
                key={person.name}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1,
                  borderBottom: `1px solid ${themedColors.dataBorder}`,
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {person.name}
                </Typography>
                <Chip
                  label={t("detail.dissentCount", {
                    count: person.count,
                  })}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    bgcolor: `${colors.error}15`,
                    color: colors.error,
                  }}
                />
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

const ProfileMetric: React.FC<{
  label: string;
  value: string;
  accentColor: string;
  caption?: string;
}> = ({ label, value, accentColor, caption }) => {
  const themedColors = useThemedColors();

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${themedColors.dataBorder}`,
        background: themedColors.backgroundPaper,
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: themedColors.textSecondary, display: "block", mb: 0.5 }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, color: accentColor }}>
        {value}
      </Typography>
      {caption ? (
        <Typography
          variant="caption"
          sx={{ color: themedColors.textTertiary, display: "block", mt: 0.35 }}
        >
          {caption}
        </Typography>
      ) : null}
    </Box>
  );
};

export const PartyDetail: React.FC<{
  party: PartySummary | null;
  partyColor: string;
  asOfDate: string;
  startDate?: string;
  endDate?: string;
  governmentName?: string;
  governmentStartDate?: string;
  onClearSelection?: () => void;
}> = ({
  party,
  partyColor,
  asOfDate,
  startDate,
  endDate,
  governmentName,
  governmentStartDate,
  onClearSelection,
}) => {
  const themedColors = useThemedColors();
  const { t: tCommon } = useScopedTranslation("common");
  const { t } = useScopedTranslation("parties");
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (party) setTabIndex(0);
  }, [party]);

  if (!party) return null;

  const participationRate = `${(party.participation_rate ?? 0).toFixed(1)}%`;
  const participationRatio = tCommon("voteRatio", {
    cast: party.votes_cast ?? 0,
    total: party.total_votings ?? 0,
  });
  const averageAge = `${(party.average_age ?? 0).toFixed(1)}`;
  const visibleCode = party.party_display_code ?? party.party_code;
  const roleLabel =
    party.is_in_government === 1 ? t("government") : t("opposition");

  return (
    <DataCard sx={{ overflow: "hidden" }}>
      <Box
        sx={{
          position: "relative",
          borderLeft: `6px solid ${partyColor}`,
          background: `linear-gradient(135deg, ${partyColor}14 0%, ${colors.backgroundPaper} 60%)`,
          px: { xs: 2, sm: 3 },
          py: { xs: 2.5, sm: 3 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{
                color: partyColor,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              {t("detail.profileEyebrow")}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: themedColors.textPrimary,
                letterSpacing: "-0.03em",
              }}
            >
              {party.party_name}
            </Typography>
            <Box
              sx={{
                mt: 1,
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                alignItems: "center",
              }}
            >
              <Chip
                label={visibleCode}
                size="small"
                sx={{
                  fontWeight: 700,
                  color: partyColor,
                  bgcolor: `${partyColor}14`,
                  border: `1px solid ${partyColor}30`,
                }}
              />
              <Chip
                label={roleLabel}
                size="small"
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
              <Typography
                variant="body2"
                sx={{ color: themedColors.textSecondary }}
              >
                {t("detail.profileSummary", {
                  members: party.member_count,
                  participation: `${participationRate} (${participationRatio})`,
                })}
              </Typography>
            </Box>
          </Box>

          {onClearSelection && (
            <Button
              variant="outlined"
              onClick={onClearSelection}
              sx={commonStyles.compactOutlinedPrimaryButton}
            >
              {t("detail.clearSelection")}
            </Button>
          )}
        </Box>

        <Box
          sx={{
            mt: spacing.md,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: 1.5,
          }}
        >
          <ProfileMetric
            label={t("members")}
            value={String(party.member_count)}
            accentColor={partyColor}
          />
          <ProfileMetric
            label={t("participation")}
            value={participationRate}
            accentColor={partyColor}
            caption={participationRatio}
          />
          <ProfileMetric
            label={t("table.averageAge")}
            value={averageAge}
            accentColor={partyColor}
          />
          <ProfileMetric
            label={t("detail.genderSplit")}
            value={t("genderSplitLine", {
              womenLabel: t("womenShort"),
              female: party.female_count ?? 0,
              menLabel: t("menShort"),
              male: party.male_count ?? 0,
            })}
            accentColor={partyColor}
          />
        </Box>
      </Box>

      <Box sx={{ px: { xs: 1, sm: 2 }, pt: 1.5 }}>
        <Tabs
          value={tabIndex}
          onChange={(_, next) => setTabIndex(next)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              fontWeight: 600,
              fontSize: "0.82rem",
              minHeight: 44,
              textTransform: "none",
            },
          }}
        >
          <Tab
            label={t("detail.tabs.members")}
            icon={<GroupsIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label={t("detail.tabs.voting")}
            icon={<HowToVoteIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label={t("detail.tabs.discipline")}
            icon={<GavelIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          bgcolor: themedColors.backgroundSubtle,
        }}
      >
        {tabIndex === 0 && (
          <MembersTab
            partyCode={party.party_code}
            asOfDate={asOfDate}
            startDate={startDate}
            endDate={endDate}
            governmentName={governmentName}
            governmentStartDate={governmentStartDate}
          />
        )}
        {tabIndex === 1 && <VotingTab />}
        {tabIndex === 2 && (
          <DisciplineTab
            partyCode={party.party_code}
            partyName={party.party_name}
          />
        )}
      </Box>
    </DataCard>
  );
};

export default PartyDetail;
