import BalanceIcon from "@mui/icons-material/Balance";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { refs } from "#client/references";
import { colors, spacing } from "#client/theme";
import { VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

interface CloseVoteData {
  id: number;
  start_time: string;
  title: string;
  section_title: string;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
  margin: number;
  session_key: string;
  section_key: string;
  result_url: string;
  proceedings_url: string;
}

interface CloseVotesProps {
  onClose: () => void;
}

type VotingInlineDetails = {
  voting: {
    id: number;
    n_yes: number;
    n_no: number;
    n_abstain: number;
    n_absent: number;
  };
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

export default function CloseVotes({ onClose }: CloseVotesProps) {
  const themedColors = useThemedColors();
  const { t } = useTranslation();
  const [data, setData] = useState<CloseVoteData[]>([]);
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
    fetch("/api/analytics/close-votes?threshold=10&limit=30")
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
  }, []);

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
          <BalanceIcon sx={{ fontSize: 36, color: colors.primary }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {t("insights.closeVotes.title")}
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
        {t("insights.closeVotes.description")}
      </Typography>

      {data.length === 0 ? (
        <Alert severity="info">{t("insights.closeVotes.noData")}</Alert>
      ) : (
        <Box>
          {data.map((vote) => {
            const passed = vote.n_yes > vote.n_no;
            const isExpanded = expandedVotingIds.has(vote.id);
            const details = votingDetailsById[vote.id];
            const detailsLoading = loadingVotingDetails.has(vote.id);
            return (
              <Box
                key={vote.id}
                sx={{
                  py: 2,
                  borderBottom: `1px solid ${themedColors.dataBorder}`,
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ color: themedColors.textPrimary }}
                    >
                      {vote.title || vote.section_title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {new Date(vote.start_time).toLocaleDateString("fi-FI")}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        mt: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
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
                        onClick={() => toggleVotingDetails(vote.id)}
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
                            refs.voting(
                              vote.id,
                              vote.session_key,
                              vote.start_time,
                            ),
                          );
                          window.dispatchEvent(new PopStateEvent("popstate"));
                        }}
                      >
                        Avaa näkymä
                      </Button>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                    <Chip
                      label={`${t("insights.closeVotes.margin")}: ${vote.margin}`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor: `${colors.warning}15`,
                        color: colors.warning,
                      }}
                    />
                    <Chip
                      label={passed ? "Jaa" : "Ei"}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor: passed ? "#22C55E20" : "#EF444420",
                        color: passed ? "#16A34A" : "#DC2626",
                      }}
                    />
                  </Box>
                </Box>
                <VoteMarginBar
                  yes={vote.n_yes}
                  no={vote.n_no}
                  empty={vote.n_abstain}
                  absent={vote.n_absent}
                  height={6}
                  sx={{ mb: 0.5 }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textTertiary }}
                >
                  {vote.n_yes} jaa / {vote.n_no} ei / {vote.n_abstain} tyhjää /{" "}
                  {vote.n_absent} poissa
                </Typography>
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
      )}
    </Box>
  );
}
