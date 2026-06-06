import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import React from "react";
import { apiFetch } from "#client/utils/fetch";
import { useThemedColors } from "../../../theme/ThemeContext";
import { SectionShell } from "../components/SectionShell";
import { navigateToDocument } from "../utils/navigateToDocument";
import type { ProfileSectionProps } from "./registry";

interface InitiativeRow {
  id: number;
  parliament_identifier: string;
  initiative_type_code: string;
  title: string | null;
  submission_date: string | null;
  decision_outcome: string | null;
  latest_stage_code: string | null;
  relation_role: "first_signer" | "co_signer";
  is_first_signer: 0 | 1;
  subjects: string[];
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fi-FI") : "—";

const PAGE_SIZE = 12;

const Bills: React.FC<ProfileSectionProps> = ({ personId }) => {
  const themed = useThemedColors();
  const [rows, setRows] = React.useState<InitiativeRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setRows(null);
    setError(false);
    setShowAll(false);
    apiFetch(`/api/person/${personId}/initiatives`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ctrl.signal.aborted && Array.isArray(d)) setRows(d);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
  }, [personId]);

  const firstSignerCount = rows?.filter((r) => r.is_first_signer).length ?? 0;
  const coSignerCount = (rows?.length ?? 0) - firstSignerCount;
  const visible = showAll ? rows : rows?.slice(0, PAGE_SIZE);

  return (
    <SectionShell
      anchor="aloitteet"
      title="Aloitteet"
      methodology="Aloitteet kattavat lakialoitteet, talousarvioaloitteet ja toimenpidealoitteet, joissa edustaja on ensimmäinen allekirjoittaja tai muu allekirjoittaja. Päätöksen tila tulee suoraan eduskunnan datasta."
      isEmpty={rows !== null && rows.length === 0}
      emptyState="Edustaja ei ole allekirjoittanut yhtään aloitetta tällä kaudella."
      subtitle={
        rows
          ? `${firstSignerCount} ensimmäisenä allekirjoittajana, ${coSignerCount} muuna allekirjoittajana.`
          : undefined
      }
    >
      {rows ? (
        <Stack spacing={1}>
          {visible?.map((row) => (
            <Box
              key={row.id}
              component="button"
              type="button"
              onClick={() => navigateToDocument(row.parliament_identifier)}
              sx={{
                py: 1,
                background: "none",
                border: "none",
                borderBottom: `1px solid ${themed.dataBorder}`,
                textAlign: "left",
                width: "100%",
                cursor: "pointer",
                px: 0,
                "&:hover": { backgroundColor: themed.backgroundSubtle },
              }}
            >
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{ flexWrap: "wrap" }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "monospace",
                        color: themed.textTertiary,
                        fontWeight: 700,
                      }}
                    >
                      {row.parliament_identifier}
                    </Typography>
                    {row.is_first_signer ? (
                      <Chip
                        label="Ensimmäinen allekirjoittaja"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.6rem",
                          bgcolor: themed.accent,
                          color: "#fff",
                        }}
                      />
                    ) : (
                      <Chip
                        label="Muu allekirjoittaja"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.6rem",
                          bgcolor: themed.backgroundSubtle,
                          color: themed.textSecondary,
                        }}
                      />
                    )}
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{ color: themed.textPrimary, mt: 0.25 }}
                  >
                    {row.title ?? "Otsikko puuttuu"}
                  </Typography>
                  {row.decision_outcome && (
                    <Typography
                      variant="caption"
                      sx={{ color: themed.textSecondary, display: "block" }}
                    >
                      Tila: {row.decision_outcome}
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
                  {formatDate(row.submission_date)}
                </Typography>
              </Stack>
            </Box>
          ))}
          {rows.length > PAGE_SIZE && (
            <Box
              component="button"
              type="button"
              onClick={() => setShowAll((v) => !v)}
              sx={{
                background: "none",
                border: "none",
                color: themed.accent,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                py: 1,
                textAlign: "left",
              }}
            >
              {showAll ? "Näytä vähemmän" : `Näytä kaikki (${rows.length})`}
            </Box>
          )}
        </Stack>
      ) : error ? (
        <Typography variant="body2" sx={{ color: themed.textTertiary }}>
          Aloitteita ei voitu ladata.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={48} />
          ))}
        </Stack>
      )}
    </SectionShell>
  );
};

export default Bills;
