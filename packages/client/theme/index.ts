import { createTheme, type Theme, type SxProps } from "@mui/material";

/**
 * Color palette for the application
 * Professional, official color scheme inspired by Finnish Parliament
 * Supports both light and dark modes
 */
export const colors = {
  // Brand colors - Deep blue for authority and trust (same for both modes)
  primary: "#003580",
  primaryLight: "#0052CC",
  primaryDark: "#002557",
  secondary: "#005EB8",
  secondaryLight: "#0078D4",
  secondaryDark: "#004A94",

  // Accent color for highlights
  accent: "#667eea",
  accentLight: "#8c9eff",

  // Semantic colors (same for both modes)
  success: "#2e7d32",
  successLight: "#4caf50",
  error: "#c62828",
  errorLight: "#ef5350",
  warning: "#ef6c00",
  warningLight: "#ff9800",
  info: "#0277bd",
  infoLight: "#03a9f4",
  neutral: "#616161",
  neutralLight: "#9e9e9e",

  // Chart colors for data visualization
  chartPurple: "#9C27B0",
  chartBlue: "#2196F3",
  chartGreen: "#4CAF50",
  chartOrange: "#FF9800",
  chartRed: "#F44336",
  chartPink: "#E91E63",
  chartCyan: "#00BCD4",
  chartTeal: "#009688",
  chartGray: "#9E9E9E",

  // Semantic role colors
  ministerColor: "#9c27b0",
  ministerBackground: "rgba(156, 39, 176, 0.2)",
  coalitionColor: "#2196f3",
  coalitionBackground: "rgba(33, 150, 243, 0.2)",
  oppositionColor: "#616161",
  oppositionBackground: "rgba(158, 158, 158, 0.2)",

  // LIGHT MODE COLORS
  // Background colors - Clean, professional
  backgroundDefault: "#f8f9fa",
  backgroundPaper: "#ffffff",
  backgroundGradientStart: "#f8f9fa",
  backgroundGradientEnd: "#e9ecef",
  backgroundSubtle: "#f0f2f5",

  // Glass-morphism colors
  glassBackground: "rgba(255,255,255,0.95)",
  glassBorder: "rgba(0,53,128,0.15)",
  glassBackdrop: "blur(24px)",

  // Text colors - High contrast for readability
  textPrimary: "#1a1a1a",
  textSecondary: "#606060",
  textTertiary: "#808080",

  // Data display colors
  dataHighlight: "#003580",
  dataLabel: "#606060",
  dataBorder: "#e0e0e0",

  // DARK MODE COLORS
  // Background colors - Deep, comfortable dark
  darkBackgroundDefault: "#121212",
  darkBackgroundPaper: "#1e1e1e",
  darkBackgroundGradientStart: "#1a1a1a",
  darkBackgroundGradientEnd: "#0a0a0a",
  darkBackgroundSubtle: "#2a2a2a",

  // Glass-morphism colors (dark)
  darkGlassBackground: "rgba(30,30,30,0.95)",
  darkGlassBorder: "rgba(102,126,234,0.25)",

  // Text colors - High contrast for dark mode
  darkTextPrimary: "#e0e0e0",
  darkTextSecondary: "#b0b0b0",
  darkTextTertiary: "#808080",

  // Data display colors (dark)
  darkDataHighlight: "#667eea",
  darkDataLabel: "#b0b0b0",
  darkDataBorder: "#3a3a3a",
} as const;

/**
 * Common gradients used throughout the app
 * Subtle, professional gradients
 */
