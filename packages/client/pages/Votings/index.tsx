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
import { useThemedColors } from "#client/theme/ThemeContext";
import { DataCard, PageHeader } from "#client/theme/components";
import { VoteResults } from "./VoteResults";

export default () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const [search, setSearch] = React.useState("");
  const deferredQuery = React.useDeferredValue(search);
  const isStale = search !== deferredQuery;

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
                  <SearchIcon sx={{ color: themedColors.primary, fontSize: 20 }} />
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
          <VoteResults query={deferredQuery} />
        </Box>
      </React.Suspense>
    </Box>
  );
};
