import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import React from "react";
import { apiFetch } from "#client/utils/fetch";
import { useThemedColors } from "../../../theme/ThemeContext";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

interface TrustPosition {
  id?: number;
  organization?: string | null;
  role?: string | null;
  period?: string | null;
}

interface TiesResponse {
  activeTrustPositions: TrustPosition[];
  allTrustPositions: TrustPosition[];
  generatedAt: string;
}

const Sidonnaisuudet: React.FC<ProfileSectionProps> = ({ personId }) => {
  const themed = useThemedColors();
  const [data, setData] = React.useState<TiesResponse | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError(false);
    apiFetch(`/api/person/${personId}/ties`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ctrl.signal.aborted && d) setData(d);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
  }, [personId]);

  const active = data?.activeTrustPositions ?? [];
  const inactive = (data?.allTrustPositions ?? []).filter(
    (tp) => !active.some((a) => a.id === tp.id),
  );
  const isEmpty = data !== null && active.length === 0 && inactive.length === 0;

  const renderRow = (tp: TrustPosition, dim: boolean) => (
    <Stack
      key={tp.id ?? `${tp.organization}-${tp.role}-${tp.period}`}
      direction="row"
      alignItems="flex-start"
      justifyContent="space-between"
      spacing={1.5}
      sx={{
        py: 0.75,
        borderBottom: `1px solid ${themed.dataBorder}`,
        opacity: dim ? 0.6 : 1,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{ color: themed.textPrimary, fontWeight: 600 }}
        >
          {tp.organization ?? "Tuntematon yhteisö"}
        </Typography>
        {tp.role && (
          <Typography
            variant="caption"
            sx={{ color: themed.textSecondary, display: "block" }}
          >
            {tp.role}
          </Typography>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: themed.textTertiary,
          fontFamily: "monospace",
          flexShrink: 0,
        }}
      >
        {tp.period ?? "—"}
      </Typography>
    </Stack>
  );

  return (
    <SectionShell
      anchor="sidonnaisuudet"
      title="Sidonnaisuudet"
      methodology="Sidonnaisuudet kootaan luottamustehtävistä ja työhistoriasta. Tällä hetkellä voimassa olevat tehtävät näytetään ensin. Eduskunnan virallisen sidonnaisuusrekisterin tiedot lisätään myöhemmin."
      methodologyCaveats="Voimassaolo päätellään ajanjakson päättymisvuodesta — tarkka rekisteritieto puuttuu vielä."
      isEmpty={isEmpty}
      emptyState="Edustajalle ei ole kirjattu luottamustehtäviä eikä työhistoriaa."
    >
      {data ? (
        <Stack spacing={2}>
          <Box>
            <Typography
              variant="overline"
              sx={{ color: themed.textTertiary, letterSpacing: "0.06em" }}
            >
              Voimassa olevat
            </Typography>
            {active.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  color: themed.textTertiary,
                  fontStyle: "italic",
                  mt: 0.5,
                }}
              >
                Ei voimassa olevia luottamustehtäviä.
              </Typography>
            ) : (
              <Box>{active.map((tp) => renderRow(tp, false))}</Box>
            )}
          </Box>
          {inactive.length > 0 && (
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.75}
                sx={{ mb: 0.5 }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: themed.textTertiary, letterSpacing: "0.06em" }}
                >
                  Aiemmat
                </Typography>
                <Chip
                  label={inactive.length}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: "0.6rem",
                    bgcolor: themed.backgroundSubtle,
                  }}
                />
              </Stack>
              <Box>{inactive.map((tp) => renderRow(tp, true))}</Box>
            </Box>
          )}
        </Stack>
      ) : error ? (
        <Typography variant="body2" sx={{ color: themed.textTertiary }}>
          Sidonnaisuuksia ei voitu ladata.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rectangular" height={28} />
          ))}
        </Stack>
      )}
    </SectionShell>
  );
};

export default Sidonnaisuudet;