export const gradients = {
  // Light mode gradients
  primary: "linear-gradient(135deg, #003580 0%, #005EB8 100%)",
  primaryHover: "linear-gradient(135deg, #002557 0%, #004A94 100%)",
  primarySubtle: "linear-gradient(135deg, #0052CC 0%, #0078D4 100%)",
  success: "linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)",
  accent: "linear-gradient(135deg, #667eea 0%, #8c9eff 100%)",
  background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
  backgroundAlt: "linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%)",

  // Dark mode gradients
  darkPrimary: "linear-gradient(135deg, #667eea 0%, #8c9eff 100%)",
  darkPrimaryHover: "linear-gradient(135deg, #5566d9 0%, #7a8eee 100%)",
  darkBackground: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
  darkBackgroundAlt: "linear-gradient(to bottom, #1e1e1e 0%, #121212 100%)",

  // Admin UI specific gradients (purple/pink)
  scraper: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  parser: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  migrator: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",

  // Semantic gradients
  danger: "linear-gradient(135deg, #f44336 0%, #e91e63 100%)",
  info: "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
  warning: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
} as const;

/**
 * Common spacing values (in px, based on 8px base unit)
 */
export const spacing = {
  xs: 1, // 8px
  sm: 2, // 16px
  md: 3, // 24px
  lg: 4, // 32px
  xl: 6, // 48px
} as const;

/**
 * Common border radius values
 */
export const borderRadius = {
  sm: 2, // 8px
  md: 3, // 12px (default)
  lg: 4, // 16px
} as const;

/**
 * Common shadow definitions
 * Subtle, professional shadows
 */
export const shadows = {
  card: "0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  cardHover: "0 4px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06)",
  elevated: "0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)",
  subtle: "0 1px 3px rgba(0,0,0,0.06)",
  inner: "inset 0 1px 3px rgba(0,0,0,0.08)",
  none: "none",
} as const;

/**
 * Animation durations (in ms)
 */
export const transitions = {
  fast: 200,
  normal: 300,
  slow: 500,
} as const;

/**
 * Common reusable sx prop styles
 */
