import CloseIcon from "@mui/icons-material/Close";
import BalanceIcon from "@mui/icons-material/Balance";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { colors, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { VoteMarginBar } from "#client/theme/components";
import { useTranslation } from "react-i18next";

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
  const themedColors = useThemedColors();
  const { t } = useTranslation();
  const [data, setData] = useState<CloseVoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/close-votes?threshold=10&limit=30")
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
  }, []);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", p: spacing.lg }}>
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: spacing.lg }}>
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

      <Typography variant="body1" color="text.secondary" sx={{ mb: spacing.lg }}>
        {t("insights.closeVotes.description")}
      </Typography>

      {data.length === 0 ? (
        <Alert severity="info">{t("insights.closeVotes.noData")}</Alert>
      ) : (
        <Box>
          {data.map((vote) => {
            const passed = vote.n_yes > vote.n_no;
            return (
              <Box
                key={vote.id}
                sx={{
                  py: 2,
                  borderBottom: `1px solid ${themedColors.dataBorder}`,
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ color: themedColors.textPrimary }}>
                      {vote.title || vote.section_title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                      {new Date(vote.start_time).toLocaleDateString("fi-FI")}
                    </Typography>
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
                <Typography variant="caption" sx={{ color: themedColors.textTertiary }}>
                  {vote.n_yes} jaa / {vote.n_no} ei / {vote.n_abstain} tyhjää / {vote.n_absent} poissa
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
