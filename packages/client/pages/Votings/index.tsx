import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  InputAdornment,
  LinearProgress,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors } from "#client/theme";
import { DataCard, InlineSpinner, PageHeader } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { VoteResults } from "./VoteResults";

export default () => {
  const { t } = useScopedTranslation("votings");
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
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <DataCard sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <TextField
            fullWidth
            label={t("search")}
            value={search}
            onChange={(event) => setSearch(event.target.value ?? "")}
            placeholder={t("searchPlaceholder")}
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
            {t("searchHelp")}
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
          {t("recentVotes")}
        </Typography>
      )}

      {isStale && (
        <LinearProgress
          sx={{
            mb: 1.5,
            height: 2,
            borderRadius: 1,
            backgroundColor: `${colors.primaryLight}20`,
            "& .MuiLinearProgress-bar": { backgroundColor: colors.primaryLight },
          }}
        />
      )}

      <React.Suspense fallback={<InlineSpinner />}>
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
