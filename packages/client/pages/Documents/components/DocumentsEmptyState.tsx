import { SearchOff as SearchOffIcon } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import type React from "react";
import { DataCard } from "#client/theme/components";
import { colors } from "#client/theme";

export const DocumentsEmptyState: React.FC<{
  title: string;
  description: string;
  clearLabel: string;
  onClear?: () => void;
}> = ({ title, description, clearLabel, onClear }) => (
  <DataCard sx={{ p: { xs: 3, md: 4 } }}>
    <Stack spacing={1.5} alignItems="center" textAlign="center">
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          backgroundColor: `${colors.primary}10`,
          color: colors.primary,
        }}
      >
        <SearchOffIcon />
      </Box>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: colors.textPrimary,
        }}
      >
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: colors.textSecondary, maxWidth: 520 }}>
        {description}
      </Typography>
      {onClear && (
        <Button variant="outlined" onClick={onClear}>
          {clearLabel}
        </Button>
      )}
    </Stack>
  </DataCard>
);
