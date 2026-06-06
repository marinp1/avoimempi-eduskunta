import EventNoteIcon from "@mui/icons-material/EventNote";
import { Box, Stack, Typography } from "@mui/material";
import React from "react";
import { useThemedColors } from "../../theme/ThemeContext";

interface ElectionContextStripProps {
  context: {
    election: { year: number; date: string; type: string } | null;
    candidacy: {
      district_id?: number;
      district_name?: string;
      list_number?: number | null;
    } | null;
  } | null;
}

/**
 * Renders an election candidacy strip in the Hero. Until Election/Candidacy
 * tables are ingested the API returns null and this component renders nothing.
 * Reserved so the Hero layout doesn't shift when the data lands.
 */
export const ElectionContextStrip: React.FC<ElectionContextStripProps> = ({
  context,
}) => {
  const themed = useThemedColors();

  if (!context || !context.election) return null;

  const { election, candidacy } = context;

  return (
    <Box
      sx={{
        mt: 1,
        py: 0.75,
        px: 1,
        border: `1px solid ${themed.dataBorder}`,
        backgroundColor: themed.backgroundSubtle,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <EventNoteIcon sx={{ fontSize: 16, color: themed.accent }} />
        <Typography variant="caption" sx={{ color: themed.textSecondary }}>
          {candidacy
            ? `Ehdolla ${candidacy.district_name ?? ""} — ${election.type} ${election.year}${
                candidacy.list_number ? ` — listanumero ${candidacy.list_number}` : ""
              }`
            : `${election.type} ${election.year} — ei aseta ehdolle`}
        </Typography>
      </Stack>
    </Box>
  );
};
