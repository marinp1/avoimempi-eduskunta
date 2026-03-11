import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Card,
  CircularProgress,
  IconButton,
  Skeleton,
  Stack,
  useMediaQuery,
  useTheme,
  type SxProps,
  type Theme,
  Typography,
} from "@mui/material";
import type React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { borderRadius, colors, commonStyles } from "./index";
import { useThemedColors } from "./ThemeContext";

/**
 * DataCard - flat white card with 1px border, no backdrop-filter
 */
export const DataCard: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
}> = ({ children, sx, className }) => (
  <Card className={className} sx={{ ...commonStyles.dataCard, ...sx }}>
    {children}
  </Card>
);

/**
 * PageIntro - shared page and panel intro shell
 */
export const PageIntro: React.FC<{
  title: string;
  subtitle?: string;
  summary?: React.ReactNode;
  eyebrow?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  utility?: React.ReactNode;
  chips?: React.ReactNode;
  meta?: React.ReactNode;
  stats?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "feature";
  mobileMode?: "compact" | "immersive";
  mobileSummary?: React.ReactNode;
  mobileAnchorId?: string;
  mobileCtaLabel?: string;
  mobileCtaHref?: string;
  mobileStatsPlacement?: "inline" | "footer" | "hidden";
  sx?: SxProps<Theme>;
}> = ({
  title,
  subtitle,
  summary,
  eyebrow,
  icon,
  actions,
  utility,
  chips,
  meta,
  stats,
  footer,
  variant = "default",
  mobileMode = "compact",
  mobileSummary,
  mobileAnchorId,
  mobileStatsPlacement = "inline",
  sx,
}) => {
  const tc = useThemedColors();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isFeature = variant === "feature";
  const isImmersiveMobile = isMobile && mobileMode === "immersive";
  const heroOuterRadius = `${borderRadius.heroOuter * 8}px`;
  const heroInnerRadius = `${borderRadius.heroInner * 8}px`;
  const showInlineStats = Boolean(
    stats &&
      (!isImmersiveMobile ||
        mobileStatsPlacement === "inline"),
  );
  const showFooterStats = Boolean(
    stats && isImmersiveMobile && mobileStatsPlacement === "footer",
  );
  const supportContent =
    chips || meta ? (
      <Stack spacing={1}>
        {chips ? <Box>{chips}</Box> : null}
        {meta ? <Box>{meta}</Box> : null}
      </Stack>
    ) : null;
  const hasSupportRail = Boolean(supportContent || showInlineStats);

  return (
    <>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: { xs: 0, sm: heroOuterRadius },
          border: `1px solid ${tc.dataBorder}`,
          background: isFeature
            ? "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(244,247,250,0.98) 52%, rgba(239,243,248,0.97) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(247,249,251,0.98) 100%)",
          boxShadow: isFeature
            ? "0 16px 32px rgba(15, 27, 51, 0.07)"
            : "0 10px 22px rgba(15, 27, 51, 0.05)",
          px: { xs: 2, md: 3.25 },
          py: { xs: isImmersiveMobile ? 2 : 1.5, md: 2.75 },
          mb: showFooterStats ? 1.5 : 3,
          minHeight: isImmersiveMobile
            ? "calc(100dvh - 48px - 56px - 32px - env(safe-area-inset-bottom, 0px))"
            : "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: isImmersiveMobile ? "space-between" : "flex-start",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            width: isFeature ? { xs: 132, md: 188 } : { xs: 104, md: 136 },
            height: 4,
            borderBottomRightRadius: 999,
            background: isFeature
              ? `linear-gradient(90deg, ${colors.primary} 0%, ${colors.primaryLight} 68%, ${colors.accent} 100%)`
              : `linear-gradient(90deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
            opacity: isFeature ? 0.95 : 0.82,
            zIndex: 1,
          },
          ...sx,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: isFeature
              ? "radial-gradient(620px 240px at 0% 0%, rgba(74,111,165,0.12), transparent 66%), radial-gradient(540px 260px at 100% 0%, rgba(232,145,58,0.10), transparent 72%), linear-gradient(135deg, rgba(255,255,255,0.20), transparent 46%)"
              : "radial-gradient(540px 210px at 0% 0%, rgba(74,111,165,0.08), transparent 68%), radial-gradient(420px 220px at 100% 0%, rgba(232,145,58,0.06), transparent 74%)",
            pointerEvents: "none",
          }}
        />
        <Box sx={{ position: "relative" }}>
          <Stack
            sx={{
              gap: { xs: 1.5, md: isFeature ? 2 : 1.5 },
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md:
                    actions || utility
                      ? "minmax(0, 1fr) minmax(220px, auto)"
                      : "1fr",
                },
                gap: { xs: 1.5, md: 2 },
                alignItems: { xs: "flex-start", md: "end" },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                {(eyebrow || icon) && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.75,
                      mb: 1,
                      flexWrap: "wrap",
                      px: isFeature ? 1 : 0,
                      py: isFeature ? 0.55 : 0,
                      borderRadius: 999,
                      background: isFeature
                        ? "rgba(255,255,255,0.78)"
                        : "transparent",
                      border: isFeature
                        ? "1px solid rgba(255,255,255,0.7)"
                        : "none",
                    }}
                  >
                    {icon ? (
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: tc.primary,
                          borderRadius: "50%",
                          background: isFeature
                            ? `${tc.primary}10`
                            : "transparent",
                        }}
                      >
                        {icon}
                      </Box>
                    ) : null}
                    {eyebrow ? (
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: tc.primary,
                          fontWeight: 700,
                        }}
                      >
                        {eyebrow}
                      </Typography>
                    ) : null}
                  </Box>
                )}
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: isFeature ? "-0.04em" : "-0.03em",
                    lineHeight: 1.03,
                    fontSize: {
                      xs: isFeature ? "2rem" : "1.8rem",
                      md: isFeature ? "2.45rem" : "2.1rem",
                    },
                    maxWidth: isFeature ? "15ch" : "22ch",
                    textWrap: "balance",
                  }}
                >
                  {title}
                </Typography>
                {subtitle ? (
                  <Typography
                    variant="body1"
                    sx={{
                      color: tc.textSecondary,
                      maxWidth: 760,
                      mt: 0.9,
                      fontSize: isFeature ? "1rem" : "0.95rem",
                      lineHeight: 1.65,
                    }}
                  >
                    {subtitle}
                  </Typography>
                ) : null}
                {summary ? (
                  <Box
                    sx={{
                      mt: subtitle ? 1 : 0.9,
                      color: tc.textSecondary,
                      maxWidth: 760,
                    }}
                  >
                    {typeof summary === "string" ? (
                      <Typography
                        variant="body1"
                        sx={{
                          color: "inherit",
                          fontSize: isFeature ? "1rem" : "0.95rem",
                          lineHeight: 1.65,
                        }}
                      >
                        {summary}
                      </Typography>
                    ) : (
                      summary
                    )}
                  </Box>
                ) : null}
                {isMobile && mobileSummary ? (
                  <Box sx={{ mt: 1.5 }}>{mobileSummary}</Box>
                ) : null}
              </Box>
              {actions || utility ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    alignItems: { xs: "stretch", md: "flex-end" },
                    justifyContent: "flex-start",
                    maxWidth: { md: 360 },
                    minWidth: 0,
                    pt: { xs: 0, md: 0.25 },
                  }}
                >
                  {utility ? <Box sx={{ width: "100%" }}>{utility}</Box> : null}
                  {actions ? (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: { xs: "flex-start", md: "center" },
                        flexWrap: "wrap",
                        justifyContent: { xs: "flex-start", md: "flex-end" },
                      }}
                    >
                      {actions}
                    </Box>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          </Stack>
          {hasSupportRail ? (
            <Box
              sx={{
                mt: isImmersiveMobile ? 1.25 : 0.5,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                  p: { xs: 1, md: isFeature ? 1.25 : 1 },
                  borderRadius: heroInnerRadius,
                  border: `1px solid ${isFeature ? "rgba(255,255,255,0.76)" : tc.dataBorder}`,
                  background: isFeature
                    ? "linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(246,248,251,0.9) 100%)"
                    : "rgba(255,255,255,0.58)",
                }}
              >
                {supportContent ? <Box>{supportContent}</Box> : null}
                {showInlineStats ? (
                  <Box
                    sx={{
                      minWidth: 0,
                      width: "100%",
                    }}
                  >
                    {stats}
                  </Box>
                ) : null}
              </Box>
            </Box>
          ) : null}
          {footer ? <Box sx={{ mt: 1.5 }}>{footer}</Box> : null}
        </Box>
      </Box>
      {showFooterStats ? (
        <Box
          sx={{
            p: { xs: 1.25, md: 1.5 },
            mb: 3,
            borderRadius: heroInnerRadius,
            border: `1px solid ${tc.dataBorder}`,
            background: "rgba(255,255,255,0.78)",
            boxShadow: "0 8px 18px rgba(15, 27, 51, 0.05)",
          }}
        >
          {stats}
        </Box>
      ) : null}
    </>
  );
};

/**
 * PageHeader - compatibility wrapper over PageIntro
 */
export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  summary?: React.ReactNode;
  actions?: React.ReactNode;
  mobileMode?: "compact" | "immersive";
  mobileSummary?: React.ReactNode;
  mobileAnchorId?: string;
  mobileCtaLabel?: string;
  mobileCtaHref?: string;
  sx?: SxProps<Theme>;
}> = ({
  eyebrow,
  title,
  subtitle,
  summary,
  actions,
  mobileMode,
  mobileSummary,
  mobileAnchorId,
  sx,
}) => (
  <PageIntro
    eyebrow={eyebrow}
    title={title}
    subtitle={subtitle}
    summary={summary}
    actions={actions}
    mobileMode={mobileMode}
    mobileSummary={mobileSummary}
    mobileAnchorId={mobileAnchorId}
    sx={sx}
  />
);

/**
 * SectionTitle - standard section heading block
 */
export const SectionTitle: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ eyebrow, title, description, actions, sx }) => {
  const tc = useThemedColors();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", md: "center" },
        flexDirection: { xs: "column", md: "row" },
        gap: 1.5,
        ...sx,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow ? (
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: tc.primary,
              mb: 0.5,
            }}
          >
            {eyebrow}
          </Typography>
        ) : null}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" sx={{ color: tc.textSecondary, mt: 0.5 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box> : null}
    </Box>
  );
};

/**
 * PageSection - shared section wrapper
 */
export const PageSection: React.FC<{
  title?: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  surface?: "none" | "card";
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({
  title,
  description,
  eyebrow,
  actions,
  surface = "none",
  children,
  sx,
}) => {
  const content = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {title ? (
        <SectionTitle
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={actions}
        />
      ) : null}
      {children}
    </Box>
  );

  if (surface === "card") {
    return <DataCard sx={{ p: { xs: 2, md: 2.5 }, ...sx }}>{content}</DataCard>;
  }

  return <Box sx={sx}>{content}</Box>;
};

/**
 * ToolbarCard - consistent shell for filters and toolbars
 */
export const ToolbarCard: React.FC<{
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  sticky?: boolean;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ title, description, icon, actions, sticky = false, children, sx }) => {
  const tc = useThemedColors();

  return (
    <DataCard
      sx={{
        p: { xs: 2, md: 2.5 },
        background: "linear-gradient(180deg, #fbfcfd 0%, #f5f8fa 100%)",
        boxShadow: "0 4px 12px rgba(15, 27, 51, 0.04)",
        position: sticky ? "sticky" : "relative",
        top: sticky ? 12 : "auto",
        zIndex: sticky ? 4 : "auto",
        ...sx,
      }}
    >
      <Stack spacing={2}>
        {title || description || actions ? (
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", md: "center" },
              flexDirection: { xs: "column", md: "row" },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              {title ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: description ? 0.5 : 0,
                  }}
                >
                  {icon ? (
                    <Box sx={{ display: "flex", color: tc.primary }}>
                      {icon}
                    </Box>
                  ) : null}
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      color: tc.textPrimary,
                    }}
                  >
                    {title}
                  </Typography>
                </Box>
              ) : null}
              {description ? (
                <Typography variant="body2" sx={{ color: tc.textSecondary }}>
                  {description}
                </Typography>
              ) : null}
            </Box>
            {actions ? (
              <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box>
            ) : null}
          </Box>
        ) : null}
        {children}
      </Stack>
    </DataCard>
  );
};

/**
 * PanelHeader - shared drawer/detail panel top bar
 */
export const PanelHeader: React.FC<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
  sticky?: boolean;
  sx?: SxProps<Theme>;
}> = ({
  title,
  subtitle,
  eyebrow,
  icon,
  actions,
  onClose,
  sticky = false,
  sx,
}) => {
  const tc = useThemedColors();

  return (
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        borderBottom: `1px solid ${tc.dataBorder}`,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,249,251,0.98) 100%)",
        position: sticky ? "sticky" : "relative",
        top: sticky ? 0 : "auto",
        zIndex: sticky ? 10 : "auto",
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {(eyebrow || icon) && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.75,
                flexWrap: "wrap",
              }}
            >
              {icon ? (
                <Box sx={{ display: "flex", color: tc.primary }}>{icon}</Box>
              ) : null}
              {eyebrow ? (
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: tc.primary,
                  }}
                >
                  {eyebrow}
                </Typography>
              ) : null}
            </Box>
          )}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography
              variant="body1"
              sx={{ color: tc.textSecondary, mt: 0.75 }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {actions}
          {onClose ? (
            <IconButton onClick={onClose} size="large">
              <CloseIcon />
            </IconButton>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * MetricCard - number + label + optional trend indicator
 */
export const MetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  trend?: { value: number; label?: string };
  icon?: React.ReactNode;
  tone?: "default" | "muted" | "emphasis";
  iconContainer?: "subtle" | "solid" | "none";
  sx?: SxProps<Theme>;
}> = ({
  label,
  value,
  caption,
  trend,
  icon,
  tone = "default",
  iconContainer = "subtle",
  sx,
}) => {
  const themedColors = useThemedColors();
  const iconBg =
    tone === "emphasis"
      ? colors.primary
      : tone === "muted"
        ? `${colors.primary}08`
        : colors.backgroundSubtle;
  const iconColor = tone === "emphasis" ? "#fff" : colors.primaryLight;

  return (
    <Card
      sx={{
        ...commonStyles.dataCard,
        p: 2.5,
        background:
          tone === "muted"
            ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,248,250,0.98) 100%)"
            : colors.backgroundPaper,
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            variant="body2"
            sx={{
              color: themedColors.textSecondary,
              fontWeight: 600,
              fontSize: "0.8125rem",
              mb: 0.75,
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {value}
          </Typography>
          {trend && (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: trend.value >= 0 ? colors.success : colors.error,
                }}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}%
              </Typography>
              {trend.label && (
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: themedColors.textTertiary,
                  }}
                >
                  {trend.label}
                </Typography>
              )}
            </Box>
          )}
          {caption ? (
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                display: "block",
                mt: 0.75,
              }}
            >
              {caption}
            </Typography>
          ) : null}
        </Box>
        {icon && iconContainer !== "none" && (
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              background: iconContainer === "solid" ? colors.primary : iconBg,
              color: iconContainer === "solid" ? "#fff" : iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </Card>
  );
};

/**
 * VoteMarginBar - horizontal stacked bar for yes/no/abstain/absent
 */
export const VoteMarginBar: React.FC<{
  yes: number;
  no: number;
  empty?: number;
  absent?: number;
  height?: number;
  sx?: SxProps<Theme>;
}> = ({ yes, no, empty = 0, absent = 0, height = 8, sx }) => {
  const { t } = useScopedTranslation("common");
  const total = yes + no + empty + absent;
  if (total === 0) return null;

  const ariaLabel = t("voteMarginAria", { yes, no, empty, absent });

  const yesPercent = (yes / total) * 100;
  const noPercent = (no / total) * 100;
  const emptyPercent = (empty / total) * 100;

  return (
    <Box
      role="img"
      aria-label={ariaLabel}
      sx={{
        display: "flex",
        width: "100%",
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        background: colors.backgroundSubtle,
        ...sx,
      }}
    >
      <Box
        sx={{
          width: `${yesPercent}%`,
          background: "#22C55E",
          transition: "width 0.3s ease",
        }}
      />
      <Box
        sx={{
          width: `${noPercent}%`,
          background: "#EF4444",
          transition: "width 0.3s ease",
        }}
      />
      <Box
        sx={{
          width: `${emptyPercent}%`,
          background: "#F59E0B",
          transition: "width 0.3s ease",
        }}
      />
    </Box>
  );
};

/**
 * PageSkeleton - Suspense fallback replacement showing a loading skeleton
 */
export const PageSkeleton: React.FC = () => (
  <Box sx={{ pt: 1 }}>
    <Box sx={{ mb: 3 }}>
      <Skeleton variant="text" width={220} height={36} animation="wave" />
      <Skeleton
        variant="text"
        width={340}
        height={20}
        animation="wave"
        sx={{ mt: 0.5 }}
      />
    </Box>
    {[90, 160, 120].map((h, i) => (
      <Skeleton
        key={i}
        variant="rounded"
        height={h}
        animation="wave"
        sx={{ mb: 2, borderRadius: `${borderRadius.md * 8}px` }}
      />
    ))}
  </Box>
);

/**
 * EmptyState - shared no-data UI component
 */
export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ title, description, action, icon, sx }) => {
  const tc = useThemedColors();
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 6,
        px: 3,
        border: `1px solid ${tc.dataBorder}`,
        borderRadius: `${borderRadius.md * 8}px`,
        background: tc.backgroundPaper,
        ...sx,
      }}
    >
      {icon && (
        <Box
          sx={{ mb: 2, color: tc.textTertiary, fontSize: 40, lineHeight: 1 }}
        >
          {icon}
        </Box>
      )}
      <Typography
        variant="h6"
        sx={{ color: tc.textSecondary, fontWeight: 600, mb: 0.5 }}
      >
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: tc.textTertiary }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
};

/**
 * InlineSpinner - replaces scattered loading spinners
 */
export const InlineSpinner: React.FC<{ size?: number; py?: number }> = ({
  size = 28,
  py = 5,
}) => {
  const tc = useThemedColors();
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py }}>
      <CircularProgress size={size} sx={{ color: tc.primary }} />
    </Box>
  );
};
