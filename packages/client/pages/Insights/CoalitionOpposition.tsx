import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { colors, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";

interface CoalitionOppositionData {
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

interface CoalitionOppositionProps {
  onClose: () => void;
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
};

export default function CoalitionOpposition({
  onClose,
}: CoalitionOppositionProps) {
  const themedColors = useThemedColors();
  const { t } = useTranslation();
  const { selectedHallituskausi } = useHallituskausi();
  const [data, setData] = useState<CoalitionOppositionData[]>([]);
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

  useEffect(() => {
    const params = new URLSearchParams({ limit: "30" });
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
    }
    fetch(`/api/analytics/coalition-opposition?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((result) => {
        setData(result);
        setExpandedVotingIds(new Set());
        setLoadingVotingDetails(new Set());
        setVotingDetailsById({});
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          p: spacing.lg,
        }}
      >
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box sx={{ p: spacing.lg }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );

  // Compute agreement rate: votings where coalition and opposition majority agree
  const agreementCount = data.filter((d) => {
    const coalitionMajority = d.coalition_yes >= d.coalition_no ? "yes" : "no";
    const oppositionMajority =
      d.opposition_yes >= d.opposition_no ? "yes" : "no";
    return coalitionMajority === oppositionMajority;
  }).length;
  const agreementRate =
    data.length > 0 ? ((agreementCount / data.length) * 100).toFixed(1) : "0";

  const coalitionYesLabel = t("insights.coalitionOpposition.coalitionYes");
  const coalitionNoLabel = t("insights.coalitionOpposition.coalitionNo");
  const oppositionYesLabel = t("insights.coalitionOpposition.oppositionYes");
  const oppositionNoLabel = t("insights.coalitionOpposition.oppositionNo");

  const chartData = data.slice(0, 20).map((d, i) => ({
    name: `#${i + 1}`,
    [coalitionYesLabel]: d.coalition_yes,
    [coalitionNoLabel]: d.coalition_no,
    [oppositionYesLabel]: d.opposition_yes,
    [oppositionNoLabel]: d.opposition_no,
  }));

  return (
    <Box sx={{ p: spacing.lg, minHeight: "100vh" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: spacing.lg,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <AccountBalanceIcon sx={{ fontSize: 36, color: colors.primary }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {t("insights.coalitionOpposition.title")}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </Box>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: spacing.lg }}
      >
        {t("insights.coalitionOpposition.description")}
      </Typography>
      {selectedHallituskausi && (
        <Alert severity="info" sx={{ mb: spacing.md }}>
          Rajattu hallituskauteen: {selectedHallituskausi.label}
        </Alert>
      )}

      {data.length === 0 ? (
        <Alert severity="info">
          {t("insights.coalitionOpposition.noData")}
        </Alert>
      ) : (
        <>
          {/* Summary metrics */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
              gap: spacing.md,
              mb: spacing.lg,
            }}
          >
            <Box
              sx={{
                p: spacing.md,
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                textAlign: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: themedColors.textSecondary }}
              >
                {t("insights.coalitionOpposition.agreementRate")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: colors.primary,
                }}
              >
                {agreementRate}%
              </Typography>
            </Box>
            <Box
              sx={{
                p: spacing.md,
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                textAlign: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: themedColors.textSecondary }}
              >
                {t("insights.coalitionOpposition.agreements")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: colors.success,
                }}
              >
                {agreementCount}
              </Typography>
            </Box>
            <Box
              sx={{
                p: spacing.md,
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                textAlign: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: themedColors.textSecondary }}
              >
                {t("insights.coalitionOpposition.votings")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: themedColors.textPrimary,
                }}
              >
                {data.length}
              </Typography>
            </Box>
          </Box>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fill: themedColors.textSecondary }}
              />
              <YAxis tick={{ fill: themedColors.textSecondary }} />
              <Tooltip />
              <Legend />
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

          <Box sx={{ mt: spacing.lg }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
              {t("insights.coalitionOpposition.inlineVotings")}
            </Typography>
            {data.slice(0, 20).map((vote) => {
              const isExpanded = expandedVotingIds.has(vote.voting_id);
              const details = votingDetailsById[vote.voting_id];
              const detailsLoading = loadingVotingDetails.has(vote.voting_id);
              return (
                <Box
                  key={vote.voting_id}
                  sx={{
                    py: 1.25,
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
                        minWidth: 200,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      {vote.title || vote.section_title}
                    </Typography>
                    <Chip
                      size="small"
                      label={`H ${vote.coalition_yes}-${vote.coalition_no}`}
                    />
                    <Chip
                      size="small"
                      label={`O ${vote.opposition_yes}-${vote.opposition_no}`}
                    />
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
                      {isExpanded
                        ? t("common.hideDetails")
                        : t("common.showDetails")}
                    </Button>
                  </Box>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Box
                      sx={{
                        mt: 0.75,
                        p: 1,
                        borderRadius: 1,
                        border: `1px solid ${themedColors.dataBorder}60`,
                        backgroundColor: `${colors.primaryLight}04`,
                      }}
                    >
                      {detailsLoading && (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <CircularProgress size={12} />
                          <Typography
                            variant="caption"
                            sx={{ color: themedColors.textSecondary }}
                          >
                            {t("common.loadingVotingDetails")}
                          </Typography>
                        </Box>
                      )}
                      {!detailsLoading && details && (
                        <VotingResultsTable
                          partyBreakdown={details.partyBreakdown}
                          memberVotes={details.memberVotes}
                        />
                      )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}
