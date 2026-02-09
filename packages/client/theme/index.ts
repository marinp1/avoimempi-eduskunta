import { createTheme, type SxProps, type Theme } from "@mui/material";

/**
 * Color palette for the application
 * Professional, official government color scheme
 * Inspired by Finnish Parliament and official government websites
 */
export const colors = {
  // Brand colors - Official government blue (based on Finnish national colors)
  primary: "#003580", // Deep navy blue - authority, trust, stability
  primaryLight: "#1a4d99",
  primaryDark: "#001f4d",
  secondary: "#003580", // Keep consistent with primary for formal look
  secondaryLight: "#1a4d99",
  secondaryDark: "#001f4d",

  // Accent color - subtle, professional
  accent: "#005A9C", // Muted blue for highlights
  accentLight: "#1976D2",

  // Semantic colors - professional and clear
  success: "#1B5E20", // Dark green for success/completion
  successLight: "#2E7D32",
  error: "#B71C1C", // Dark red for errors
  errorLight: "#C62828",
  warning: "#E65100", // Dark orange for warnings
  warningLight: "#EF6C00",
  info: "#01579B", // Dark blue for information
  infoLight: "#0277BD",
  neutral: "#424242", // Dark gray for neutral states
  neutralLight: "#757575",

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

  // Background colors - Clean, minimal, professional
  backgroundDefault: "#FAFAFA", // Very light gray, not pure white
  backgroundPaper: "#FFFFFF",
  backgroundGradientStart: "#FAFAFA",
  backgroundGradientEnd: "#F5F5F5",
  backgroundSubtle: "#F5F5F5", // Slightly darker for sections

  // Glass-morphism colors (minimal use for government style)
  glassBackground: "rgba(255,255,255,0.98)",
  glassBorder: "rgba(0,53,128,0.12)",
  glassBackdrop: "blur(16px)",

  // Text colors - High contrast, clear hierarchy
  textPrimary: "#212121", // Near black for main content
  textSecondary: "#616161", // Medium gray for secondary
  textTertiary: "#9E9E9E", // Light gray for tertiary

  // Data display colors
  dataHighlight: "#003580",
  dataLabel: "#616161",
  dataBorder: "#E0E0E0",
} as const;

/**
 * Common gradients used throughout the app
 * Minimal, professional gradients for government style
 * Use solid colors where possible, gradients only for emphasis
 */
