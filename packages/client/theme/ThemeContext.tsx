import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { ThemeProvider as MuiThemeProvider, type Theme } from "@mui/material";
import { createThemeWithMode, colors, gradients } from "./index";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  theme: Theme;
  isDark: boolean;
}

/**
 * Get theme-aware colors based on current mode
 */
export const useThemedColors = () => {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  return {
    // Background colors
    backgroundDefault: isDark
      ? colors.darkBackgroundDefault
      : colors.backgroundDefault,
    backgroundPaper: isDark
      ? colors.darkBackgroundPaper
      : colors.backgroundPaper,
    backgroundSubtle: isDark
      ? colors.darkBackgroundSubtle
      : colors.backgroundSubtle,

    // Text colors
    textPrimary: isDark ? colors.darkTextPrimary : colors.textPrimary,
    textSecondary: isDark ? colors.darkTextSecondary : colors.textSecondary,
    textTertiary: isDark ? colors.darkTextTertiary : colors.textTertiary,

    // Data colors
    dataHighlight: isDark ? colors.darkDataHighlight : colors.dataHighlight,
    dataLabel: isDark ? colors.darkDataLabel : colors.dataLabel,
    dataBorder: isDark ? colors.darkDataBorder : colors.dataBorder,

    // Glass morphism
    glassBackground: isDark
      ? colors.darkGlassBackground
      : colors.glassBackground,
    glassBorder: isDark ? colors.darkGlassBorder : colors.glassBorder,

    // Gradients
    background: isDark ? gradients.darkBackground : gradients.background,
    backgroundAlt: isDark
      ? gradients.darkBackgroundAlt
      : gradients.backgroundAlt,
    primary: isDark ? gradients.darkPrimary : gradients.primary,
    primaryHover: isDark ? gradients.darkPrimaryHover : gradients.primaryHover,

    // Brand colors (don't change with theme)
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
  };
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "eduskunta-theme-mode";

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme from localStorage or system preference
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }

    // Fall back to system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }

    return "light";
  });

  const [theme, setTheme] = useState<Theme>(() => createThemeWithMode(mode));

  // Update theme when mode changes
  useEffect(() => {
    setTheme(createThemeWithMode(mode));
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        setMode(e.matches ? "dark" : "light");
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const toggleTheme = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const value: ThemeContextType = {
    mode,
    toggleTheme,
    theme,
    isDark: mode === "dark",
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
