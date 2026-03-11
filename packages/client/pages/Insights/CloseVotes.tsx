import BalanceIcon from "@mui/icons-material/Balance";
import { Alert, Box, CircularProgress, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import { VotingCard, type VotingCardData } from "#client/components/VotingCard";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, spacing } from "#client/theme";
import { PanelHeader } from "#client/theme/components";
import { apiFetch } from "#client/utils/fetch";

type CloseVoteData = ApiRouteItem<`/api/analytics/close-votes`>;

interface CloseVotesProps {
  onClose: () => void;
}

export default function CloseVotes({ onClose }: CloseVotesProps) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tInsights } = useScopedTranslation("insights");
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
    apiFetch(`/api/analytics/close-votes?${params.toString()}`)
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
      <PanelHeader
        title={tInsights("closeVotes.title")}
        subtitle={tInsights("closeVotes.description")}
        icon={<BalanceIcon sx={{ fontSize: 28, color: colors.primary }} />}
        onClose={onClose}
        sx={{ mb: spacing.lg }}
      />
      {selectedHallituskausi && (
        <Alert severity="info" sx={{ mb: spacing.md }}>
          {tCommon("filteredByGovernmentPeriodLine", {
            value: selectedHallituskausi.label,
          })}
        </Alert>
      )}

      {data.length === 0 ? (
        <Alert severity="info">{tInsights("closeVotes.noData")}</Alert>
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
