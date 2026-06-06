import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Chip, Link, Stack, Typography } from "@mui/material";
import type React from "react";
import { useThemedColors } from "../../theme/ThemeContext";
import { ElectionContextStrip } from "./ElectionContextStrip";

interface HeroProps {
  details: {
    person_id: number;
    first_name?: string | null;
    last_name?: string | null;
    party?: string | null;
  } | null;
  electionContext: React.ComponentProps<typeof ElectionContextStrip>["context"];
  loading: boolean;
}

/**
 * Synthesis snapshot — identity + headline metrics + reserved slots for
 * "Sanat vs. teot" and AI summary. A reader who only sees the Hero already
 * knows the gist; scrolling deepens that picture.
 */
export const Hero: React.FC<HeroProps> = ({
  details,
  electionContext,
  loading,
}) => {
  const themed = useThemedColors();

  const fullName = details
    ? `${details.first_name ?? ""} ${details.last_name ?? ""}`.trim() ||
      "Edustaja"
    : loading
      ? "Ladataan..."
      : "Edustajaa ei löytynyt";

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, "", "/edustajat");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <Box
      sx={{
        py: 2,
        px: { xs: 1.5, sm: 0 },
        borderBottom: `1px solid ${themed.dataBorder}`,
      }}
    >
      <Link
        href="/edustajat"
        onClick={handleBack}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          fontSize: "0.75rem",
          fontWeight: 600,
          color: themed.textSecondary,
          textDecoration: "none",
          mb: 1,
          "&:hover": { color: themed.textPrimary },
        }}
      >
        <ArrowBackIcon sx={{ fontSize: 14 }} />
        Kokoonpano
      </Link>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{ color: themed.textTertiary, letterSpacing: "0.08em" }}
          >
            Kansanedustajan profiili
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "1.5rem", sm: "2rem" },
              fontWeight: 700,
              color: themed.textPrimary,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {fullName}
          </Typography>
          {details?.party && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ mt: 0.75 }}
              alignItems="center"
            >
              <Chip
                size="small"
                label={details.party}
                sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
              />
            </Stack>
          )}
        </Box>
      </Stack>

      {/* Reserved slot for synthesis: sparkline + dissent gauge + AI summary
          + "Sanat vs. teot" badge. Built out in phase 4. */}
      <Box
        sx={{
          mt: 2,
          py: 1.5,
          px: 1.25,
          border: `1px dashed ${themed.dataBorder}`,
          color: themed.textTertiary,
        }}
      >
        <Typography variant="caption">
          Synteesi — aktiivisuus, äänestyskuri ja vertailut puolueeseen
          rakennetaan vaiheessa 4.
        </Typography>
      </Box>

      <ElectionContextStrip context={electionContext} />
    </Box>
  );
};
