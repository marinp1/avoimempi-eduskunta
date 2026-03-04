import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { commonStyles, spacing } from "#client/theme";
import { DataCard, PageHeader } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { VoteResults } from "./VoteResults";

export default () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const getInitialParams = React.useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const votingRaw = params.get("voting");
    const voting = votingRaw ? Number(votingRaw) : null;
    return {
      query: params.get("q") ?? "",
      session: params.get("session"),
      voting: Number.isFinite(voting) ? voting : null,
    };
  }, []);

  const [search, setSearch] = React.useState(() => getInitialParams().query);
  const [focusVotingId, setFocusVotingId] = React.useState<number | null>(
    () => getInitialParams().voting,
  );
  const [focusSessionKey, setFocusSessionKey] = React.useState<string | null>(
    () => getInitialParams().session,
  );
  const deferredQuery = React.useDeferredValue(search);
  const isStale = search !== deferredQuery;

  React.useEffect(() => {
    const handlePopState = () => {
      const next = getInitialParams();
      setSearch(next.query);
      setFocusVotingId(next.voting);
      setFocusSessionKey(next.session);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [getInitialParams]);

  return (
    <Box>
      <PageHeader title={t("votings.title")} subtitle={t("votings.subtitle")} />

      <DataCard sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <TextField
            fullWidth
            label={t("votings.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value ?? "")}
            placeholder={t("votings.searchPlaceholder")}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{ color: themedColors.primary, fontSize: 20 }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                background: "#fff",
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: themedColors.textTertiary,
              display: "block",
              mt: 1,
            }}
          >
            {t("votings.searchHelp")}
          </Typography>
        </Box>
      </DataCard>

      {!deferredQuery && !focusVotingId && (
        <Typography
          variant="overline"
          sx={{
            color: themedColors.textTertiary,
            display: "block",
            mb: 1.5,
            letterSpacing: "0.08em",
          }}
        >
          {t("votings.recentVotes")}
        </Typography>
      )}

      <React.Suspense
        fallback={
          <Box sx={{ ...commonStyles.centeredFlex, py: spacing.xl }}>
            <CircularProgress sx={{ color: themedColors.primary }} />
          </Box>
        }
      >
        <Box
          sx={{
            opacity: isStale ? 0.6 : 1,
            transition: isStale
              ? "opacity 0.2s 0.2s linear"
              : "opacity 0s 0s linear",
          }}
        >
          <VoteResults
            query={deferredQuery}
            focusVotingId={focusVotingId}
            initialSessionFilter={focusSessionKey}
          />
        </Box>
      </React.Suspense>
    </Box>
  );
};
