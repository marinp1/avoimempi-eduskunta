import { Box, Link, Stack, Typography } from "@mui/material";
import type React from "react";
import { useThemedColors } from "../../../theme/ThemeContext";

export interface MethodologyTraceLink {
  /** Plain-Finnish label, e.g. "Avaa allekirjoittajat raakana". */
  label: string;
  href: string;
}

export interface MethodologyDrawerProps {
  /** Plain-Finnish explanation of the formula. */
  formula: string;
  /** Optional links to underlying queryable rows (extends ImportSourceReference). */
  traceLinks?: MethodologyTraceLink[];
  /** Optional aside about caveats or current limitations. */
  caveats?: string;
}

/**
 * Inline panel rendered by SectionShell when a reader opens the "i" affordance.
 * The Phase 4 version is intentionally inline (not a stacked drawer) so the
 * methodology stays anchored to the section it explains.
 */
export const MethodologyDrawer: React.FC<MethodologyDrawerProps> = ({
  formula,
  traceLinks,
  caveats,
}) => {
  const themed = useThemedColors();
  return (
    <Box
      sx={{
        mb: 2,
        p: 1.5,
        borderLeft: `2px solid ${themed.accent}`,
        backgroundColor: themed.backgroundSubtle,
      }}
    >
      <Stack spacing={0.75}>
        <Typography
          variant="caption"
          sx={{ color: themed.textSecondary, lineHeight: 1.6 }}
        >
          <strong>Menetelmä.</strong> {formula}
        </Typography>
        {caveats && (
          <Typography
            variant="caption"
            sx={{
              color: themed.textTertiary,
              lineHeight: 1.6,
              fontStyle: "italic",
            }}
          >
            {caveats}
          </Typography>
        )}
        {traceLinks && traceLinks.length > 0 && (
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ flexWrap: "wrap", mt: 0.25 }}
          >
            {traceLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                sx={{
                  fontSize: "0.75rem",
                  color: themed.accent,
                  textDecorationColor: themed.accent,
                }}
              >
                {link.label}
              </Link>
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};
