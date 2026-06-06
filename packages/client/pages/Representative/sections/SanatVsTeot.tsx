import { Box, Skeleton, Stack, Typography } from "@mui/material";
import React from "react";
import { apiFetch } from "#client/utils/fetch";
import { useThemedColors } from "../../../theme/ThemeContext";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

interface FocusArea {
  label: string;
  weight: number;
  sources: string[];
  sourceWeights: Record<string, number>;
}

interface FocusAreasResponse {
  areas: FocusArea[];
}

const WORD_SOURCES = ["speech", "interpellation", "written_question"] as const;
const DEED_SOURCES = ["initiative", "committee"] as const;

const sumSources = (
  weights: Record<string, number>,
  keys: readonly string[],
): number => keys.reduce((acc, k) => acc + (weights[k] ?? 0), 0);

const SanatVsTeot: React.FC<ProfileSectionProps> = ({ personId }) => {
  const themed = useThemedColors();
  const [data, setData] = React.useState<FocusAreasResponse | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError(false);
    apiFetch(`/api/person/${personId}/focus-areas?topN=8`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ctrl.signal.aborted && d) setData(d);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
  }, [personId]);

  const pairs =
    data?.areas
      .map((area) => ({
        area,
        words: sumSources(area.sourceWeights, WORD_SOURCES),
        deeds: sumSources(area.sourceWeights, DEED_SOURCES),
      }))
      .filter((p) => p.words + p.deeds > 0) ?? null;

  const isEmpty = pairs !== null && pairs.length === 0;

  return (
    <SectionShell
      anchor="sanat-vs-teot"
      title="Sanat vs. teot"
      methodology="Vertaa edustajan painopisteistä, paljonko kustakin aiheesta on puhuttu (puheenvuorot, välikysymykset, kirjalliset kysymykset) ja paljonko aiheen ympärillä on tehty konkreettisia toimia (allekirjoitetut aloitteet, valiokuntajäsenyydet)."
      methodologyCaveats="Karkeaa avainsanapohjaista vertailua: sama otsikko lasketaan molemmille puolille, kun se esiintyy. Tarkka aiheluokitus ja vaalikoneen vastausten yhdistäminen tulevat myöhemmissä vaiheissa."
      isEmpty={isEmpty}
      emptyState="Riittävää aineistoa sanat-vs-teot -vertailuun ei vielä ole tämän edustajan kohdalla."
    >
      {pairs ? (
        <Stack spacing={1.25}>
          {pairs.map((p) => {
            const max = Math.max(p.words, p.deeds, 1);
            const wordPct = (p.words / max) * 50;
            const deedPct = (p.deeds / max) * 50;
            return (
              <Box key={p.area.label}>
                <Typography
                  variant="body2"
                  sx={{ color: themed.textPrimary, fontWeight: 600 }}
                >
                  {p.area.label}
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 0,
                    height: 18,
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      pr: 0.75,
                      borderRight: `1px solid ${themed.dataBorder}`,
                      height: "100%",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        right: 0,
                        top: 4,
                        bottom: 4,
                        width: `${wordPct}%`,
                        backgroundColor: themed.accent,
                        opacity: 0.7,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        position: "relative",
                        color: themed.textSecondary,
                        fontFamily: "monospace",
                        zIndex: 1,
                      }}
                    >
                      {p.words} sanaa
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-start",
                      pl: 0.75,
                      height: "100%",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        left: 0,
                        top: 4,
                        bottom: 4,
                        width: `${deedPct}%`,
                        backgroundColor: themed.success ?? "#2e7d32",
                        opacity: 0.7,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        position: "relative",
                        color: themed.textSecondary,
                        fontFamily: "monospace",
                        zIndex: 1,
                      }}
                    >
                      {p.deeds} tekoa
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
          <Typography
            variant="caption"
            sx={{
              color: themed.textTertiary,
              fontStyle: "italic",
              mt: 1,
              display: "block",
            }}
          >
            Vasen palkki: puheenvuorot, välikysymykset ja kirjalliset
            kysymykset. Oikea palkki: allekirjoitetut aloitteet ja
            valiokuntajäsenyydet.
          </Typography>
        </Stack>
      ) : error ? (
        <Typography variant="body2" sx={{ color: themed.textTertiary }}>
          Sanat vs. teot -vertailua ei voitu ladata.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={32} />
          ))}
        </Stack>
      )}
    </SectionShell>
  );
};

export default SanatVsTeot;
