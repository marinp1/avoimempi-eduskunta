import { AutoAwesome as AutoAwesomeIcon } from "@mui/icons-material";
import { Box, Chip, Stack, Typography } from "@mui/material";
import React from "react";
import { colors } from "#client/theme";

const DocumentsHeroComponent: React.FC<{
  title: string;
  subtitle: string;
  resultsSummary?: string;
  contextLabel?: string | null;
}> = ({ title, subtitle, resultsSummary, contextLabel }) => (
  <Box
    sx={{
      position: "relative",
      overflow: "hidden",
      borderRadius: 3,
      border: `1px solid ${colors.dataBorder}`,
      px: { xs: 2, md: 3.5 },
      py: { xs: 2.5, md: 3.5 },
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,246,248,0.95) 100%)",
      boxShadow: "0 8px 20px rgba(15, 27, 51, 0.04)",
    }}
  >
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Chip
          icon={<AutoAwesomeIcon />}
          label={resultsSummary || title}
          sx={{
            backgroundColor: `${colors.primary}10`,
            color: colors.primary,
            fontWeight: 700,
          }}
        />
        {contextLabel && (
          <Chip
            label={contextLabel}
            variant="outlined"
            sx={{
              borderColor: `${colors.primary}30`,
              backgroundColor: "rgba(255,255,255,0.72)",
              color: colors.textSecondary,
            }}
          />
        )}
      </Stack>
      <Typography
        variant="h2"
        sx={{
          fontFamily: '"Zilla Slab", Georgia, serif',
          fontWeight: 700,
          letterSpacing: "-0.03em",
          maxWidth: 720,
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: colors.textSecondary,
          maxWidth: 760,
          fontSize: "1rem",
        }}
      >
        {subtitle}
      </Typography>
    </Stack>
  </Box>
);

export const DocumentsHero = React.memo(DocumentsHeroComponent);