export const commonStyles = {
  /**
   * Glass-morphism card style - refined for professional look
   */
  glassCard: {
    borderRadius: borderRadius.md,
    background: colors.glassBackground,
    backdropFilter: colors.glassBackdrop,
    border: `1px solid ${colors.glassBorder}`,
    boxShadow: shadows.card,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  } satisfies SxProps<Theme>,

  /**
   * Data card - optimized for displaying metrics
   */
  dataCard: {
    borderRadius: borderRadius.md,
    background: colors.backgroundPaper,
    border: `1px solid ${colors.dataBorder}`,
    boxShadow: shadows.card,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      boxShadow: shadows.cardHover,
      borderColor: colors.primary,
    },
  } satisfies SxProps<Theme>,

  /**
   * Gradient text with clipping
   */
  gradientText: {
    background: gradients.primary,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: 700,
  } satisfies SxProps<Theme>,

  /**
   * Gradient button
   */
  gradientButton: {
    background: gradients.primary,
    color: "white",
    fontWeight: 600,
    "&:hover": {
      background: gradients.primaryHover,
    },
  } satisfies SxProps<Theme>,

  /**
   * Interactive hover effect for cards/rows - refined for professional tables
   */
  interactiveHover: {
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    "&:hover": {
      background: "rgba(0, 53, 128, 0.04)",
      transform: "translateX(2px)",
    },
  } satisfies SxProps<Theme>,

  /**
   * Professional table row style
   */
  tableRow: {
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    borderBottom: `1px solid ${colors.dataBorder}`,
    "&:hover": {
      background: "rgba(0, 53, 128, 0.04)",
      boxShadow: shadows.subtle,
    },
    "&:last-child": {
      borderBottom: "none",
    },
  } satisfies SxProps<Theme>,

  /**
   * Table header style - professional and prominent
   */
  tableHeader: {
    background: gradients.primary,
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "0.875rem",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    borderBottom: "none",
    whiteSpace: "nowrap",
  } satisfies SxProps<Theme>,

  /**
   * Data cell style - optimized for readability
   */
  dataCell: {
    fontWeight: 600,
    fontSize: "1rem",
    color: colors.textPrimary,
    letterSpacing: "-0.01em",
  } satisfies SxProps<Theme>,

  /**
   * Label cell style
   */
  labelCell: {
    fontWeight: 500,
    fontSize: "0.875rem",
    color: colors.textSecondary,
  } satisfies SxProps<Theme>,

  /**
   * Semantic color box (success)
   */
  successBox: {
    background: "rgba(76, 175, 80, 0.1)",
    border: "1px solid rgba(76, 175, 80, 0.2)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  } satisfies SxProps<Theme>,

  /**
   * Semantic color box (error)
   */
  errorBox: {
    background: "rgba(244, 67, 54, 0.1)",
    border: "1px solid rgba(244, 67, 54, 0.2)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  } satisfies SxProps<Theme>,

  /**
   * Semantic color box (warning)
   */
  warningBox: {
    background: "rgba(255, 152, 0, 0.1)",
    border: "1px solid rgba(255, 152, 0, 0.2)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  } satisfies SxProps<Theme>,

  /**
   * Semantic color box (info)
   */
  infoBox: {
    background: "rgba(33, 150, 243, 0.1)",
    border: "1px solid rgba(33, 150, 243, 0.2)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  } satisfies SxProps<Theme>,

  /**
   * Styled text field
   */
  styledTextField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: borderRadius.md,
      background: "rgba(255,255,255,0.7)",
      transition: "all 0.3s ease",
      "&:hover": {
        background: "rgba(255,255,255,0.9)",
      },
      "&.Mui-focused": {
        background: "rgba(255,255,255,1)",
      },
    },
  } satisfies SxProps<Theme>,

  /**
   * Gradient header bar
   */
  gradientHeader: {
    background: gradients.primary,
    color: "white",
    borderRadius: `${borderRadius.md} ${borderRadius.md} 0 0`,
  } satisfies SxProps<Theme>,

  /**
   * Fade-in animation container
   */
  fadeIn: (delay: number = 0) =>
    ({
      animation: "fadeIn 0.5s ease-in-out",
      animationDelay: `${delay}ms`,
      animationFillMode: "both",
      "@keyframes fadeIn": {
        from: { opacity: 0, transform: "translateY(10px)" },
        to: { opacity: 1, transform: "translateY(0)" },
      },
    }) satisfies SxProps<Theme>,

  /**
   * Centered flex container
   */
  centeredFlex: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } satisfies SxProps<Theme>,

  /**
   * Flex container with gap
   */
  flexWithGap: (gap: number = spacing.sm) =>
    ({
      display: "flex",
      alignItems: "center",
      gap,
    }) satisfies SxProps<Theme>,

  /**
   * Responsive grid layout
   */
  responsiveGrid: (minWidth: number = 250) =>
    ({
      display: "grid",
      gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
      gap: spacing.sm,
    }) satisfies SxProps<Theme>,

  /**
   * Sticky table header
   */
  stickyTableHeader: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: gradients.primary,
  } satisfies SxProps<Theme>,
} as const;

/**
 * Helper function to get theme-aware colors based on mode
 */
export const getThemedColors = (mode: "light" | "dark") => ({
  backgroundDefault:
    mode === "dark" ? colors.darkBackgroundDefault : colors.backgroundDefault,
  backgroundPaper:
    mode === "dark" ? colors.darkBackgroundPaper : colors.backgroundPaper,
  backgroundSubtle:
    mode === "dark" ? colors.darkBackgroundSubtle : colors.backgroundSubtle,
  glassBackground:
    mode === "dark" ? colors.darkGlassBackground : colors.glassBackground,
  glassBorder: mode === "dark" ? colors.darkGlassBorder : colors.glassBorder,
  textPrimary: mode === "dark" ? colors.darkTextPrimary : colors.textPrimary,
  textSecondary:
    mode === "dark" ? colors.darkTextSecondary : colors.textSecondary,
  textTertiary: mode === "dark" ? colors.darkTextTertiary : colors.textTertiary,
  dataHighlight:
    mode === "dark" ? colors.darkDataHighlight : colors.dataHighlight,
  dataLabel: mode === "dark" ? colors.darkDataLabel : colors.dataLabel,
  dataBorder: mode === "dark" ? colors.darkDataBorder : colors.dataBorder,
  gradientPrimary: mode === "dark" ? gradients.darkPrimary : gradients.primary,
  gradientPrimaryHover:
    mode === "dark" ? gradients.darkPrimaryHover : gradients.primaryHover,
  gradientBackground:
    mode === "dark" ? gradients.darkBackground : gradients.background,
  gradientBackgroundAlt:
    mode === "dark" ? gradients.darkBackgroundAlt : gradients.backgroundAlt,
});

