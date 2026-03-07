import {
  BugReport,
  CheckCircle,
  DatasetOutlined,
  DeleteOutline,
  Error as ErrorIcon,
  ExpandLess,
  ExpandMore,
  Info,
  PlayArrow,
  Warning,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";
import { apiFetch } from "#client/utils/fetch";
import { colors, spacing } from "../../theme";

// ── Types ────────────────────────────────────────────────────────────────────

type Severity = "error" | "warning" | "info";
type ResolutionStatus = "unresolved" | "bug" | "data_source_issue";

interface CheckResolution {
  status: ResolutionStatus;
  summary: string;
  updatedAt: string;
}

interface ViolationRow extends Record<string, unknown> {
  _key: string;
}

interface SanityCheckResult {
  id: string;
  category: string;
  severity: Severity;
  name: string;
  description: string;
  passed: boolean;
  violations: ViolationRow[];
  totalViolations: number;
  resolution: CheckResolution | null;
  violationComments: Record<string, string>;
  error?: string;
}

interface OrphanedResolution {
  checkId: string;
  resolution: CheckResolution;
}

interface Progress {
  current: number;
  total: number;
  checkName: string;
}

// Server WebSocket message shapes
type WsMessage =
  | { type: "progress"; current: number; total: number; checkName: string }
  | { type: "check_result"; result: SanityCheckResult }
  | {
      type: "complete";
      ranAt: string;
      orphanedResolutions: OrphanedResolution[];
    }
  | { type: "error"; message: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const RESOLUTION_LABELS: Record<ResolutionStatus, string> = {
  unresolved: "Ratkaisematon",
  bug: "Virhe koodissa",
  data_source_issue: "Lähdedatan ongelma",
};

// ── Small components ──────────────────────────────────────────────────────────

const SeverityIcon: React.FC<{ severity: Severity }> = ({ severity }) => {
  if (severity === "error") return <ErrorIcon fontSize="small" color="error" />;
  if (severity === "warning")
    return <Warning fontSize="small" color="warning" />;
  return <Info fontSize="small" color="info" />;
};

// ── ResolutionPanel ───────────────────────────────────────────────────────────

const ResolutionPanel: React.FC<{
  checkId: string;
  resolution: CheckResolution | null;
  onUpdate: (checkId: string, resolution: CheckResolution | null) => void;
}> = ({ checkId, resolution, onUpdate }) => {
  const [summaryDraft, setSummaryDraft] = useState(resolution?.summary ?? "");

  const save = async (status: ResolutionStatus, summary: string) => {
    await apiFetch(`/api/sanity/resolution/${checkId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, summary }),
    });
    onUpdate(checkId, { status, summary, updatedAt: new Date().toISOString() });
  };

  const remove = async () => {
    await apiFetch(`/api/sanity/resolution/${checkId}`, { method: "DELETE" });
    setSummaryDraft("");
    onUpdate(checkId, null);
  };

  const currentStatus = resolution?.status ?? "unresolved";

  return (
    <Box
      sx={{
        p: 1.5,
        border: `1px solid ${colors.dataBorder}`,
        borderRadius: 1,
        background: colors.backgroundPaper,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          color: colors.textSecondary,
          display: "block",
          mb: 1,
        }}
      >
        Ratkaisu
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Tila</InputLabel>
          <Select
            label="Tila"
            value={currentStatus}
            onChange={(e) =>
              save(e.target.value as ResolutionStatus, summaryDraft)
            }
          >
            {(Object.keys(RESOLUTION_LABELS) as ResolutionStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {RESOLUTION_LABELS[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Selitys"
          placeholder="Miksi tarkistus ei läpäise…"
          multiline
          minRows={1}
          maxRows={4}
          value={summaryDraft}
          onChange={(e) => setSummaryDraft(e.target.value)}
          onBlur={() => save(currentStatus, summaryDraft)}
          sx={{ flex: 1, minWidth: 200 }}
        />

        {resolution && (
          <Tooltip title="Poista ratkaisu">
            <IconButton size="small" onClick={remove}>
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {resolution?.updatedAt && (
        <Typography
          variant="caption"
          sx={{ color: colors.textTertiary, mt: 0.5, display: "block" }}
        >
          Päivitetty {new Date(resolution.updatedAt).toLocaleString("fi-FI")}
        </Typography>
      )}
    </Box>
  );
};

// ── ViolationTable ────────────────────────────────────────────────────────────

const ViolationTable: React.FC<{
  checkId: string;
  violations: ViolationRow[];
  totalViolations: number;
  comments: Record<string, string>;
  onCommentSaved: (
    checkId: string,
    violationKey: string,
    comment: string,
  ) => void;
}> = ({ checkId, violations, totalViolations, comments, onCommentSaved }) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (violations.length === 0) return null;

  const dataKeys = Object.keys(violations[0]).filter((k) => k !== "_key");

  const saveComment = async (violationKey: string, comment: string) => {
    await apiFetch("/api/sanity/violation-comment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkId, violationKey, comment }),
    });
    onCommentSaved(checkId, violationKey, comment);
  };

  return (
    <>
      {totalViolations > violations.length && (
        <Typography
          variant="caption"
          sx={{ color: colors.textSecondary, display: "block", mt: 1.5 }}
        >
          Yhteensä {totalViolations} rikkomusta — näytetään {violations.length}{" "}
          ensimmäistä
        </Typography>
      )}
      <TableContainer
        sx={{
          mt: totalViolations > violations.length ? 0.5 : 1.5,
          maxHeight: 400,
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {dataKeys.map((k) => (
                <TableCell
                  key={k}
                  sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  {k}
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 600, minWidth: 200 }}>
                Kommentti
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.map((row) => {
              const vk = row._key;
              const commentValue = drafts[vk] ?? comments[vk] ?? "";
              return (
                <TableRow key={vk} hover>
                  {dataKeys.map((k) => (
                    <TableCell
                      key={k}
                      sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                    >
                      {String(row[k] ?? "")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <TextField
                      size="small"
                      variant="standard"
                      placeholder="Lisää kommentti…"
                      value={commentValue}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [vk]: e.target.value }))
                      }
                      onBlur={() => saveComment(vk, commentValue)}
                      fullWidth
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

// ── CheckCard ─────────────────────────────────────────────────────────────────

const CheckCard: React.FC<{
  check: SanityCheckResult;
  onResolutionUpdate: (
    checkId: string,
    resolution: CheckResolution | null,
  ) => void;
  onCommentSaved: (
    checkId: string,
    violationKey: string,
    comment: string,
  ) => void;
}> = ({ check, onResolutionUpdate, onCommentSaved }) => {
  const hasIssues = !check.passed || !!check.error;
  const [expanded, setExpanded] = useState(false);

  const borderColor = !hasIssues
    ? colors.dataBorder
    : check.severity === "error"
      ? "error.light"
      : check.severity === "warning"
        ? "warning.light"
        : "info.light";

  return (
    <Paper variant="outlined" sx={{ p: 0, overflow: "hidden", borderColor }}>
      <Box
        onClick={() => hasIssues && setExpanded((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.25,
          cursor: hasIssues ? "pointer" : "default",
          "&:hover": hasIssues ? { bgcolor: colors.backgroundSubtle } : {},
        }}
      >
        {hasIssues ? (
          <SeverityIcon severity={check.severity} />
        ) : (
          <CheckCircle fontSize="small" color="success" />
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {check.name}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
            {check.description}
          </Typography>
        </Box>

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}
        >
          {hasIssues && (
            <Chip
              label={
                check.error
                  ? "Virhe kyselyssä"
                  : `${check.totalViolations} rikkomusta`
              }
              size="small"
              color={
                check.severity === "error"
                  ? "error"
                  : check.severity === "warning"
                    ? "warning"
                    : "info"
              }
              variant="outlined"
            />
          )}
          {check.resolution && check.resolution.status !== "unresolved" && (
            <Chip
              label={RESOLUTION_LABELS[check.resolution.status]}
              size="small"
              icon={
                check.resolution.status === "bug" ? (
                  <BugReport />
                ) : (
                  <DatasetOutlined />
                )
              }
              variant="filled"
              sx={{ bgcolor: colors.backgroundSubtle }}
            />
          )}
          {hasIssues &&
            (expanded ? (
              <ExpandLess fontSize="small" />
            ) : (
              <ExpandMore fontSize="small" />
            ))}
        </Box>
      </Box>

      {hasIssues && (
        <Collapse in={expanded}>
          <Divider />
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            {check.error && (
              <Alert
                severity="error"
                sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
              >
                {check.error}
              </Alert>
            )}
            <ResolutionPanel
              checkId={check.id}
              resolution={check.resolution}
              onUpdate={onResolutionUpdate}
            />
            {check.violations.length > 0 && (
              <ViolationTable
                checkId={check.id}
                violations={check.violations}
                totalViolations={check.totalViolations}
                comments={check.violationComments}
                onCommentSaved={onCommentSaved}
              />
            )}
          </Box>
        </Collapse>
      )}
    </Paper>
  );
};

// ── OrphanedResolutions ───────────────────────────────────────────────────────

const OrphanedResolutions: React.FC<{
  orphans: OrphanedResolution[];
  onDelete: (checkId: string) => void;
}> = ({ orphans, onDelete }) => {
  if (orphans.length === 0) return null;

  const handleDelete = async (checkId: string) => {
    await apiFetch(`/api/sanity/resolution/${checkId}`, { method: "DELETE" });
    onDelete(checkId);
  };

  return (
    <Box sx={{ mt: spacing.lg }}>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, mb: 1, color: colors.textSecondary }}
      >
        Vanhentuneet ratkaisut
      </Typography>
      <Typography variant="body2" sx={{ color: colors.textTertiary, mb: 1.5 }}>
        Nämä ratkaisut viittaavat tarkistuksiin, joita ei enää ole olemassa.
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {orphans.map(({ checkId, resolution }) => (
          <Paper
            key={checkId}
            variant="outlined"
            sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 2 }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                sx={{ fontFamily: "monospace", fontWeight: 600 }}
              >
                {checkId}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: colors.textSecondary }}
              >
                {RESOLUTION_LABELS[resolution.status]}
                {resolution.summary ? ` — ${resolution.summary}` : ""}
              </Typography>
            </Box>
            <Tooltip title="Poista">
              <IconButton size="small" onClick={() => handleDelete(checkId)}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Laadunvalvonta() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [checks, setChecks] = useState<SanityCheckResult[]>([]);
  const [ranAt, setRanAt] = useState<string | null>(null);
  const [orphans, setOrphans] = useState<OrphanedResolution[]>([]);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/sanity/last-run")
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        const run = data as {
          checks: SanityCheckResult[];
          ranAt: string;
          orphanedResolutions: OrphanedResolution[];
        };
        setChecks(run.checks);
        setRanAt(run.ranAt);
        setOrphans(run.orphanedResolutions);
      })
      .catch(() => {});
  }, []);

  const runChecks = () => {
    setRunning(true);
    setProgress(null);
    setChecks([]);
    setRanAt(null);
    setOrphans([]);
    setRunError(null);

    const wsUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/sanity/run-ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event: MessageEvent<string>) => {
      const msg = JSON.parse(event.data) as WsMessage;

      if (msg.type === "progress") {
        setProgress({
          current: msg.current,
          total: msg.total,
          checkName: msg.checkName,
        });
      } else if (msg.type === "check_result") {
        setChecks((prev) => [...prev, msg.result]);
      } else if (msg.type === "complete") {
        setRanAt(msg.ranAt);
        setOrphans(msg.orphanedResolutions);
        setProgress(null);
        setRunning(false);
      } else if (msg.type === "error") {
        setRunError(msg.message);
        setProgress(null);
        setRunning(false);
      }
    };

    ws.onerror = () => {
      setRunError("WebSocket-yhteyden muodostaminen epäonnistui.");
      setProgress(null);
      setRunning(false);
    };

    ws.onclose = () => {
      // Ensure loading state is cleared if the connection drops unexpectedly.
      setRunning(false);
    };
  };

  const updateResolution = (
    checkId: string,
    resolution: CheckResolution | null,
  ) => {
    setChecks((prev) =>
      prev.map((c) => (c.id === checkId ? { ...c, resolution } : c)),
    );
  };

  const saveComment = (
    checkId: string,
    violationKey: string,
    comment: string,
  ) => {
    setChecks((prev) =>
      prev.map((c) =>
        c.id === checkId
          ? {
              ...c,
              violationComments: {
                ...c.violationComments,
                [violationKey]: comment,
              },
            }
          : c,
      ),
    );
  };

  const deleteOrphan = (checkId: string) => {
    setOrphans((prev) => prev.filter((o) => o.checkId !== checkId));
  };

  // Group and sort arrived checks
  const grouped = Object.entries(
    checks.reduce<Record<string, SanityCheckResult[]>>((acc, check) => {
      if (!acc[check.category]) acc[check.category] = [];
      acc[check.category].push(check);
      return acc;
    }, {}),
  ).map(([category, cats]) => ({
    category,
    checks: [...cats].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    ),
  }));

  const failedCount = checks.filter((c) => !c.passed).length;
  const hasResults = checks.length > 0;

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: spacing.md,
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Laadunvalvonta
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: colors.textSecondary, mt: 0.5 }}
          >
            Tietokannasta suoritettavat tarkistukset datan laadun
            varmistamiseksi. Hylätty tarkistus voi johtua koodivirheestä tai
            lähdedatan ongelmasta.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={runChecks}
          disabled={running}
          sx={{ flexShrink: 0, mt: 0.5 }}
        >
          Suorita tarkistukset
        </Button>
      </Box>

      {/* Progress bar */}
      {running && (
        <Box sx={{ mb: spacing.md }}>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}
          >
            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
              {progress
                ? `Tarkistetaan ${progress.current}/${progress.total}: ${progress.checkName}`
                : "Aloitetaan…"}
            </Typography>
            {progress && (
              <Typography variant="caption" sx={{ color: colors.textTertiary }}>
                {Math.round((progress.current / progress.total) * 100)} %
              </Typography>
            )}
          </Box>
          <LinearProgress
            variant={progress ? "determinate" : "indeterminate"}
            value={
              progress ? (progress.current / progress.total) * 100 : undefined
            }
          />
        </Box>
      )}

      {runError && (
        <Alert severity="error" sx={{ mb: spacing.md }}>
          {runError}
        </Alert>
      )}

      {/* Summary chips — shown after all checks finish */}
      {ranAt && (
        <Box
          sx={{
            mb: spacing.md,
            display: "flex",
            gap: 1.5,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" sx={{ color: colors.textSecondary }}>
            Suoritettu {new Date(ranAt).toLocaleString("fi-FI")}
          </Typography>
          <Chip
            icon={<CheckCircle />}
            label={`${checks.length - failedCount} läpäissyt`}
            color="success"
            size="small"
            variant="outlined"
          />
          {failedCount > 0 && (
            <Chip
              icon={<ErrorIcon />}
              label={`${failedCount} hylätty`}
              color="error"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )}

      {/* Check results — rendered incrementally as they arrive */}
      {grouped.map(({ category, checks: catChecks }) => (
        <Box key={category} sx={{ mb: spacing.lg }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            {category}
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {catChecks.map((check) => (
              <CheckCard
                key={check.id}
                check={check}
                onResolutionUpdate={updateResolution}
                onCommentSaved={saveComment}
              />
            ))}
          </Box>
        </Box>
      ))}

      <OrphanedResolutions orphans={orphans} onDelete={deleteOrphan} />

      {!hasResults && !running && !runError && (
        <Box
          sx={{
            mt: spacing.xl,
            textAlign: "center",
            color: colors.textTertiary,
          }}
        >
          <Typography variant="body2">
            Paina "Suorita tarkistukset" aloittaaksesi.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