export const gradients = {
  // Light mode gradients - subtle, professional
  primary: "linear-gradient(180deg, #003580 0%, #002557 100%)", // Vertical gradient, more formal
  primaryHover: "linear-gradient(180deg, #002557 0%, #001f4d 100%)",
  primarySubtle: "linear-gradient(180deg, #1a4d99 0%, #003580 100%)",
  success: "linear-gradient(180deg, #1B5E20 0%, #2E7D32 100%)",
  accent: "linear-gradient(180deg, #005A9C 0%, #1976D2 100%)",
  background: "linear-gradient(180deg, #FAFAFA 0%, #F5F5F5 100%)",
  backgroundAlt: "linear-gradient(to bottom, #FFFFFF 0%, #FAFAFA 100%)",

  // Admin UI specific gradients - more subdued
  scraper: "linear-gradient(180deg, #1976D2 0%, #0D47A1 100%)", // Blue theme
  parser: "linear-gradient(180deg, #7B1FA2 0%, #4A148C 100%)", // Purple theme
  migrator: "linear-gradient(180deg, #1B5E20 0%, #2E7D32 100%)", // Green theme

  // Semantic gradients - minimal
  danger: "linear-gradient(180deg, #B71C1C 0%, #C62828 100%)",
  info: "linear-gradient(180deg, #01579B 0%, #0277BD 100%)",
  warning: "linear-gradient(180deg, #E65100 0%, #EF6C00 100%)",
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
 * Conservative values for government-style design
 */
export const borderRadius = {
  sm: 1, // 4px - minimal rounding
  md: 1, // 4px (default) - consistent, professional
  lg: 2, // 8px - slightly rounded for larger elements
} as const;

/**
 * Common shadow definitions
 * Minimal, professional shadows for government style
 */
export const shadows = {
  card: "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)", // More defined, less blur
  cardHover: "0 2px 6px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
  elevated: "0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
  subtle: "0 1px 2px rgba(0,0,0,0.08)",
  inner: "inset 0 1px 2px rgba(0,0,0,0.10)",
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
   * Glass-morphism card style - minimal for government look
   */
  glassCard: {
    borderRadius: borderRadius.md,
    background: colors.glassBackground,
    backdropFilter: colors.glassBackdrop,
    border: `1px solid ${colors.glassBorder}`,
    boxShadow: shadows.card,
    transition: "all 0.2s ease-in-out",
  } satisfies SxProps<Theme>,

  /**
   * Data card - clean, professional styling
   */
  dataCard: {
    borderRadius: borderRadius.md,
    background: colors.backgroundPaper,
    border: `1px solid ${colors.dataBorder}`,
    boxShadow: shadows.card,
    transition: "all 0.2s ease-in-out",
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
   * Interactive hover effect for cards/rows - subtle for government style
   */
  interactiveHover: {
    transition: "all 0.2s ease-in-out",
    cursor: "pointer",
    "&:hover": {
      boxShadow: shadows.subtle,
    },
  } satisfies SxProps<Theme>,

  /**
   * Professional table row style - clean and minimal
   */
  tableRow: {
    transition: "all 0.2s ease-in-out",
    cursor: "pointer",
    "&:last-child": {
      borderBottom: "none",
    },
  } satisfies SxProps<Theme>,

  /**
   * Table header style - formal government style
   */
  tableHeader: {
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.875rem",
    letterSpacing: "0.03em",
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
    letterSpacing: "-0.01em",
  } satisfies SxProps<Theme>,

  /**
   * Label cell style
   */
  labelCell: {
    fontWeight: 500,
    fontSize: "0.875rem",
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
   * Gradient header bar - formal style
   */
  gradientHeader: {
    background: gradients.primary,
    color: "white",
    borderRadius: `${borderRadius.md}px ${borderRadius.md}px 0 0`,
  } satisfies SxProps<Theme>,

  /**
   * Fade-in animation container - subtle for government style
   */
  fadeIn: (delay: number = 0) =>
    ({
      animation: "fadeIn 0.4s ease-out",
      animationDelay: `${delay}ms`,
      animationFillMode: "both",
      "@keyframes fadeIn": {
        from: { opacity: 0, transform: "translateY(6px)" },
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
 * MUI theme configuration
 * Professional design system for data-driven application
 */
export const createLightTheme = () => {
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
        default: colors.backgroundDefault,
        paper: colors.backgroundPaper,
      },
      text: {
        primary: colors.textPrimary,
        secondary: colors.textSecondary,
      },
      mode: "light",
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif', // More formal, widely used in government sites
      // Headings - formal, clear hierarchy
      h1: {
        fontWeight: 700,
        fontSize: "2.5rem",
        letterSpacing: "-0.01em",
        lineHeight: 1.2,
        color: colors.textPrimary,
      },
      h2: {
        fontWeight: 700,
        fontSize: "2rem",
        letterSpacing: "-0.01em",
        lineHeight: 1.25,
        color: colors.textPrimary,
      },
      h3: {
        fontWeight: 600,
        fontSize: "1.75rem",
        letterSpacing: "0",
        lineHeight: 1.3,
        color: colors.textPrimary,
      },
      h4: {
        fontWeight: 600,
        fontSize: "1.5rem",
        letterSpacing: "0",
        lineHeight: 1.35,
        color: colors.textPrimary,
      },
      h5: {
        fontWeight: 600,
        fontSize: "1.25rem",
        letterSpacing: "0",
        lineHeight: 1.4,
        color: colors.textPrimary,
      },
      h6: {
        fontWeight: 600,
        fontSize: "1.125rem",
        letterSpacing: "0",
        lineHeight: 1.4,
        color: colors.textPrimary,
      },
      // Body text - clear, readable
      body1: {
        fontSize: "1rem",
        lineHeight: 1.6,
        letterSpacing: "0.01em",
        color: colors.textPrimary,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.6,
        letterSpacing: "0.01em",
        color: colors.textSecondary,
      },
      // Data display - clear and prominent
      subtitle1: {
        fontSize: "1rem",
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: "0.01em",
      },
      subtitle2: {
        fontSize: "0.875rem",
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: "0.01em",
      },
      // Small text
      caption: {
        fontSize: "0.75rem",
        lineHeight: 1.5,
        letterSpacing: "0.02em",
        color: colors.textTertiary,
      },
      // Buttons - clear, professional
      button: {
        textTransform: "none",
        fontWeight: 500,
        fontSize: "0.9375rem",
        letterSpacing: "0.02em",
      },
    },
    shape: {
      borderRadius: 4, // More conservative border radius for government style
    },
    components: {
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 4,
            border: `1px solid ${colors.dataBorder}`,
            boxShadow: shadows.card,
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
            borderRadius: 4,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            borderRadius: 4,
            padding: "8px 20px",
            boxShadow: "none",
            transition: "all 0.2s ease-in-out",
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
            fontWeight: 500,
            borderRadius: 4,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${colors.dataBorder}`,
            padding: "14px 16px",
          },
          head: {
            fontWeight: 600,
            fontSize: "0.875rem",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 4,
              transition: "all 0.2s ease-in-out",
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
export const theme = createLightTheme();

export default theme;