/**
 * MUI theme configuration
 * Professional design system for data-driven application
 */
export const createThemeWithMode = (mode: "light" | "dark" = "light") => {
  const themedColors = getThemedColors(mode);

  return createTheme({
    palette: {
      primary: {
        main: colors.primary,
        light: colors.primaryLight,
        dark: colors.primaryDark,
      },
      secondary: {
        main: colors.secondary,
        light: colors.secondaryLight,
        dark: colors.secondaryDark,
      },
      success: {
        main: colors.success,
        light: colors.successLight,
      },
      error: {
        main: colors.error,
        light: colors.errorLight,
      },
      warning: {
        main: colors.warning,
        light: colors.warningLight,
      },
      info: {
        main: colors.info,
        light: colors.infoLight,
      },
      background: {
        default: themedColors.backgroundDefault,
        paper: themedColors.backgroundPaper,
      },
      text: {
        primary: themedColors.textPrimary,
        secondary: themedColors.textSecondary,
      },
      mode,
    },
    typography: {
      fontFamily:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
      // Headings - professional and authoritative
      h1: {
        fontWeight: 700,
        fontSize: "3rem",
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
      },
      h2: {
        fontWeight: 700,
        fontSize: "2.5rem",
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
      },
      h3: {
        fontWeight: 700,
        fontSize: "2rem",
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
      },
      h4: {
        fontWeight: 700,
        fontSize: "1.75rem",
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
      },
      h5: {
        fontWeight: 600,
        fontSize: "1.5rem",
        letterSpacing: "-0.005em",
        lineHeight: 1.4,
      },
      h6: {
        fontWeight: 600,
        fontSize: "1.25rem",
        letterSpacing: "0",
        lineHeight: 1.4,
      },
      // Body text - optimized for readability
      body1: {
        fontSize: "1rem",
        lineHeight: 1.6,
        letterSpacing: "0",
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.6,
        letterSpacing: "0",
      },
      // Data display - prominent and clear
      subtitle1: {
        fontSize: "1rem",
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: "0",
      },
      subtitle2: {
        fontSize: "0.875rem",
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: "0.01em",
      },
      // Small text
      caption: {
        fontSize: "0.75rem",
        lineHeight: 1.4,
        letterSpacing: "0.02em",
        color: colors.textSecondary,
      },
      // Buttons
      button: {
        textTransform: "none",
        fontWeight: 600,
        fontSize: "0.875rem",
        letterSpacing: "0.02em",
      },
    },
    shape: {
      borderRadius: 12, // Default border radius (corresponds to borderRadius.md)
    },
    components: {
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${themedColors.dataBorder}`,
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            borderRadius: 8,
            padding: "10px 24px",
            boxShadow: "none",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              boxShadow: shadows.subtle,
            },
          },
          contained: {
            "&:hover": {
              boxShadow: shadows.card,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${themedColors.dataBorder}`,
            padding: "16px",
          },
          head: {
            fontWeight: 700,
            fontSize: "0.875rem",
            letterSpacing: "0.5px",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 12,
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.primary,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderWidth: "2px",
                borderColor: colors.primary,
              },
            },
          },
        },
      },
    },
  });
};

// Default theme (light mode)
export const theme = createThemeWithMode("light");

export default theme;
