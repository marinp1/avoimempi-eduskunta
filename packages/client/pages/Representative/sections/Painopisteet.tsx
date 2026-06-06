import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import React from "react";
import { apiFetch } from "#client/utils/fetch";
import { useThemedColors } from "../../../theme/ThemeContext";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

interface FocusArea {
  label: string;
  weight: number;
  sources: string[];
}

interface FocusAreasResponse {
  areas: FocusArea[];
  methodology: string;
}

const sourceLabels: Record<string, string> = {
  committee: "valiokunta",
  initiative: "aloite",
  interpellation: "välikysymys",
  written_question: "kirjallinen kysymys",
  speech: "puheenvuoro",
};

const Painopisteet: React.FC<ProfileSectionProps> = ({ personId }) => {
  const themed = useThemedColors();
  const [data, setData] = React.useState<FocusAreasResponse | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError(false);
    apiFetch(`/api/person/${personId}/focus-areas`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ctrl.signal.aborted && d) setData(d);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
  }, [personId]);

  const isEmpty = data !== null && data.areas.length === 0;

  return (
    <SectionShell
      anchor="painopisteet"
      title="Painopisteet"
      methodology="Painopisteet kootaan yhdistämällä valiokuntajäsenyydet, allekirjoitettujen aloitteiden ja välikysymysten aiheet sekä puheenvuorojen istuntokohdat. Esiintymistiheys ratkaisee järjestyksen."
      methodologyCaveats="Karkea raakadatan johdannainen. Tekoälyllä tehtävä aiheluokitus tarkentaa listaa myöhemmin."
      isEmpty={isEmpty}
      emptyState="Painopisteitä ei voitu johtaa tämän edustajan tiedoista."
    >
      {data ? (
        <Stack spacing={1.5}>
          {data.areas.map((area, i) => {
            const max = data.areas[0]?.weight ?? 1;
            const fill = Math.max(0.08, area.weight / max);
            return (
              <Box key={`${area.label}-${i}`}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: themed.textPrimary, fontWeight: 600 }}
                  >
                    {area.label}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {area.sources.map((src) => (
                      <Chip
                        key={src}
                        label={sourceLabels[src] ?? src}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.65rem",
                          bgcolor: themed.backgroundSubtle,
                          color: themed.textSecondary,
                        }}
                      />
                    ))}
                  </Stack>
                </Stack>
                <Box
                  sx={{
                    mt: 0.5,
                    height: 4,
                    backgroundColor: themed.backgroundSubtle,
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      width: `${fill * 100}%`,
                      backgroundColor: themed.accent,
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Stack>
      ) : error ? (
        <Typography variant="body2" sx={{ color: themed.textTertiary }}>
          Painopisteitä ei voitu ladata.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rectangular" height={18} />
          ))}
        </Stack>
      )}
    </SectionShell>
  );
};

export default Painopisteet;
