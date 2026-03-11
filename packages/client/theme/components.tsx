import {
  Box,
  Card,
  CircularProgress,
  Skeleton,
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
 * PageHeader - consistent title + subtitle + optional actions
 */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ title, subtitle, actions, sx }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: { xs: "flex-start", sm: "center" },
      flexDirection: { xs: "column", sm: "row" },
      gap: 2,
      mb: 3,
      ...sx,
    }}
  >
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: colors.textPrimary,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography
          variant="body2"
          sx={{
            color: colors.textSecondary,
            mt: 0.5,
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
    {actions && <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box>}
  </Box>
);

/**
 * MetricCard - number + label + optional trend indicator
 */
export const MetricCard: React.FC<{
  label: string;
  value: string | number;
  trend?: { value: number; label?: string };
  icon?: React.ReactNode;
  sx?: SxProps<Theme>;
}> = ({ label, value, trend, icon, sx }) => {
  const themedColors = useThemedColors();

  return (
    <Card
      sx={{
        ...commonStyles.dataCard,
        p: 2.5,
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
              fontWeight: 500,
              fontSize: "0.8125rem",
              mb: 0.75,
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
        </Box>
        {icon && (
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              background: colors.backgroundSubtle,
              color: colors.primaryLight,
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
      <Skeleton variant="text" width={340} height={20} animation="wave" sx={{ mt: 0.5 }} />
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
        <Box sx={{ mb: 2, color: tc.textTertiary, fontSize: 40, lineHeight: 1 }}>
          {icon}
        </Box>
      )}
      <Typography variant="h6" sx={{ color: tc.textSecondary, fontWeight: 600, mb: 0.5 }}>
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
