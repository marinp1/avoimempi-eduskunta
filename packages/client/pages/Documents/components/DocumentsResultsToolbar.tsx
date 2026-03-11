import { Box, Chip, Stack, Typography } from "@mui/material";
import React from "react";
import { colors } from "#client/theme";

const DocumentsResultsToolbarComponent: React.FC<{
  resultsSummary: string;
  typeLabel: string;
}> = ({ resultsSummary, typeLabel }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: { xs: "flex-start", sm: "center" },
      flexDirection: { xs: "column", sm: "row" },
      gap: 1.5,
      px: 0.25,
    }}
  >
    <Typography
      variant="body2"
      sx={{
        color: colors.textSecondary,
        fontWeight: 600,
      }}
    >
      {resultsSummary}
    </Typography>
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
      <Typography variant="caption" sx={{ color: colors.textTertiary }}>
        Selausnäkymä
      </Typography>
      <Chip
        label={typeLabel}
        variant="outlined"
        sx={{
          borderColor: `${colors.primary}30`,
          backgroundColor: "rgba(255,255,255,0.7)",
          color: colors.primary,
          fontWeight: 600,
        }}
      />
    </Stack>
  </Box>
);

export const DocumentsResultsToolbar = React.memo(
  DocumentsResultsToolbarComponent,
);
