import { Close as CloseIcon, Tune as TuneIcon } from "@mui/icons-material";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import React from "react";
import { DataCard } from "#client/theme/components";
import { colors } from "#client/theme";

type ActiveFilterChip = {
  key: string;
  label: string;
  onDelete: () => void;
};

const DocumentsFilterPanelComponent: React.FC<{
  title: string;
  helperText: string;
  activeFiltersTitle: string;
  clearLabel: string;
  canClear: boolean;
  onClear: () => void;
  activeFilters: ActiveFilterChip[];
  children: React.ReactNode;
  secondaryFilters?: React.ReactNode;
}> = ({
  title,
  helperText,
  activeFiltersTitle,
  clearLabel,
  canClear,
  onClear,
  activeFilters,
  children,
  secondaryFilters,
}) => (
  <DataCard
    sx={{
      p: { xs: 2, md: 2.5 },
      background: "#fbfcfd",
      boxShadow: "0 4px 12px rgba(15, 27, 51, 0.04)",
    }}
  >
    <Stack spacing={2}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <TuneIcon sx={{ color: colors.primary, fontSize: 18 }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: '"Zilla Slab", Georgia, serif',
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              {title}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
            {helperText}
          </Typography>
        </Box>
        <Button
          variant="text"
          color="inherit"
          onClick={canClear ? onClear : undefined}
          disabled={!canClear}
          startIcon={<CloseIcon />}
          sx={{
            color: canClear ? colors.primary : colors.textTertiary,
            px: 0,
          }}
        >
          {clearLabel}
        </Button>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 2fr) repeat(2, minmax(180px, 1fr))" },
          gap: 2,
        }}
      >
        {children}
      </Box>

      {secondaryFilters && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(220px, 1fr))" },
            gap: 2,
          }}
        >
          {secondaryFilters}
        </Box>
      )}

      <Stack spacing={1}>
        <Typography
          variant="caption"
          sx={{
            color: colors.textSecondary,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {activeFiltersTitle}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
          {activeFilters.length > 0 ? (
            activeFilters.map((filter) => (
              <Chip
                key={filter.key}
                label={filter.label}
                onDelete={filter.onDelete}
                sx={{
                  backgroundColor: `${colors.primary}10`,
                  color: colors.primary,
                }}
              />
            ))
          ) : (
            <Typography variant="body2" sx={{ color: colors.textTertiary }}>
              -
            </Typography>
          )}
        </Box>
      </Stack>
    </Stack>
  </DataCard>
);

export const DocumentsFilterPanel = React.memo(DocumentsFilterPanelComponent);
