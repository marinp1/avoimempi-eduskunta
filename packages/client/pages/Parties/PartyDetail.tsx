import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  IconButton,
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
  useMediaQuery,
} from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { refs } from "#client/references";
import theme, { colors } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";

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

interface PartyMember {
  person_id: number;
  first_name: string;
  last_name: string;
  party: string;
  gender: string;
  birth_date: string;
  current_municipality: string;
  profession: string;
  is_minister: number;
  ministry: string | null;
}

interface CoalitionOppositionRow {
  voting_id: number;
  start_time: string;
  title: string;
  section_title: string;
  n_yes: number;
  n_no: number;
  coalition_yes: number;
  coalition_no: number;
  coalition_total: number;
  opposition_yes: number;
  opposition_no: number;
  opposition_total: number;
}

type VotingInlineDetails = {
  partyBreakdown: {
    party_code: string;
    party_name: string;
    n_yes: number;
    n_no: number;
    n_abstain: number;
    n_absent: number;
    n_total: number;
  }[];
  memberVotes: {
    person_id: number;
    first_name: string;
    last_name: string;
    party_code: string;
    vote: string;
    is_government: 0 | 1;
  }[];
  governmentOpposition: {
    government_yes: number;
    government_no: number;
    opposition_yes: number;
    opposition_no: number;
  } | null;
};

interface DissentRow {
  person_id: number;
  first_name: string;
  last_name: string;
  party_name: string;
  party_code: string;
  voting_id: number;
  start_time: string;
  title: string;
  section_title: string;
  mp_vote: string;
  majority_vote: string;
}

interface PartyDisciplineRow {
  party_name: string;
  party_code: string;
  total_votes: number;
  votes_with_majority: number;
  discipline_rate: number;
}

