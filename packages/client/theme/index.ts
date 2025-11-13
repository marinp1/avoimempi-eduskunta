import { createTheme, type Theme, type SxProps } from "@mui/material";

/**
 * Color palette for the application
 */
export const colors = {
  // Brand colors
  primary: "#667eea",
  primaryDark: "#5568d3",
  secondary: "#764ba2",
  secondaryDark: "#63408d",

  // Semantic colors
  success: "#4caf50",
  successLight: "#81c784",
  error: "#f44336",
  errorLight: "#e57373",
  warning: "#ff9800",
  warningLight: "#ffb74d",
  info: "#2196f3",
  infoLight: "#64b5f6",
  neutral: "#9e9e9e",
  neutralLight: "#bdbdbd",

  // Background colors
  backgroundDefault: "#f5f7fa",
  backgroundPaper: "#ffffff",
  backgroundGradientStart: "#f5f7fa",
  backgroundGradientEnd: "#c3cfe2",

  // Glass-morphism colors
  glassBackground: "rgba(255,255,255,0.9)",
  glassBorder: "rgba(255,255,255,0.6)",
  glassBackdrop: "blur(20px)",

  // Text colors
  textPrimary: "#212121",
  textSecondary: "#757575",
} as const;

/**
 * Common gradients used throughout the app
 */
export const gradients = {
  primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  primaryHover: "linear-gradient(135deg, #5568d3 0%, #63408d 100%)",
  success: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  accent: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
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
 */
export const shadows = {
  card: "0 8px 24px rgba(0,0,0,0.12)",
  cardHover: "0 12px 32px rgba(0,0,0,0.16)",
  subtle: "0 4px 12px rgba(0,0,0,0.1)",
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
   * Glass-morphism card style
   */
  glassCard: {
    borderRadius: borderRadius.md,
    background: colors.glassBackground,
    backdropFilter: colors.glassBackdrop,
    border: `1px solid ${colors.glassBorder}`,
    boxShadow: shadows.card,
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
   * Interactive hover effect for cards/rows
   */
  interactiveHover: {
    transition: "all 0.2s ease",
    cursor: "pointer",
    "&:hover": {
      background: "rgba(102, 126, 234, 0.05)",
      transform: "scale(1.005)",
    },
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
 * MUI theme configuration
 */
export const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      dark: colors.primaryDark,
    },
    secondary: {
      main: colors.secondary,
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
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.5px",
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
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
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
