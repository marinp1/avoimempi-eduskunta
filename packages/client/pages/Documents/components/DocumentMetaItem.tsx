import { Box, type SxProps, type Theme, Typography } from "@mui/material";
import type React from "react";
import { colors } from "#client/theme";

export const DocumentMetaItem: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  onClick?: () => void;
}> = ({ icon, children, sx, onClick }) => (
  <Box
    component={onClick ? "button" : "div"}
    onClick={onClick}
    sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
      minHeight: 24,
      px: 1,
      py: 0.375,
      borderRadius: 1,
      backgroundColor: colors.surfaceTint,
      color: colors.textSecondary,
      ...(onClick && {
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "inherit",
        "&:hover": {
          color: colors.primary,
          backgroundColor: colors.surfaceTintStrong,
        },
      }),
      ...sx,
    }}
  >
    {icon && (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          color: colors.primary,
          "& svg": { fontSize: 16 },
        }}
      >
        {icon}
      </Box>
    )}
    <Typography
      variant="body2"
      sx={{
        color: "inherit",
        lineHeight: 1.35,
      }}
    >
      {children}
    </Typography>
  </Box>
);
