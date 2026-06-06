import { Chip, Stack } from "@mui/material";
import React from "react";
import { useThemedColors } from "../../../../theme/ThemeContext";
import type { TopicTagAnnotation } from "./types";

interface TopicTagStripProps {
  annotations: TopicTagAnnotation[];
  max?: number;
}

/**
 * Horizontal strip of topic tags ordered by weight. Once topic annotations
 * exist this can sit at the top of any section that benefits from a quick
 * thematic glance.
 */
export const TopicTagStrip: React.FC<TopicTagStripProps> = ({
  annotations,
  max = 6,
}) => {
  const themed = useThemedColors();
  if (!annotations.length) return null;
  const visible = [...annotations]
    .sort((a, b) => b.value.weight - a.value.weight)
    .slice(0, max);
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
      {visible.map((tag) => (
        <Chip
          key={`${tag.value.label}-${tag.generatedAt}`}
          label={tag.value.label}
          size="small"
          sx={{
            height: 20,
            fontSize: "0.7rem",
            bgcolor: themed.backgroundSubtle,
            color: themed.textSecondary,
            border: `1px solid ${themed.dataBorder}`,
          }}
        />
      ))}
    </Stack>
  );
};
