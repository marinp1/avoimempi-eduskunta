import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Tune as TuneIcon,
} from "@mui/icons-material";
import {
  Badge,
  Box,
  Button,
  Chip,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { colors } from "#client/theme";
import { ToolbarCard } from "#client/theme/components";

type ActiveFilterChip = {
  key: string;
  label: string;
  onDelete: () => void;
};

const DocumentsFilterPanelComponent: React.FC<{
  title?: string;
  helperText?: string;
  activeFiltersTitle?: string;
  clearLabel?: string;
  canClear?: boolean;
  onClear?: () => void;
  activeFilters?: ActiveFilterChip[];
  children: React.ReactNode;
  secondaryFilters?: React.ReactNode;
  collapsible?: boolean;
}> = ({
  title,
  helperText,
  activeFiltersTitle,
  clearLabel,
  canClear = false,
  onClear,
  activeFilters = [],
  children,
  secondaryFilters,
  collapsible = false,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount = activeFilters.length;

  const filterContent = (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 2fr) repeat(2, minmax(180px, 1fr))",
          },
          gap: 2,
        }}
      >
        {children}
      </Box>

      {secondaryFilters && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(220px, 1fr))",
            },
            gap: 2,
          }}
        >
          {secondaryFilters}
        </Box>
      )}

      {activeFiltersTitle ? (
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
      ) : null}
    </Stack>
  );

  return (
    <ToolbarCard
      title={title}
      description={helperText}
      icon={<TuneIcon sx={{ fontSize: 18 }} />}
      actions={
        clearLabel && onClear ? (
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
        ) : undefined
      }
      sx={{
        mb: 0,
      }}
    >
      {collapsible ? (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: filtersOpen ? 2 : 0,
            }}
          >
            <Badge badgeContent={activeFilterCount} color="primary">
              <Button
                size="small"
                variant="outlined"
                onClick={() => setFiltersOpen((prev) => !prev)}
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      transform: filtersOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                }
              >
                Suodattimet
              </Button>
            </Badge>
          </Box>
          <Collapse in={filtersOpen} timeout="auto" unmountOnExit>
            {filterContent}
          </Collapse>
        </>
      ) : (
        filterContent
      )}
    </ToolbarCard>
  );
};

export const DocumentsFilterPanel = React.memo(DocumentsFilterPanelComponent);
