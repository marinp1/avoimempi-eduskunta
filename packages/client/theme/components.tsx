import React from "react";
import { Box, Card, Button, type SxProps, type Theme } from "@mui/material";
import { commonStyles, gradients, colors } from "./index";
import { useThemedColors } from "./ThemeContext";

/**
 * Reusable glass-morphism card component
 */
export const GlassCard: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ children, sx }) => (
  <Card sx={{ ...commonStyles.glassCard, ...sx }}>{children}</Card>
);

/**
 * Reusable gradient button component
 */
export const GradientButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  startIcon?: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ children, onClick, disabled, startIcon, sx }) => (
  <Button
    variant="contained"
    onClick={onClick}
    disabled={disabled}
    startIcon={startIcon}
    sx={{ ...commonStyles.gradientButton, ...sx }}
  >
    {children}
  </Button>
);

/**
 * Gradient header box for sections
 */
export const GradientHeader: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ children, sx }) => (
  <Box sx={{ ...commonStyles.gradientHeader, p: 2, ...sx }}>{children}</Box>
);

/**
 * Semantic status box components
 */
export const SuccessBox: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ children, sx }) => (
  <Box sx={{ ...commonStyles.successBox, ...sx }}>{children}</Box>
);

export const ErrorBox: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ children, sx }) => (
  <Box sx={{ ...commonStyles.errorBox, ...sx }}>{children}</Box>
);

export const WarningBox: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ children, sx }) => (
  <Box sx={{ ...commonStyles.warningBox, ...sx }}>{children}</Box>
);

export const InfoBox: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ children, sx }) => (
  <Box sx={{ ...commonStyles.infoBox, ...sx }}>{children}</Box>
);

/**
 * Gradient text component
 */
export const GradientText: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  component?: React.ElementType;
}> = ({ children, sx, component: Component = "span" }) => (
  <Component sx={{ ...commonStyles.gradientText, ...sx }}>{children}</Component>
);

/**
 * Reusable stat card for displaying metrics
 */
export const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  gradient?: string;
  sx?: SxProps<Theme>;
}> = ({ title, value, icon, gradient = gradients.primary, sx }) => {
  const themedColors = useThemedColors();

  return (
    <Card
      sx={{
        ...commonStyles.glassCard,
        p: 3,
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        {icon && (
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              background: gradient,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ fontSize: "0.875rem", color: themedColors.textSecondary }}>
          {title}
        </Box>
      </Box>
      <Box
        sx={{
          fontSize: "1.75rem",
          fontWeight: 700,
          color: themedColors.textPrimary,
        }}
      >
        {value}
      </Box>
    </Card>
  );
};
