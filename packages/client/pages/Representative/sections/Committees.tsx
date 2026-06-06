import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import React from "react";
import { apiFetch } from "#client/utils/fetch";
import { useThemedColors } from "../../../theme/ThemeContext";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

interface CommitteeRow {
  id: number;
  committee_code: string;
  committee_name: string;
  role: string;
  start_date: string;
  end_date: string | null;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fi-FI") : "—";

const Committees: React.FC<ProfileSectionProps> = ({ personId }) => {
  const themed = useThemedColors();
  const [rows, setRows] = React.useState<CommitteeRow[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setRows(null);
    setError(false);
    apiFetch(`/api/person/${personId}/committees`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ctrl.signal.aborted && Array.isArray(d)) setRows(d);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
  }, [personId]);

  const today = new Date().toISOString().slice(0, 10);
  const active = rows?.filter((r) => !r.end_date || r.end_date >= today) ?? [];
  const past = rows?.filter((r) => r.end_date && r.end_date < today) ?? [];

  const renderRow = (r: CommitteeRow, dim: boolean) => (
    <Stack
      key={r.id}
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
          {r.committee_name}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.25 }}>
          <Chip
            label={r.role}
            size="small"
            sx={{
              height: 16,
              fontSize: "0.6rem",
              bgcolor: themed.backgroundSubtle,
              color: themed.textSecondary,
            }}
          />
        </Stack>
      </Box>
      <Typography
        variant="caption"
        sx={{ color: themed.textTertiary, fontFamily: "monospace", flexShrink: 0 }}
      >
        {formatDate(r.start_date)} – {formatDate(r.end_date)}
      </Typography>
    </Stack>
  );

  return (
    <SectionShell
      anchor="valiokunnat"
      title="Valiokunnat"
      methodology="Valiokuntajäsenyydet kootaan eduskunnan avoimesta datasta. Rooli (jäsen, varajäsen, puheenjohtaja) ja jäsenyyden ajanjakso näytetään kunkin valiokunnan kohdalla."
      isEmpty={rows !== null && rows.length === 0}
      emptyState="Edustajalla ei ole kirjattuja valiokuntajäsenyyksiä."
    >
      {rows ? (
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
                sx={{ color: themed.textTertiary, fontStyle: "italic", mt: 0.5 }}
              >
                Ei voimassa olevia valiokuntajäsenyyksiä.
              </Typography>
            ) : (
              <Box>{active.map((r) => renderRow(r, false))}</Box>
            )}
          </Box>
          {past.length > 0 && (
            <Box>
              <Typography
                variant="overline"
                sx={{ color: themed.textTertiary, letterSpacing: "0.06em" }}
              >
                Aiemmat ({past.length})
              </Typography>
              <Box>{past.map((r) => renderRow(r, true))}</Box>
            </Box>
          )}
        </Stack>
      ) : error ? (
        <Typography variant="body2" sx={{ color: themed.textTertiary }}>
          Valiokuntatietoja ei voitu ladata.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rectangular" height={32} />
          ))}
        </Stack>
      )}
    </SectionShell>
  );
};

export default Committees;
