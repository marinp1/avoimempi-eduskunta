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
      gap: 0.75,
      minHeight: 28,
      px: 1.25,
      py: 0.625,
      borderRadius: 999,
      border: `1px solid ${colors.dataBorder}`,
      backgroundColor: colors.backgroundPaper,
      color: colors.textSecondary,
      ...(onClick && {
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "inherit",
        "&:hover": {
          borderColor: colors.primary,
          color: colors.primary,
          backgroundColor: `${colors.primary}06`,
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
