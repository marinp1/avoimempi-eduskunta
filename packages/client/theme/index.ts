import { createTheme, type SxProps, type Theme } from "@mui/material";

/**
 * Color palette - Nordic minimal design system
 * Clean, spacious, flat design with subtle borders over shadows
 */
export const colors = {
  // Brand colors - Dark slate primary
  primary: "#1B2A4A",
  primaryLight: "#4A6FA5",
  primaryDark: "#0F1B33",
  secondary: "#4A6FA5",
  secondaryLight: "#6B8FC5",
  secondaryDark: "#2E4F7A",

  // Accent - amber, used sparingly
  accent: "#E8913A",
  accentLight: "#F0A85C",

  // Semantic colors
  success: "#1B7D3A",
  successLight: "#2E9E50",
  error: "#C13030",
  errorLight: "#D04848",
  warning: "#D97706",
  warningLight: "#E89220",
  info: "#2563EB",
  infoLight: "#3B82F6",
  neutral: "#64748B",
  neutralLight: "#94A3B8",

  // Chart colors
  chartPurple: "#8B5CF6",
  chartBlue: "#3B82F6",
  chartGreen: "#22C55E",
  chartOrange: "#F59E0B",
  chartRed: "#EF4444",
  chartPink: "#EC4899",
  chartCyan: "#06B6D4",
  chartTeal: "#14B8A6",
  chartGray: "#94A3B8",

  // Semantic role colors
  ministerColor: "#8B5CF6",
  ministerBackground: "rgba(139, 92, 246, 0.1)",
  coalitionColor: "#3B82F6",
  coalitionBackground: "rgba(59, 130, 246, 0.1)",
  oppositionColor: "#64748B",
  oppositionBackground: "rgba(100, 116, 139, 0.1)",

  // Background colors - Nordic clean
  backgroundDefault: "#FAFBFC",
  backgroundPaper: "#FFFFFF",
  backgroundGradientStart: "#FAFBFC",
  backgroundGradientEnd: "#F3F5F7",
  backgroundSubtle: "#F3F5F7",

  // Glass-morphism (kept for backwards compat, but de-emphasized)
  glassBackground: "rgba(255,255,255,0.98)",
  glassBorder: "rgba(27,42,74,0.08)",
  glassBackdrop: "blur(16px)",

  // Text colors - Clear hierarchy
  textPrimary: "#1A1A2E",
  textSecondary: "#5A5A72",
  textTertiary: "#9A9AB0",

  // Data display
  dataHighlight: "#1B2A4A",
  dataLabel: "#5A5A72",
  dataBorder: "#E2E8F0",
} as const;

/**
 * Gradients - minimal, used sparingly in Nordic design
 */
export const gradients = {
  primary: "#1B2A4A",
  primaryHover: "#0F1B33",
  primarySubtle: "linear-gradient(180deg, #4A6FA5 0%, #1B2A4A 100%)",
  success: "linear-gradient(180deg, #1B7D3A 0%, #2E9E50 100%)",
  accent: "linear-gradient(180deg, #E8913A 0%, #F0A85C 100%)",
  background: `linear-gradient(180deg, ${colors.backgroundDefault} 0%, ${colors.backgroundSubtle} 100%)`,
  backgroundAlt: `linear-gradient(to bottom, #FFFFFF 0%, ${colors.backgroundDefault} 100%)`,

  // Admin UI specific
  scraper: "linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)",
  parser: "linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%)",
  migrator: "linear-gradient(180deg, #1B7D3A 0%, #2E9E50 100%)",

  // Semantic
  danger: "linear-gradient(180deg, #C13030 0%, #D04848 100%)",
  info: "linear-gradient(180deg, #2563EB 0%, #3B82F6 100%)",
  warning: "linear-gradient(180deg, #D97706 0%, #E89220 100%)",
} as const;

/**
 * Spacing (in MUI spacing units, 1 = 8px)
 */
export const spacing = {
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
} as const;

/**
 * Border radius - spacious Nordic feel
 */
export const borderRadius = {
  sm: 1, // 8px
  md: 1.5, // 12px
  lg: 2, // 16px
} as const;

/**
 * Shadows - extremely subtle
 */
export const shadows = {
  card: "0 1px 2px rgba(0,0,0,0.05)",
  cardHover: "0 2px 8px rgba(0,0,0,0.08)",
  elevated: "0 4px 12px rgba(0,0,0,0.08)",
  subtle: "0 1px 2px rgba(0,0,0,0.04)",
  inner: "inset 0 1px 2px rgba(0,0,0,0.06)",
  none: "none",
} as const;

/**
 * Animation durations (in ms)
 */
export const transitions = {
  fast: 150,
  normal: 250,
  slow: 400,
  extraSlow: 900,
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "cubic-bezier(0.22, 1, 0.36, 1)",
    smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
} as const;

