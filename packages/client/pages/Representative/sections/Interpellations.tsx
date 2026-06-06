import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import React from "react";
import { apiFetch } from "#client/utils/fetch";
import { useThemedColors } from "../../../theme/ThemeContext";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

interface QuestionRow {
  question_kind: "interpellation" | "written_question" | "oral_question";
  id: number;
  parliament_identifier: string;
  title: string | null;
  submission_date: string | null;
  relation_role: "asker" | "first_signer" | "signer";
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fi-FI") : "—";

const roleLabel: Record<QuestionRow["relation_role"], string> = {
  asker: "Esittäjä",
  first_signer: "Ensimmäinen allekirjoittaja",
  signer: "Allekirjoittaja",
};

const Interpellations: React.FC<ProfileSectionProps> = ({ personId }) => {
  const themed = useThemedColors();
  const [rows, setRows] = React.useState<QuestionRow[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setRows(null);
    setError(false);
    apiFetch(`/api/person/${personId}/interpellations`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ctrl.signal.aborted && Array.isArray(d)) setRows(d);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
  }, [personId]);

  return (
    <SectionShell
      anchor="valikysymykset"
      title="Välikysymykset"
      methodology="Välikysymykset ovat hallitukselle osoitettuja kollektiivisia kysymyksiä. Lista kerää välikysymykset, joissa edustaja on allekirjoittajana tai esittäjänä."
      methodologyCaveats="Hallituksen vastauksen täysimittainen yhdistäminen kuhunkin välikysymykseen tulee myöhemmässä vaiheessa."
      isEmpty={rows !== null && rows.length === 0}
      emptyState="Edustaja ei ole allekirjoittanut yhtään välikysymystä tällä kaudella."
    >
      {rows ? (
        <Stack spacing={1}>
          {rows.map((row) => (
            <Box
              key={row.id}
              sx={{
                py: 1,
                borderBottom: `1px solid ${themed.dataBorder}`,
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
                    <Chip
                      label={roleLabel[row.relation_role]}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: "0.6rem",
                        bgcolor:
                          row.relation_role === "asker" ||
                          row.relation_role === "first_signer"
                            ? themed.accent
                            : themed.backgroundSubtle,
                        color:
                          row.relation_role === "asker" ||
                          row.relation_role === "first_signer"
                            ? "#fff"
                            : themed.textSecondary,
                      }}
                    />
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{ color: themed.textPrimary, mt: 0.25 }}
                  >
                    {row.title ?? "Otsikko puuttuu"}
                  </Typography>
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
        </Stack>
      ) : error ? (
        <Typography variant="body2" sx={{ color: themed.textTertiary }}>
          Välikysymyksiä ei voitu ladata.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rectangular" height={48} />
          ))}
        </Stack>
      )}
    </SectionShell>
  );
};

export default Interpellations;
