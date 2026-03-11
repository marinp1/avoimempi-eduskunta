import { Box, Chip, Stack, Typography } from "@mui/material";
import type React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors } from "#client/theme";

export const VotingsResultsSummary: React.FC<{
  count: number;
  groupingLabel: string;
  contextLabel?: string | null;
}> = ({ count, groupingLabel, contextLabel }) => {
  const { t } = useScopedTranslation("votings");

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        gap: 1.5,
        mb: 1.5,
        px: 0.25,
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: colors.textSecondary, fontWeight: 600 }}
      >
        {t("resultCount", { count })}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip
          label={groupingLabel}
          variant="outlined"
          sx={{
            borderColor: `${colors.primary}30`,
            backgroundColor: "rgba(255,255,255,0.7)",
            color: colors.primary,
            fontWeight: 600,
          }}
        />
        {contextLabel && (
          <Typography variant="caption" sx={{ color: colors.textTertiary }}>
            {contextLabel}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
