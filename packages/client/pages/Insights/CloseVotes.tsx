import BalanceIcon from "@mui/icons-material/Balance";
import CloseIcon from "@mui/icons-material/Close";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { VotingCard, type VotingCardData } from "#client/components/VotingCard";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { colors, spacing } from "#client/theme";

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

export default function CloseVotes({ onClose }: CloseVotesProps) {
  const { t } = useTranslation();
  const { selectedHallituskausi } = useHallituskausi();
  const [data, setData] = useState<CloseVoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      threshold: "10",
      limit: "30",
    });
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
    }
    fetch(`/api/analytics/close-votes?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedHallituskausi]);

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
      {selectedHallituskausi && (
        <Alert severity="info" sx={{ mb: spacing.md }}>
          {t("common.filteredByGovernmentPeriodLine", {
            value: selectedHallituskausi.label,
          })}
        </Alert>
      )}

      {data.length === 0 ? (
        <Alert severity="info">{t("insights.closeVotes.noData")}</Alert>
      ) : (
        <Stack spacing={1.5}>
          {data.map((vote) => {
            const voting: VotingCardData = {
              id: vote.id,
              start_time: vote.start_time,
              session_key: vote.session_key,
              section_key: vote.section_key,
              n_yes: vote.n_yes,
              n_no: vote.n_no,
              n_abstain: vote.n_abstain,
              n_absent: vote.n_absent,
              n_total: vote.n_total,
              title: vote.title || vote.section_title,
              section_title: vote.section_title,
              result_url: vote.result_url,
              proceedings_url: vote.proceedings_url,
            };
            return <VotingCard key={vote.id} voting={voting} />;
          })}
        </Stack>
      )}
    </Box>
  );
}
