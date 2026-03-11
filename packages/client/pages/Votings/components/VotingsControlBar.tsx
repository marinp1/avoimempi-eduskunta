import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { commonStyles } from "#client/theme";
import { ToolbarCard } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import type { VotingSortMode } from "../url-state";

type Option = {
  value: string;
  count?: number;
};

const VotingsControlBarComponent: React.FC<{
  search: string;
  onSearchChange: (value: string) => void;
  searchHint: string;
  sessionFilter: string;
  phaseFilter: string;
  sortMode: VotingSortMode;
  sessionOptions: Option[];
  phaseOptions: Option[];
  onSessionFilterChange: (value: string) => void;
  onPhaseFilterChange: (value: string) => void;
  onSortModeChange: (value: VotingSortMode) => void;
  onClearFilters: () => void;
  showSort: boolean;
  activeFilters: Array<{ key: string; label: string; onDelete: () => void }>;
}> = ({
  search,
  onSearchChange,
  searchHint,
  sessionFilter,
  phaseFilter,
  sortMode,
  sessionOptions,
  phaseOptions,
  onSessionFilterChange,
  onPhaseFilterChange,
  onSortModeChange,
  onClearFilters,
  showSort,
  activeFilters,
}) => {
  const { t } = useScopedTranslation("votings");
  const themedColors = useThemedColors();

  return (
    <ToolbarCard
      description={searchHint}
      icon={<TuneIcon sx={{ fontSize: 18 }} />}
      sticky
      sx={{
        mb: 3,
      }}
    >
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: showSort ? "minmax(0, 2fr) repeat(3, minmax(0, 1fr))" : "minmax(0, 2fr) repeat(2, minmax(0, 1fr))",
            },
            gap: 1.25,
            alignItems: "start",
          }}
        >
          <TextField
            fullWidth
            label={t("search")}
            value={search}
            onChange={(event) => onSearchChange(event.target.value ?? "")}
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
                backgroundColor: "#fff",
              },
            }}
          />

          <FormControl size="small" fullWidth>
            <InputLabel id="votings-phase-filter-label">
              {t("filters.phase")}
            </InputLabel>
            <Select
              labelId="votings-phase-filter-label"
              label={t("filters.phase")}
              value={phaseFilter}
              onChange={(event) => onPhaseFilterChange(event.target.value)}
            >
              <MenuItem value="all">{t("filters.all")}</MenuItem>
              {phaseOptions.map((phase) => (
                <MenuItem key={phase.value} value={phase.value}>
                  {phase.value}
                  {typeof phase.count === "number" ? ` (${phase.count})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel id="votings-session-filter-label">
              {t("filters.session")}
            </InputLabel>
            <Select
              labelId="votings-session-filter-label"
              label={t("filters.session")}
              value={sessionFilter}
              onChange={(event) => onSessionFilterChange(event.target.value)}
            >
              <MenuItem value="all">{t("filters.all")}</MenuItem>
              {sessionOptions.map((session) => (
                <MenuItem key={session.value} value={session.value}>
                  {session.value}
                  {typeof session.count === "number"
                    ? ` (${session.count})`
                    : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showSort && (
            <FormControl size="small" fullWidth>
              <InputLabel id="votings-sort-filter-label">
                {t("filters.sort")}
              </InputLabel>
              <Select
                labelId="votings-sort-filter-label"
                label={t("filters.sort")}
                value={sortMode}
                onChange={(event) =>
                  onSortModeChange(event.target.value as VotingSortMode)
                }
              >
                <MenuItem value="newest">{t("sort.newest")}</MenuItem>
                <MenuItem value="oldest">{t("sort.oldest")}</MenuItem>
                <MenuItem value="closest">{t("sort.closest")}</MenuItem>
                <MenuItem value="largest">{t("sort.largest")}</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.25,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary, fontWeight: 600 }}
            >
              {searchHint}
            </Typography>
            {activeFilters.map((filter) => (
              <Chip
                key={filter.key}
                label={filter.label}
                onDelete={filter.onDelete}
                size="small"
                sx={{
                  ...commonStyles.compactChipMd,
                  fontWeight: 600,
                  backgroundColor: `${themedColors.primary}10`,
                  color: themedColors.primary,
                }}
              />
            ))}
          </Box>

          {activeFilters.length > 0 && (
            <Button size="small" onClick={onClearFilters}>
              {t("clearFilters")}
            </Button>
          )}
        </Box>
      </Stack>
    </ToolbarCard>
  );
};

export const VotingsControlBar = React.memo(VotingsControlBarComponent);
