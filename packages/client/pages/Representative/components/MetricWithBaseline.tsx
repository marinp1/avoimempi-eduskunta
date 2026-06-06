import { Box, Stack, Typography } from "@mui/material";
import type React from "react";
import { useThemedColors } from "../../../theme/ThemeContext";

export interface MetricWithBaselineProps {
  label: string;
  value: number | null;
  /** Format value/baselines for display (e.g. percent, count). */
  format?: (n: number) => string;
  partyAverage?: number | null;
  partyLabel?: string | null;
  parliamentAverage?: number | null;
  /**
   * If true, a value below the baselines is interpreted as a positive
   * (e.g. low absences). Defaults to false (higher = better).
   */
  lowerIsBetter?: boolean;
}

const defaultFormat = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString("fi-FI") : n.toFixed(1);

const formatDelta = (
  value: number,
  baseline: number,
  format: (n: number) => string,
) => {
  const diff = value - baseline;
  if (Math.abs(diff) < 0.05) return `± ${format(0)}`;
  const sign = diff > 0 ? "+" : "−";
  return `${sign}${format(Math.abs(diff))}`;
};

const deltaColor = (
  value: number,
  baseline: number,
  lowerIsBetter: boolean,
  themed: ReturnType<typeof useThemedColors>,
) => {
  const diff = value - baseline;
  if (Math.abs(diff) < 0.05) return themed.textTertiary;
  const isPositive = lowerIsBetter ? diff < 0 : diff > 0;
  return isPositive
    ? (themed.success ?? "#2e7d32")
    : (themed.warning ?? "#c77700");
};

export const MetricWithBaseline: React.FC<MetricWithBaselineProps> = ({
  label,
  value,
  format = defaultFormat,
  partyAverage,
  partyLabel,
  parliamentAverage,
  lowerIsBetter = false,
}) => {
  const themed = useThemedColors();
  const hasValue = value !== null && Number.isFinite(value);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{
          color: themed.textTertiary,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          display: "block",
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h2"
        sx={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: themed.textPrimary,
          lineHeight: 1.1,
          mt: 0.25,
        }}
      >
        {hasValue ? format(value as number) : "—"}
      </Typography>
      <Stack direction="row" spacing={1.25} sx={{ mt: 0.5, flexWrap: "wrap" }}>
        {parliamentAverage != null && (
          <Typography
            variant="caption"
            sx={{ color: themed.textSecondary, fontFamily: "monospace" }}
          >
            Parlamentti: {format(parliamentAverage)}{" "}
            {hasValue && (
              <Box
                component="span"
                sx={{
                  color: deltaColor(
                    value as number,
                    parliamentAverage,
                    lowerIsBetter,
                    themed,
                  ),
                  fontWeight: 700,
                }}
              >
                ({formatDelta(value as number, parliamentAverage, format)})
              </Box>
            )}
          </Typography>
        )}
        {partyAverage != null && (
          <Typography
            variant="caption"
            sx={{ color: themed.textSecondary, fontFamily: "monospace" }}
          >
            {partyLabel ?? "Puolue"}: {format(partyAverage)}{" "}
            {hasValue && (
              <Box
                component="span"
                sx={{
                  color: deltaColor(
                    value as number,
                    partyAverage,
                    lowerIsBetter,
                    themed,
                  ),
                  fontWeight: 700,
                }}
              >
                ({formatDelta(value as number, partyAverage, format)})
              </Box>
            )}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
