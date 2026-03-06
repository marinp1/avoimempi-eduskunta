import { Box, Card, type SxProps, type Theme, Typography } from "@mui/material";
import type React from "react";
import { useTranslation } from "react-i18next";
import { colors, commonStyles } from "./index";
import { useThemedColors } from "./ThemeContext";

/**
 * DataCard - flat white card with 1px border, no backdrop-filter
 */
export const DataCard: React.FC<{
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
}> = ({ children, sx, className }) => (
  <Card className={className} sx={{ ...commonStyles.dataCard, ...sx }}>{children}</Card>
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
  const { t } = useTranslation();
  const total = yes + no + empty + absent;
  if (total === 0) return null;

  const ariaLabel = t("common.voteMarginAria", { yes, no, empty, absent });

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
