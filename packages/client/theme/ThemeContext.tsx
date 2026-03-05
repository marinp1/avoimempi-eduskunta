import { ThemeProvider as MuiThemeProvider, type Theme } from "@mui/material";
import type React from "react";
import type { ReactNode } from "react";
import { colors, createLightTheme, gradients } from "./index";

/**
 * Get colors for the current theme
 */
export const useThemedColors = () => {
  return {
    // Background colors
    backgroundPaper: colors.backgroundPaper,
    backgroundSubtle: colors.backgroundSubtle,

    // Text colors
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textTertiary: colors.textTertiary,

    // Data colors
    dataBorder: colors.dataBorder,

    // Gradients
    primaryGradient: gradients.primary,

    // Brand colors
    primary: colors.primary,
    accent: colors.accent,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,

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
