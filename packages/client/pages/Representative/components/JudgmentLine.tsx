import { Box, Typography } from "@mui/material";
import React from "react";
import { useThemedColors } from "../../../theme/ThemeContext";

export type JudgmentTone = "above" | "below" | "near" | "neutral";

export interface JudgmentLineProps {
  /**
   * Plain-Finnish sentence form of a metric+baseline pair, e.g.
   * "Osallistunut 73 % äänestyksistä — alle parlamentin keskiarvon (89 %)."
   */
  text: string;
  tone?: JudgmentTone;
}

const toneColor = (
  tone: JudgmentTone,
  themed: ReturnType<typeof useThemedColors>,
) => {
  if (tone === "above") return themed.success ?? "#2e7d32";
  if (tone === "below") return themed.warning ?? "#c77700";
  return themed.textSecondary;
};

export const JudgmentLine: React.FC<JudgmentLineProps> = ({
  text,
  tone = "neutral",
}) => {
  const themed = useThemedColors();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        py: 0.5,
      }}
    >
      <Box
        sx={{
          width: 4,
          alignSelf: "stretch",
          backgroundColor: toneColor(tone, themed),
          flexShrink: 0,
        }}
      />
      <Typography
        variant="body2"
        sx={{ color: themed.textPrimary, lineHeight: 1.5 }}
      >
        {text}
      </Typography>
    </Box>
  );
};

/**
 * Helper that turns a metric + baseline into a judgment tone + sentence.
 * Caller provides the sentence template (Finnish copy lives at the call site).
 */
export const judgeAgainstBaseline = (
  value: number | null,
  baseline: number | null,
  options: { lowerIsBetter?: boolean; tolerance?: number } = {},
): JudgmentTone => {
  if (value == null || baseline == null) return "neutral";
  const tolerance = options.tolerance ?? Math.max(1, baseline * 0.1);
  const diff = value - baseline;
  if (Math.abs(diff) <= tolerance) return "near";
  const isAbove = diff > 0;
  if (options.lowerIsBetter) return isAbove ? "below" : "above";
  return isAbove ? "above" : "below";
};