// ── Members Tab ──
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
  const { t } = useTranslation();
  const [members, setMembers] = useState<PartyMember[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ asOfDate });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (governmentName && governmentStartDate) {
      params.set("governmentName", governmentName);
      params.set("governmentStartDate", governmentStartDate);
    }
    fetch(`/api/parties/${partyCode}/members?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setMembers(data);
        setLoading(false);
      });
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

  if (!members || members.length === 0)
    return (
      <Typography
        variant="body2"
        sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
      >
        {t("parties.detail.noMembers")}
      </Typography>
    );

  return (
    <TableContainer sx={{ maxHeight: 500 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>{t("common.name")}</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>
              {t("parties.detail.municipality")}
            </TableCell>
            <TableCell
              sx={{
                fontWeight: 600,
                display: { xs: "none", sm: "table-cell" },
              }}
            >
              {t("parties.detail.profession")}
            </TableCell>
            <TableCell sx={{ fontWeight: 600 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.person_id}>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>
                  <Link
                    href={refs.member(m.person_id)}
                    underline="hover"
                    color="inherit"
                  >
                    {m.last_name}, {m.first_name}
                  </Link>
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {m.current_municipality || "-"}
                </Typography>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                <Typography variant="body2">{m.profession || "-"}</Typography>
              </TableCell>
              <TableCell>
                {m.is_minister === 1 && (
                  <Chip
                    label={t("parties.detail.minister")}
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

// ── Voting Tab ──
const VotingTab: React.FC<{ isGovernment: boolean }> = ({
  isGovernment: _isGovernment,
}) => {
  const themedColors = useThemedColors();
  const { t } = useTranslation();
  const { selectedHallituskausi } = useHallituskausi();
  const [data, setData] = useState<CoalitionOppositionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedVotingIds, setExpandedVotingIds] = useState<Set<number>>(
    new Set(),
  );
  const [loadingVotingDetails, setLoadingVotingDetails] = useState<Set<number>>(
    new Set(),
  );
  const [votingDetailsById, setVotingDetailsById] = useState<
    Record<number, VotingInlineDetails>
  >({});

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "30" });
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
    }
    fetch(`/api/analytics/coalition-opposition?${params.toString()}`)
      .then((res) => res.json())
      .then((result) => {
        setData(result);
        setExpandedVotingIds(new Set());
        setLoadingVotingDetails(new Set());
        setVotingDetailsById({});
        setLoading(false);
      });
  }, [selectedHallituskausi]);

  const fetchVotingDetails = async (votingId: number) => {
    if (votingDetailsById[votingId] || loadingVotingDetails.has(votingId))
      return;
    setLoadingVotingDetails((prev) => new Set(prev).add(votingId));
    try {
      const res = await fetch(`/api/votings/${votingId}/details`);
      if (!res.ok) return;
      const data: VotingInlineDetails = await res.json();
      setVotingDetailsById((prev) => ({ ...prev, [votingId]: data }));
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
    if (shouldExpand) {
      void fetchVotingDetails(votingId);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  if (!data || data.length === 0)
    return (
      <Typography
        variant="body2"
        sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
      >
        {t("parties.detail.noVotingData")}
      </Typography>
    );

  const chartData = data.slice(0, 20).map((d) => ({
    title: (d.title || d.section_title || "").slice(0, 30),
    [t("parties.detail.coalitionYes")]: d.coalition_yes,
    [t("parties.detail.coalitionNo")]: d.coalition_no,
    [t("parties.detail.oppositionYes")]: d.opposition_yes,
    [t("parties.detail.oppositionNo")]: d.opposition_no,
  }));

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        {t("parties.detail.coalitionVoting")}
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
            dataKey={t("parties.detail.coalitionYes")}
            stackId="coalition"
            fill={colors.success}
          />
          <Bar
            dataKey={t("parties.detail.coalitionNo")}
            stackId="coalition"
            fill={colors.errorLight}
          />
          <Bar
            dataKey={t("parties.detail.oppositionYes")}
            stackId="opposition"
            fill={colors.coalitionColor}
          />
          <Bar
            dataKey={t("parties.detail.oppositionNo")}
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
                  sx={{
                    textTransform: "none",
                    minWidth: 0,
                    px: 1,
                    fontSize: "0.68rem",
                  }}
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
                  {isExpanded ? "Piilota tiedot" : "Näytä tiedot"}
                </Button>
                <Button
                  size="small"
                  sx={{
                    textTransform: "none",
                    minWidth: 0,
                    px: 1,
                    fontSize: "0.68rem",
                  }}
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
                  Avaa näkymä
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
                        Ladataan äänestyksen yksityiskohtia...
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
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

// ── Discipline Tab ──
const DisciplineTab: React.FC<{ partyCode: string; partyName: string }> = ({
  partyCode,
  partyName,
}) => {
  const themedColors = useThemedColors();
  const { t } = useTranslation();
  const { selectedHallituskausi } = useHallituskausi();
  const [disciplineData, setDisciplineData] =
    useState<PartyDisciplineRow | null>(null);
  const [dissents, setDissents] = useState<DissentRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    Promise.all([
      fetch(`/api/analytics/party-discipline${query}`).then((r) => r.json()),
      fetch(
        `/api/analytics/dissent?limit=200${params.toString() ? `&${params.toString()}` : ""}`,
      ).then((r) => r.json()),
    ]).then(([allDiscipline, allDissents]) => {
      const partyDisc = (allDiscipline as PartyDisciplineRow[]).find(
        (d) => d.party_code === partyCode,
      );
      setDisciplineData(partyDisc || null);

      const partyDissents = (allDissents as DissentRow[]).filter(
        (d) => d.party_code === partyCode,
      );
      setDissents(partyDissents);
      setLoading(false);
    });
  }, [partyCode, selectedHallituskausi]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  if (!disciplineData)
    return (
      <Typography
        variant="body2"
        sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
      >
        {t("parties.detail.noDisciplineData")}
      </Typography>
    );

  // Group dissents by person to find top dissenters
  const dissentsByPerson = new Map<number, { name: string; count: number }>();
  dissents?.forEach((d) => {
    const existing = dissentsByPerson.get(d.person_id);
    if (existing) {
      existing.count++;
    } else {
      dissentsByPerson.set(d.person_id, {
        name: `${d.first_name} ${d.last_name}`,
        count: 1,
      });
    }
  });

  const topDissenters = Array.from(dissentsByPerson.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <Box>
      {/* Discipline score prominently */}
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
          {t("parties.detail.disciplineScore")} - {partyName}
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

      {/* Top dissenters */}
      {topDissenters.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {t("parties.detail.topDissenters")}
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
                  label={`${person.count} ${t("parties.detail.dissentCount")}`}
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

// ── Main Dialog ──
export const PartyDetail: React.FC<{
  open: boolean;
  onClose: () => void;
  party: PartySummary | null;
  asOfDate: string;
  startDate?: string;
  endDate?: string;
  governmentName?: string;
  governmentStartDate?: string;
}> = ({
  open,
  onClose,
  party,
  asOfDate,
  startDate,
  endDate,
  governmentName,
  governmentStartDate,
}) => {
  const themedColors = useThemedColors();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (party) setTabIndex(0);
  }, [party]);

  if (!party) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          maxHeight: isMobile ? "100vh" : "90vh",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: colors.primary,
          borderRadius: isMobile ? 0 : "12px 12px 0 0",
        }}
      >
        <Box sx={{ position: "relative", p: { xs: 2, sm: 2.5 } }}>
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: { xs: 8, sm: 12 },
              right: { xs: 8, sm: 12 },
              color: "white",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ pr: { xs: 4, sm: 0 } }}>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ color: "white", mb: 0.5 }}
            >
              {party.party_name}
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.85)" }}
              >
                {party.member_count} {t("parties.members")}
              </Typography>
              <Chip
                label={
                  party.is_in_government === 1
                    ? t("parties.government")
                    : t("parties.opposition")
                }
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  bgcolor:
                    party.is_in_government === 1
                      ? "rgba(76, 175, 80, 0.25)"
                      : "rgba(255, 152, 0, 0.25)",
                  color: "white",
                  border:
                    party.is_in_government === 1
                      ? "1px solid rgba(76, 175, 80, 0.5)"
                      : "1px solid rgba(255, 152, 0, 0.5)",
                }}
              />
            </Box>
          </Box>
        </Box>

        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            px: 1,
            "& .MuiTab-root": {
              color: "rgba(255,255,255,0.6)",
              fontWeight: 600,
              fontSize: "0.8rem",
              minHeight: 40,
              textTransform: "none",
              py: 0,
              "&.Mui-selected": { color: "white" },
            },
            "& .MuiTabs-indicator": { bgcolor: "white", height: 2 },
          }}
        >
          <Tab
            label={t("parties.detail.tabs.members")}
            icon={<GroupsIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label={t("parties.detail.tabs.voting")}
            icon={<HowToVoteIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab
            label={t("parties.detail.tabs.discipline")}
            icon={<GavelIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <DialogContent
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: themedColors.backgroundSubtle,
          overflowY: "auto",
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
        {tabIndex === 1 && (
          <VotingTab isGovernment={party.is_in_government === 1} />
        )}
        {tabIndex === 2 && (
          <DisciplineTab
            partyCode={party.party_code}
            partyName={party.party_name}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PartyDetail;
