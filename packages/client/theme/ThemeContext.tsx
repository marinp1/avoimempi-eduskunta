import { ThemeProvider as MuiThemeProvider, type Theme } from "@mui/material";
import type React from "react";
import type { ReactNode } from "react";
import { colors, createLightTheme, gradients } from "./index";

/**
 * Get colors for light theme
 */
export const useThemedColors = () => {
  return {
    // Background colors
    backgroundDefault: colors.backgroundDefault,
    backgroundPaper: colors.backgroundPaper,
    backgroundSubtle: colors.backgroundSubtle,

    // Text colors
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textTertiary: colors.textTertiary,

    // Data colors
    dataHighlight: colors.dataHighlight,
    dataLabel: colors.dataLabel,
    dataBorder: colors.dataBorder,

    // Glass morphism
    glassBackground: colors.glassBackground,
    glassBorder: colors.glassBorder,

    // Gradients
    background: gradients.background,
    backgroundAlt: gradients.backgroundAlt,
    primaryGradient: gradients.primary,
    primaryHover: gradients.primaryHover,

    // Brand colors
    primary: colors.primary,
    primaryLight: colors.primaryLight,
    accent: colors.accent,
    accentLight: colors.accentLight,
    success: colors.success,
    successLight: colors.successLight,
    error: colors.error,
    errorLight: colors.errorLight,
    warning: colors.warning,
    warningLight: colors.warningLight,
    info: colors.info,
    infoLight: colors.infoLight,

    // Chart colors
    chartPurple: colors.chartPurple,
    chartBlue: colors.chartBlue,
    chartGray: colors.chartGray,

    // Role colors
    ministerColor: colors.ministerColor,
    ministerBackground: colors.ministerBackground,
    coalitionColor: colors.coalitionColor,
    coalitionBackground: colors.coalitionBackground,
    oppositionColor: colors.oppositionColor,
    oppositionBackground: colors.oppositionBackground,
  };
};

const theme: Theme = createLightTheme();

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
};