/**
 * Common reusable sx prop styles
 */
export const commonStyles = {
  /**
   * Glass-morphism card style (deprecated - use dataCard instead)
   */
  glassCard: {
    borderRadius: borderRadius.md,
    background: colors.backgroundPaper,
    border: `1px solid ${colors.dataBorder}`,
    boxShadow: shadows.card,
    transition: `box-shadow ${transitions.normal}ms ${transitions.easing.standard}, border-color ${transitions.normal}ms ${transitions.easing.standard}`,
  } satisfies SxProps<Theme>,

  /**
   * Data card - clean, flat styling with 1px border
   */
  dataCard: {
    borderRadius: borderRadius.md,
    background: colors.backgroundPaper,
    border: `1px solid ${colors.dataBorder}`,
    boxShadow: shadows.card,
    transition: `transform ${transitions.normal}ms ${transitions.easing.smooth}, box-shadow ${transitions.normal}ms ${transitions.easing.standard}, border-color ${transitions.normal}ms ${transitions.easing.standard}`,
    willChange: "transform, box-shadow",
    "@media (hover: hover) and (pointer: fine)": {
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: shadows.cardHover,
        borderColor: colors.primaryLight,
      },
    },
  } satisfies SxProps<Theme>,

  /**
   * Gradient text with clipping
   */
  gradientText: {
    color: colors.primary,
    fontWeight: 700,
  } satisfies SxProps<Theme>,

  /**
   * Primary button style
   */
  gradientButton: {
    background: colors.primary,
    color: "white",
    fontWeight: 500,
    transition: `transform ${transitions.fast}ms ${transitions.easing.standard}, background-color ${transitions.fast}ms ${transitions.easing.standard}`,
    "@media (hover: hover) and (pointer: fine)": {
      "&:hover": {
        transform: "translateY(-1px)",
      },
    },
    "&:hover": {
      background: colors.primaryDark,
    },
    "&:active": {
      transform: "translateY(0)",
    },
  } satisfies SxProps<Theme>,

  /**
   * Compact action button for dense table/card controls
   */
  compactActionButton: {
    minWidth: 0,
    px: 1,
    fontSize: "0.68rem",
    textTransform: "none",
  } satisfies SxProps<Theme>,

  /**
   * Compact inline text button for snippet expand/collapse controls
   */
  compactInlineTextButton: {
    mt: 0.25,
    minWidth: 0,
    px: 0,
    fontSize: "0.68rem",
    textTransform: "none",
  } satisfies SxProps<Theme>,

  /**
   * Compact outlined action in primary color
   */
  compactOutlinedPrimaryButton: {
    textTransform: "none",
    borderColor: colors.primaryLight,
    color: colors.primaryLight,
    fontSize: "0.75rem",
  } satisfies SxProps<Theme>,

  /**
   * Compact chip sizes used in dense data views
   */
  compactChipXs: {
    height: 18,
    fontSize: "0.625rem",
  } satisfies SxProps<Theme>,

  compactChipSm: {
    height: 20,
    fontSize: "0.65rem",
  } satisfies SxProps<Theme>,

  compactChipMd: {
    height: 22,
    fontSize: "0.6875rem",
  } satisfies SxProps<Theme>,

  /**
   * Compact text sizes used in dense data views
   */
  compactTextXs: {
    fontSize: "0.65rem",
  } satisfies SxProps<Theme>,

  compactTextSm: {
    fontSize: "0.68rem",
  } satisfies SxProps<Theme>,

  compactTextMd: {
    fontSize: "0.7rem",
  } satisfies SxProps<Theme>,

  compactTextLg: {
    fontSize: "0.75rem",
  } satisfies SxProps<Theme>,

  /**
   * Interactive hover effect
   */
  interactiveHover: {
    transition: `transform ${transitions.normal}ms ${transitions.easing.smooth}, box-shadow ${transitions.normal}ms ${transitions.easing.standard}`,
    cursor: "pointer",
    "@media (hover: hover) and (pointer: fine)": {
      "&:hover": {
        transform: "translateY(-1px)",
        boxShadow: shadows.subtle,
      },
    },
  } satisfies SxProps<Theme>,

  /**
   * Table row style
   */
  tableRow: {
    transition: `background-color ${transitions.fast}ms ${transitions.easing.standard}`,
    cursor: "pointer",
    "&:hover": {
      background: `${colors.primary}04`,
    },
    "&:last-child": {
      borderBottom: "none",
    },
  } satisfies SxProps<Theme>,

  /**
   * Table header style
   */
  tableHeader: {
    color: "#ffffff",
    fontWeight: 600,
    fontSize: "0.8125rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: "none",
    whiteSpace: "nowrap",
  } satisfies SxProps<Theme>,

  /**
   * Data cell style
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
   * Semantic color boxes
   */
  successBox: {
    background: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  } satisfies SxProps<Theme>,

  errorBox: {
    background: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  } satisfies SxProps<Theme>,

  warningBox: {
    background: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(245, 158, 11, 0.2)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  } satisfies SxProps<Theme>,

  infoBox: {
    background: "rgba(59, 130, 246, 0.08)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  } satisfies SxProps<Theme>,

  /**
   * Styled text field
   */
  styledTextField: {
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      background: colors.backgroundPaper,
      transition: "all 0.2s ease",
      "&:hover": {
        background: colors.backgroundPaper,
      },
      "&.Mui-focused": {
        background: colors.backgroundPaper,
      },
    },
  } satisfies SxProps<Theme>,

  /**
   * Header bar
   */
  gradientHeader: {
    background: colors.primary,
    color: "white",
    borderRadius: `12px 12px 0 0`,
  } satisfies SxProps<Theme>,

  /**
   * Fade-in animation
   */
  fadeIn: (delay: number = 0) =>
    ({
      animation: `fadeIn ${transitions.normal}ms ${transitions.easing.emphasized}`,
      animationDelay: `${delay}ms`,
      animationFillMode: "both",
      "@keyframes fadeIn": {
        from: { opacity: 0, transform: "translateY(4px)" },
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
    background: colors.primary,
  } satisfies SxProps<Theme>,
} as const;

/**
 * MUI theme - Nordic minimal design system
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
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: "2.25rem",
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
        color: colors.textPrimary,
      },
      h2: {
        fontWeight: 700,
        fontSize: "1.875rem",
        letterSpacing: "-0.02em",
        lineHeight: 1.25,
        color: colors.textPrimary,
      },
      h3: {
        fontWeight: 600,
        fontSize: "1.5rem",
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
        color: colors.textPrimary,
      },
      h4: {
        fontWeight: 600,
        fontSize: "1.25rem",
        letterSpacing: "-0.01em",
        lineHeight: 1.35,
        color: colors.textPrimary,
      },
      h5: {
        fontWeight: 600,
        fontSize: "1.125rem",
        letterSpacing: "-0.01em",
        lineHeight: 1.4,
        color: colors.textPrimary,
      },
      h6: {
        fontWeight: 600,
        fontSize: "1rem",
        letterSpacing: "0",
        lineHeight: 1.4,
        color: colors.textPrimary,
      },
      body1: {
        fontSize: "0.9375rem",
        lineHeight: 1.6,
        letterSpacing: "0",
        color: colors.textPrimary,
      },
      body2: {
        fontSize: "0.8125rem",
        lineHeight: 1.6,
        letterSpacing: "0",
        color: colors.textSecondary,
      },
      subtitle1: {
        fontSize: "0.9375rem",
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: "0",
      },
      subtitle2: {
        fontSize: "0.8125rem",
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: "0",
      },
      caption: {
        fontSize: "0.75rem",
        lineHeight: 1.5,
        letterSpacing: "0.01em",
        color: colors.textTertiary,
      },
      button: {
        textTransform: "none",
        fontWeight: 500,
        fontSize: "0.875rem",
        letterSpacing: "0.01em",
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${colors.dataBorder}`,
            boxShadow: shadows.card,
            transition: `box-shadow ${transitions.normal}ms ${transitions.easing.standard}, border-color ${transitions.normal}ms ${transitions.easing.standard}`,
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
            borderRadius: 12,
            transition: `box-shadow ${transitions.normal}ms ${transitions.easing.standard}, border-color ${transitions.normal}ms ${transitions.easing.standard}, background-color ${transitions.normal}ms ${transitions.easing.standard}`,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
            borderRadius: 8,
            padding: "8px 20px",
            boxShadow: "none",
            transition: `transform ${transitions.fast}ms ${transitions.easing.standard}, background-color ${transitions.fast}ms ${transitions.easing.standard}, border-color ${transitions.fast}ms ${transitions.easing.standard}, color ${transitions.fast}ms ${transitions.easing.standard}`,
            "@media (hover: hover) and (pointer: fine)": {
              "&:hover": {
                transform: "translateY(-1px)",
              },
            },
            "&:active": {
              transform: "translateY(0)",
            },
            "&:hover": {
              boxShadow: "none",
            },
          },
          contained: {
            "&:hover": {
              boxShadow: "none",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            borderRadius: 6,
            transition: `transform ${transitions.fast}ms ${transitions.easing.standard}, background-color ${transitions.fast}ms ${transitions.easing.standard}`,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${colors.dataBorder}`,
            padding: "12px 16px",
          },
          head: {
            fontWeight: 600,
            fontSize: "0.8125rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-root": {
              borderRadius: 8,
              transition: "all 0.15s ease-in-out",
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: colors.primaryLight,
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

export const theme = createLightTheme();

export default theme;
