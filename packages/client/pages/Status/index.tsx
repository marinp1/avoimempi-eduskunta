import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  OpenInNew as OpenInNewIcon,
  Storage as StorageIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface TableStatus {
  tableName: string;
  rowCount: number;
  hasData: boolean;
}

interface DataOverview {
  tables: TableStatus[];
  totalTables: number;
  tablesWithData: number;
  lastUpdated: string;
}

type SourceTableStatusState =
  | "empty"
  | "scraping"
  | "raw"
  | "parsing"
  | "parsed";

interface SourceTableStatus {
  tableName: string;
  apiRowCount: number;
  rawRows: number;
  parsedRows: number;
  rawPages: number;
  parsedPages: number;
  hasRawData: boolean;
  hasParsedData: boolean;
  rawLastUpdated: string | null;
  parsedLastUpdated: string | null;
  scrapeProgressPercent: number;
  parseProgressPercent: number;
  status: SourceTableStatusState;
}

interface SourceDataOverview {
  tables: SourceTableStatus[];
  totalTables: number;
  tablesWithRawData: number;
  tablesWithParsedData: number;
  lastUpdated: string;
}

interface AffectedRow {
  id: number;
  label: string;
  sourceUrl: string;
}

interface KnownDataException {
  id: string;
  checkName: string;
  description: string;
  reason: string;
  affectedRows: AffectedRow[];
}

interface SanityCheck {
  category: string;
  name: string;
  description: string;
  passed: boolean;
  details?: string;
  errorMessage?: string;
  knownExceptions?: KnownDataException[];
  constraintId?: string;
  queryKeys?: string[];
  queryReferences?: string[];
}

interface SanityCheckResult {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  knownExceptionCount: number;
  checks: SanityCheck[];
  lastRun: string;
}

