import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import UpdateIcon from "@mui/icons-material/Update";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState, type ReactNode } from "react";
import { DataCard, PageHeader } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

interface DiffHunk {
  op: "add" | "remove" | "keep";
  text: string;
}

interface FieldChange {
  name: string;
  summary: string;
  diff?: DiffHunk[];
}

interface ChangedRowEntry {
  pk: number;
  changedAt: string;
  fields: FieldChange[];
}

interface TableChanges {
  newRows: number;
  changedRows: ChangedRowEntry[];
}

interface ChangesReport {
  generatedAt: string;
  previousRebuildAt: string | null;
  totalNewRows: number;
  totalChangedRows: number;
  tables: Record<string, TableChanges>;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI");
}

function Changes(): ReactNode {
  const themedColors = useThemedColors();
  const [report, setReport] = useState<ChangesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/changes-report")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ChangesReport>;
      })
      .then(setReport)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !report) {
    return (
      <Box sx={{ mt: 4 }}>
        <PageHeader title="Muutokset" subtitle="Tietokannan päivityshistoria" />
        <Alert severity="info" sx={{ mt: 2 }}>
          Muutosraportti ei ole vielä saatavilla. Aja tietokantapäivitys ensin.
        </Alert>
      </Box>
    );
  }

  const tablesWithChanges = Object.entries(report.tables).filter(
    ([, t]) => t.newRows > 0 || t.changedRows.length > 0,
  );

  return (
    <Box>
      <PageHeader
        title="Muutokset"
        subtitle={
          report.previousRebuildAt
            ? `Muutokset edellisestä päivityksestä (${fmtDate(report.previousRebuildAt)})`
            : "Ensimmäinen tietokantapäivitys"
        }
      />

      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Chip
          icon={<NewReleasesIcon />}
          label={`${report.totalNewRows} uutta riviä`}
          color="success"
          variant="outlined"
          size="small"
        />
        <Chip
          icon={<UpdateIcon />}
          label={`${report.totalChangedRows} muuttunutta riviä`}
          color="warning"
          variant="outlined"
          size="small"
        />
        <Chip
          label={`Raportti luotu ${fmtDate(report.generatedAt)}`}
          variant="outlined"
          size="small"
          sx={{ color: themedColors.textTertiary }}
        />
      </Stack>

      {tablesWithChanges.length === 0 ? (
        <DataCard>
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary">
              Ei muutoksia edellisen päivityksen jälkeen.
            </Typography>
          </Box>
        </DataCard>
      ) : (
        <Stack spacing={2}>
          {tablesWithChanges.map(([tableName, tableChanges]) => (
            <DataCard key={tableName}>
              <Box sx={{ p: 2, pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {tableName}
                  </Typography>
                  {tableChanges.newRows > 0 && (
                    <Chip
                      label={`+${tableChanges.newRows} uutta`}
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {tableChanges.changedRows.length > 0 && (
                    <Chip
                      label={`${tableChanges.changedRows.length} muutettu`}
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
              </Box>

              {tableChanges.changedRows.length > 0 && (
                <>
                  <Divider />
                  <Box sx={{ px: 1 }}>
                    {tableChanges.changedRows.map((row) => (
                      <Accordion
                        key={row.pk}
                        disableGutters
                        elevation={0}
                        sx={{
                          "&:before": { display: "none" },
                          background: "transparent",
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body2" fontWeight={500}>
                              pk={row.pk}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: themedColors.textTertiary }}
                            >
                              {fmtDate(row.changedAt)}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: themedColors.textSecondary }}
                            >
                              {row.fields.map((f) => f.name).join(", ")}
                            </Typography>
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          <Stack spacing={1.5}>
                            {row.fields.map((field) => (
                              <Box key={field.name}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontFamily: "monospace",
                                    fontWeight: 700,
                                    color: themedColors.textSecondary,
                                    display: "block",
                                    mb: 0.5,
                                  }}
                                >
                                  {field.name}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{
                                      fontFamily: "monospace",
                                      fontWeight: 400,
                                      color: themedColors.textTertiary,
                                      ml: 1,
                                    }}
                                  >
                                    {field.summary}
                                  </Typography>
                                </Typography>
                                {field.diff && (
                                  <Box
                                    sx={{
                                      fontFamily: "monospace",
                                      fontSize: "0.7rem",
                                      lineHeight: 1.6,
                                      borderRadius: 1,
                                      overflow: "auto",
                                      maxHeight: 320,
                                      bgcolor: "action.hover",
                                      px: 1.5,
                                      py: 1,
                                    }}
                                  >
                                    {field.diff.map((hunk, i) => (
                                      <Box
                                        key={i}
                                        component="div"
                                        sx={{
                                          whiteSpace: "pre",
                                          color:
                                            hunk.op === "add"
                                              ? "success.main"
                                              : hunk.op === "remove"
                                                ? "error.main"
                                                : themedColors.textTertiary,
                                        }}
                                      >
                                        {hunk.op === "add"
                                          ? `+ ${hunk.text}`
                                          : hunk.op === "remove"
                                            ? `- ${hunk.text}`
                                            : `  ${hunk.text}`}
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                </>
              )}
            </DataCard>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default function ChangesPage(): ReactNode {
  return <Changes />;
}
