import { Box, Stack, Typography } from "@mui/material";
import type React from "react";
import { useThemedColors } from "../../../../theme/ThemeContext";
import type { AiSummaryAnnotation } from "./types";
import { useAnnotations } from "./useAnnotations";

interface AiSummaryBlockProps {
  personId: number;
}

/**
 * Renders the latest AI-generated summary for a representative when one
 * exists. Until the annotation pipeline lands the hook returns `[]` and this
 * component renders an explicit "ei vielä saatavilla" notice instead of
 * disappearing — readers see that the slot exists and is honest about it.
 */
export const AiSummaryBlock: React.FC<AiSummaryBlockProps> = ({ personId }) => {
  const themed = useThemedColors();
  const annotations = useAnnotations(personId, "ai_summary");

  if (annotations === null) {
    return (
      <Typography variant="body2" sx={{ color: themed.textTertiary }}>
        Ladataan…
      </Typography>
    );
  }

  const summary = annotations.find(
    (a): a is AiSummaryAnnotation => a.kind === "ai_summary",
  );

  if (!summary) {
    return (
      <Typography
        variant="body2"
        sx={{ color: themed.textTertiary, fontStyle: "italic" }}
      >
        Tekoälypohjaista tiivistelmää ei ole vielä luotu tästä edustajasta.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography
        variant="h3"
        sx={{ fontSize: "1rem", fontWeight: 700, color: themed.textPrimary }}
      >
        {summary.value.headline}
      </Typography>
      <Typography
        variant="body2"
        sx={{ color: themed.textPrimary, lineHeight: 1.6 }}
      >
        {summary.value.body}
      </Typography>
      <Box
        sx={{
          mt: 1,
          p: 1,
          borderLeft: `2px solid ${themed.dataBorder}`,
          backgroundColor: themed.backgroundSubtle,
        }}
      >
        <Typography variant="caption" sx={{ color: themed.textTertiary }}>
          Tuotettu mallilla {summary.model} ({summary.modelVersion})
          {summary.confidence != null
            ? ` — luottamus ${(summary.confidence * 100).toFixed(0)} %`
            : ""}
          . Älä lue tiivistelmää tosiasiana — tarkista lähtötiedot itse.
        </Typography>
      </Box>
    </Stack>
  );
};
