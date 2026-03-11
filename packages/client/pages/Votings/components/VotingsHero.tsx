import { AutoAwesome as AutoAwesomeIcon } from "@mui/icons-material";
import { Box, Chip, Stack, Typography } from "@mui/material";
import type React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors } from "#client/theme";

export const VotingsHero: React.FC<{
  title: string;
  subtitle: string;
}> = ({ title, subtitle }) => {
  const { t } = useScopedTranslation("votings");

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 4,
        border: `1px solid ${colors.dataBorder}`,
        px: { xs: 2, md: 3.5 },
        py: { xs: 2.5, md: 3.5 },
        mb: 3,
        background:
          "linear-gradient(140deg, rgba(255,255,255,0.98) 0%, rgba(243,245,247,0.97) 62%, rgba(236,241,247,0.95) 100%)",
        boxShadow: "0 10px 24px rgba(15, 27, 51, 0.05)",
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            icon={<AutoAwesomeIcon />}
            label={title}
            sx={{
              backgroundColor: `${colors.primary}12`,
              color: colors.primary,
              fontWeight: 700,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: colors.textSecondary,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {t("eyebrow")}
          </Typography>
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
};
