import { Box, Stack, Typography } from "@mui/material";
import type React from "react";
import { colors } from "#client/theme";

export const DocumentDetailSection: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <Box>
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
      {icon && (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            color: colors.primary,
            "& svg": { fontSize: 18 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          color: colors.textPrimary,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </Typography>
    </Stack>
    {children}
  </Box>
);
