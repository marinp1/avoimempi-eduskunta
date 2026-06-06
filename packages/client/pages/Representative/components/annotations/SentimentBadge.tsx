import { Chip, Tooltip } from "@mui/material";
import React from "react";
import { useThemedColors } from "../../../../theme/ThemeContext";
import type { SentimentAnnotation } from "./types";

interface SentimentBadgeProps {
  annotation: SentimentAnnotation;
}

/**
 * Inline pill that surfaces a sentiment annotation. Designed to live next to
 * a speech/question title once topic+sentiment annotations exist.
 */
export const SentimentBadge: React.FC<SentimentBadgeProps> = ({
  annotation,
}) => {
  const themed = useThemedColors();
  const colorByLabel: Record<SentimentAnnotation["value"]["label"], string> = {
    positiivinen: themed.success ?? "#2e7d32",
    neutraali: themed.textSecondary,
    kriittinen: themed.warning ?? "#c77700",
  };
  return (
    <Tooltip
      title={`Mallin ${annotation.model} arvio (luottamus ${(
        (annotation.confidence ?? 0) * 100
      ).toFixed(0)} %)`}
      placement="top"
    >
      <Chip
        label={annotation.value.label}
        size="small"
        sx={{
          height: 18,
          fontSize: "0.65rem",
          fontWeight: 700,
          color: "#fff",
          bgcolor: colorByLabel[annotation.value.label],
        }}
      />
    </Tooltip>
  );
};