export default function Status() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DataOverview | null>(null);
  const [sanityChecks, setSanityChecks] = useState<SanityCheckResult | null>(
    null,
  );
  const [sourceData, setSourceData] = useState<SourceDataOverview | null>(null);
  const [loadingSanityChecks, setLoadingSanityChecks] = useState(false);
  const [loadingSourceData, setLoadingSourceData] = useState(false);
  const [sourceDataError, setSourceDataError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview();
    fetchSanityChecks();
    fetchSourceDataStatus();
  }, []);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/status/overview");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
      console.error("Error fetching status:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSanityChecks = async () => {
    try {
      setLoadingSanityChecks(true);
      const response = await fetch("/api/status/sanity-checks");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSanityChecks(data);
    } catch (err) {
      console.error("Error fetching sanity checks:", err);
    } finally {
      setLoadingSanityChecks(false);
    }
  };

  const fetchSourceDataStatus = async () => {
    try {
      setLoadingSourceData(true);
      setSourceDataError(null);
      const response = await fetch("/api/status/source-data");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSourceData(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch source status";
      setSourceDataError(message);
      console.error("Error fetching source data status:", err);
    } finally {
      setLoadingSourceData(false);
    }
  };

  const getStatusColor = (hasData: boolean) => {
    return hasData ? "success" : "warning";
  };

  const getStatusIcon = (hasData: boolean) => {
    return hasData ? (
      <CheckCircleIcon color="success" fontSize="small" />
    ) : (
      <WarningIcon color="warning" fontSize="small" />
    );
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("fi-FI").format(num);
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("fi-FI");
  };

  const getSourceStatusLabel = (table: SourceTableStatus) => {
    switch (table.status) {
      case "scraping":
        return `Scraping ${table.scrapeProgressPercent.toFixed(1)}%`;
      case "parsing":
        return `Parsing ${table.parseProgressPercent.toFixed(1)}%`;
      case "raw":
        return "Raw";
      case "parsed":
        return "Parsed";
      default:
        return "Empty";
    }
  };

  const getSourceStatusColor = (status: SourceTableStatusState) => {
    switch (status) {
      case "scraping":
        return "info";
      case "raw":
        return "info";
      case "parsing":
        return "warning";
      case "parsed":
        return "success";
      default:
        return "warning";
    }
  };

  const shouldShowProgress = (status: SourceTableStatusState) =>
    status === "scraping" || status === "parsing";

  const getCompletenessPercentage = () => {
    if (!overview || overview.totalTables === 0) return 0;
    return Math.round((overview.tablesWithData / overview.totalTables) * 100);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!overview) {
    return null;
  }

  const completeness = getCompletenessPercentage();
  const totalDatabaseRows = overview.tables.reduce(
    (sum, table) => sum + table.rowCount,
    0,
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t("status.title")}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {t("status.subtitle")}
      </Typography>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <StorageIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">{overview.totalTables}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t("status.overview.totalTables")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">{overview.tablesWithData}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Tauluja datalla
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AssessmentIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">{completeness}%</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t("status.overview.completeness")}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={completeness}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AssessmentIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  {formatNumber(totalDatabaseRows)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t("status.overview.totalRows")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Database table row counts */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t("status.databaseTables.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t("status.databaseTables.description")}
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Taulu</TableCell>
                <TableCell align="right">
                  {t("status.databaseTables.rowCount")}
                </TableCell>
                <TableCell align="center">{t("common.status")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overview.tables.map((table) => (
                <TableRow key={table.tableName}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {table.tableName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatNumber(table.rowCount)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={getStatusIcon(table.hasData)}
                      label={
                        table.hasData
                          ? t("status.databaseTables.ok")
                          : t("status.databaseTables.empty")
                      }
                      size="small"
                      color={getStatusColor(table.hasData)}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          mt={1}
        >
          {t("status.lastUpdatedLine", {
            value: formatDateTime(overview.lastUpdated),
          })}
        </Typography>
      </Box>

      {/* Source data status */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t("status.sourceData.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t("status.sourceData.description")}
        </Typography>

        {loadingSourceData ? (
          <Box display="flex" justifyContent="center" my={2}>
            <CircularProgress />
          </Box>
        ) : sourceData ? (
          <>
            <Grid container spacing={3} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <StorageIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        {sourceData.totalTables}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {t("status.sourceData.sourceTables")}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <CheckCircleIcon color="info" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        {sourceData.tablesWithRawData}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Raw-dataa
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      <Typography variant="h6">
                        {sourceData.tablesWithParsedData}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Parsed-dataa
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      {t("status.lastUpdated")}
                    </Typography>
                    <Typography variant="body2">
                      {formatDateTime(sourceData.lastUpdated)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Taulu</TableCell>
                    <TableCell align="center">Tila</TableCell>
                    <TableCell align="right">API</TableCell>
                    <TableCell align="right">Raw</TableCell>
                    <TableCell align="right">Parsed</TableCell>
                    <TableCell align="right">Scrape %</TableCell>
                    <TableCell>{t("status.sourceData.rawUpdated")}</TableCell>
                    <TableCell>
                      {t("status.sourceData.parsedUpdated")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sourceData.tables.map((table) => (
                    <TableRow key={table.tableName}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {table.tableName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                          gap={0.5}
                        >
                          <Chip
                            label={getSourceStatusLabel(table)}
                            size="small"
                            color={getSourceStatusColor(table.status)}
                            variant="outlined"
                          />
                          {shouldShowProgress(table.status) && (
                            <LinearProgress
                              variant="determinate"
                              value={
                                table.status === "scraping"
                                  ? table.scrapeProgressPercent
                                  : table.parseProgressPercent
                              }
                              sx={{ width: "100%", height: 4 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(table.apiRowCount)}
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(table.rawRows)} ({table.rawPages} s.)
                      </TableCell>
                      <TableCell align="right">
                        <Box textAlign="right">
                          <Typography variant="body2" fontWeight="medium">
                            {formatNumber(table.parsedRows)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {table.parsedPages} sivua
                          </Typography>
                          {table.status === "parsing" && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {table.parseProgressPercent.toFixed(1)} % valmis
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {table.scrapeProgressPercent.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {formatDateTime(table.rawLastUpdated)}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(table.parsedLastUpdated)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : sourceDataError ? (
          <Alert severity="warning">{sourceDataError}</Alert>
        ) : (
          <Alert severity="info">{t("status.sourceData.unavailable")}</Alert>
        )}
      </Box>

      {/* Sanity Checks Section */}
      {loadingSanityChecks ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : sanityChecks ? (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            {t("status.sanity.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t("status.sanity.description")}
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {sanityChecks.totalChecks}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("status.sanity.totalChecks")}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {sanityChecks.passedChecks}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("status.sanity.passed")}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ErrorIcon
                      color={
                        sanityChecks.failedChecks === 0 ? "disabled" : "error"
                      }
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="h6">
                      {sanityChecks.failedChecks}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {t("status.sanity.failed")}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <WarningIcon
                      color={
                        sanityChecks.knownExceptionCount === 0
                          ? "disabled"
                          : "warning"
                      }
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="h6">
                      {sanityChecks.knownExceptionCount}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Tunnetut poikkeamat
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Group checks by category */}
          {Array.from(new Set(sanityChecks.checks.map((c) => c.category))).map(
            (category) => {
              const categoryChecks = sanityChecks.checks.filter(
                (c) => c.category === category,
              );
              const failedCount = categoryChecks.filter(
                (c) => !c.passed,
              ).length;
              const exceptionCount = categoryChecks.filter(
                (c) =>
                  c.passed && c.knownExceptions && c.knownExceptions.length > 0,
              ).length;

              return (
                <Box key={category} sx={{ mb: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="h6">{category}</Typography>
                    {failedCount > 0 && (
                      <Chip
                        label={t("status.sanity.failedCount", {
                          count: failedCount,
                        })}
                        size="small"
                        color="error"
                      />
                    )}
                    {exceptionCount > 0 && (
                      <Chip
                        label={t("status.sanity.exceptionCount", {
                          count: exceptionCount,
                        })}
                        size="small"
                        color="warning"
                      />
                    )}
                  </Box>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width="40">Tila</TableCell>
                          <TableCell>Tarkistus</TableCell>
                          <TableCell>Kuvaus</TableCell>
                          <TableCell>Tulos</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryChecks.map((check, idx) => {
                          const hasExceptions =
                            check.knownExceptions &&
                            check.knownExceptions.length > 0;

                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                {hasExceptions && check.passed ? (
                                  <Tooltip
                                    title={t(
                                      "status.sanity.passedWithExceptions",
                                    )}
                                  >
                                    <WarningIcon
                                      color="warning"
                                      fontSize="small"
                                    />
                                  </Tooltip>
                                ) : check.passed ? (
                                  <CheckCircleIcon
                                    color="success"
                                    fontSize="small"
                                  />
                                ) : (
                                  <ErrorIcon color="error" fontSize="small" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {check.name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {check.description}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {check.errorMessage ? (
                                  <Typography variant="body2" color="error">
                                    {t("status.sanity.errorLine", {
                                      value: check.errorMessage,
                                    })}
                                  </Typography>
                                ) : (
                                  <>
                                    {check.details && (
                                      <Typography
                                        variant="body2"
                                        color={
                                          hasExceptions && check.passed
                                            ? "warning.main"
                                            : check.passed
                                              ? "text.secondary"
                                              : "error"
                                        }
                                      >
                                        {check.details}
                                      </Typography>
                                    )}
                                    {(check.constraintId ||
                                      check.queryKeys?.length) && (
                                      <Box sx={{ mt: 0.5 }}>
                                        {check.constraintId && (
                                          <Typography
                                            variant="caption"
                                            display="block"
                                            color="text.secondary"
                                          >
                                            Constraint: {check.constraintId}
                                          </Typography>
                                        )}
                                        {check.queryKeys &&
                                          check.queryKeys.length > 0 && (
                                            <Typography
                                              variant="caption"
                                              display="block"
                                              color="text.secondary"
                                            >
                                              Query keys:{" "}
                                              {check.queryKeys.join(", ")}
                                            </Typography>
                                          )}
                                      </Box>
                                    )}
                                    {hasExceptions &&
                                      check.knownExceptions!.map((exc) => (
                                        <Box
                                          key={exc.id}
                                          sx={{
                                            mt: 1,
                                            p: 1,
                                            bgcolor: "warning.50",
                                            borderLeft: 3,
                                            borderColor: "warning.main",
                                            borderRadius: 1,
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            fontWeight="bold"
                                            display="block"
                                          >
                                            {exc.id}: {exc.description}
                                          </Typography>
                                          <Typography
                                            variant="caption"
                                            display="block"
                                            color="text.secondary"
                                            sx={{ mb: 0.5 }}
                                          >
                                            {exc.reason}
                                          </Typography>
                                          <Box
                                            sx={{
                                              maxHeight: 200,
                                              overflowY: "auto",
                                              mt: 0.5,
                                            }}
                                          >
                                            {exc.affectedRows.map((row) => (
                                              <Box
                                                key={row.id}
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 0.5,
                                                  py: 0.25,
                                                }}
                                              >
                                                <Typography variant="caption">
                                                  {row.label}
                                                </Typography>
                                                <a
                                                  href={row.sourceUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                  }}
                                                >
                                                  <OpenInNewIcon
                                                    sx={{
                                                      fontSize: 14,
                                                      color: "text.secondary",
                                                    }}
                                                  />
                                                </a>
                                              </Box>
                                            ))}
                                          </Box>
                                        </Box>
                                      ))}
                                  </>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            },
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mt={2}
          >
            {t("status.sanity.lastRunLine", {
              value: new Date(sanityChecks.lastRun).toLocaleString("fi-FI"),
            })}
          </Typography>
        </Box>
      ) : null}

      {/* Note about data quality */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="body2">{t("status.footerNote")}</Typography>
      </Alert>
    </Container>
  );
}
