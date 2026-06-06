import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  CardActionArea,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { commonStyles } from "#client/theme";
import { EmptyState } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import type { RepresentativeSelection } from "../Details";
import { formatFinnishDate, type PersonLookupResult } from "../helpers";

export const GlobalPersonSearch: React.FC<{
  lookupQuery: string;
  setLookupQuery: (query: string) => void;
  lookupLoading: boolean;
  lookupError: string | null;
  lookupSelectionMessage: string | null;
  lookupResults: PersonLookupResult[];
  committedLookupQuery: string;
  selectedRepresentative: RepresentativeSelection | null;
  onResultClick: (result: PersonLookupResult) => void;
}> = ({
  lookupQuery,
  setLookupQuery,
  lookupLoading,
  lookupError,
  lookupSelectionMessage,
  lookupResults,
  committedLookupQuery,
  selectedRepresentative,
  onResultClick,
}) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();

  return (
    <Box
      sx={{
        p: 1.5,
        mb: 2,
        borderBottom: `1px solid ${themedColors.dataBorder}`,
      }}
    >
      <Typography
        variant="h6"
        sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
      >
        {t("globalSearch.title")}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: themedColors.textSecondary, mb: 1.5 }}
      >
        {t("globalSearch.description")}
      </Typography>

      <TextField
        fullWidth
        size="small"
        placeholder={t("globalSearch.placeholder")}
        value={lookupQuery}
        onChange={(event) => setLookupQuery(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18 }} />
              </InputAdornment>
            ),
            endAdornment: lookupQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setLookupQuery("")}>
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />

      {lookupLoading && <LinearProgress sx={{ mt: 1.5 }} />}
      {lookupSelectionMessage && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {lookupSelectionMessage}
        </Alert>
      )}
      {lookupError && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {lookupError}
        </Alert>
      )}

      {committedLookupQuery.length < 2 ? (
        <EmptyState
          title={t("globalSearch.startTitle")}
          description={t("globalSearch.startHint")}
          sx={{ mt: 2 }}
        />
      ) : lookupResults.length === 0 && !lookupLoading ? (
        <EmptyState
          title={t("globalSearch.noResults")}
          description={t("globalSearch.noResultsHint")}
          sx={{ mt: 2 }}
        />
      ) : (
        <Box
          sx={{
            mt: 1.5,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1,
          }}
        >
          {lookupResults.map((result) => (
            <CardActionArea
              key={result.person_id}
              onClick={() => onResultClick(result)}
              sx={{
                borderRadius: 1,
                border: `1px solid ${
                  selectedRepresentative?.personId === result.person_id
                    ? themedColors.primary
                    : themedColors.dataBorder
                }`,
                background:
                  selectedRepresentative?.personId === result.person_id
                    ? `${themedColors.primary}08`
                    : themedColors.backgroundPaper,
                px: 1,
                py: 0.75,
              }}
            >
              <Stack spacing={0.75}>
                <Stack
                  direction="row"
                  spacing={0.75}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: themedColors.textPrimary }}
                  >
                    {result.first_name} {result.last_name}
                  </Typography>
                  {result.is_current_mp === 1 && (
                    <Chip
                      size="small"
                      label={t("globalSearch.badges.current")}
                      sx={{ ...commonStyles.compactChipSm }}
                    />
                  )}
                  {result.is_active_on_selected_date === 1 && (
                    <Chip
                      size="small"
                      label={t("globalSearch.badges.activeOnDate")}
                      sx={{ ...commonStyles.compactChipSm }}
                    />
                  )}
                </Stack>
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textSecondary }}
                >
                  {result.latest_party_name || t("details.unknownParty")}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textTertiary }}
                >
                  {t("globalSearch.termRange", {
                    start: result.first_term_start
                      ? formatFinnishDate(result.first_term_start)
                      : "?",
                    end: result.last_term_end
                      ? formatFinnishDate(result.last_term_end)
                      : t("details.ongoing"),
                  })}
                </Typography>
              </Stack>
            </CardActionArea>
          ))}
        </Box>
      )}
    </Box>
  );
};
