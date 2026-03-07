import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HistoryIcon from "@mui/icons-material/History";
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
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { type ReactNode, useEffect, useState } from "react";
import { DataCard, PageHeader } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";

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

interface RunEntry {
  id: string;
  generatedAt: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("fi-FI");
}

function Changes(): ReactNode {
  const themedColors = useThemedColors();
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [report, setReport] = useState<ChangesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/changes-history")
      .then(async (res) => await res.json())
      .then(({ runs: r }) => {
        setRuns(r);
        if (r.length > 0) setSelectedRun(r[0].id);
      })
      .catch(() => {
        // Fall back to latest report
        setSelectedRun("latest");
      });
  }, []);

  useEffect(() => {
    if (selectedRun === null) return;
    setLoading(true);
    setError(null);
    const url =
      selectedRun === "latest"
        ? ("/api/changes-report" as const)
        : (`/api/changes-report?run=${selectedRun}` as const);
    apiFetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setReport)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [selectedRun]);

  const showRunSelector = runs.length > 1;

  return (
    <Box>
      <PageHeader
        title="Muutokset"
        subtitle={
          report
            ? report.previousRebuildAt
              ? `Muutokset edellisestä päivityksestä (${fmtDate(report.previousRebuildAt)})`
              : "Ensimmäinen tietokantapäivitys"
            : "Tietokannan päivityshistoria"
        }
      />

      {showRunSelector && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <HistoryIcon
            fontSize="small"
            sx={{ color: themedColors.textSecondary }}
          />
          <Typography
            variant="body2"
            sx={{ color: themedColors.textSecondary }}
          >
            Päivitysajo:
          </Typography>
          <Select
            size="small"
            value={selectedRun ?? ""}
            onChange={(e) => setSelectedRun(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            {runs.map((run, i) => (
              <MenuItem key={run.id} value={run.id}>
                {fmtDate(run.generatedAt)}
                {i === 0 ? " (uusin)" : ""}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (error || !report) && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Muutosraportti ei ole vielä saatavilla. Aja tietokantapäivitys ensin.
        </Alert>
      )}

      {!loading && report && (
        <>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}
          >
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

          {Object.entries(report.tables).filter(
            ([, t]) => t.newRows > 0 || t.changedRows.length > 0,
          ).length === 0 ? (
            <DataCard>
              <Box sx={{ p: 3 }}>
                <Typography color="text.secondary">
                  Ei muutoksia edellisen päivityksen jälkeen.
                </Typography>
              </Box>
            </DataCard>
          ) : (
            <Stack spacing={2}>
              {Object.entries(report.tables)
                .filter(([, t]) => t.newRows > 0 || t.changedRows.length > 0)
                .map(([tableName, tableChanges]) => (
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
                                <Stack
                                  direction="row"
                                  spacing={2}
                                  alignItems="center"
                                >
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
        </>
      )}
    </Box>
  );
}

export default function ChangesPage(): ReactNode {
  return <Changes />;
}
