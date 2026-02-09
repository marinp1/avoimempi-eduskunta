import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
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
  Typography,
  Chip,
  Alert,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Storage as StorageIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";

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

interface SanityCheck {
  category: string;
  name: string;
  description: string;
  passed: boolean;
  details?: string;
  errorMessage?: string;
}

interface SanityCheckResult {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  checks: SanityCheck[];
  lastRun: string;
}

export default function Status() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<DataOverview | null>(null);
  const [sanityChecks, setSanityChecks] = useState<SanityCheckResult | null>(
    null,
  );
  const [loadingSanityChecks, setLoadingSanityChecks] = useState(false);

  useEffect(() => {
    fetchOverview();
    fetchSanityChecks();
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

  const getCompletenessPercentage = () => {
    if (!overview) return 0;
    return Math.round((overview.tablesWithData / overview.totalTables) * 100);
  };

  const getCategoryTables = (category: string): TableStatus[] => {
    if (!overview) return [];

    const categories: Record<string, string[]> = {
      Kansanedustajat: [
        "Representative",
        "Term",
        "District",
        "RepresentativeDistrict",
      ],
      "Istunnot ja äänestykset": [
        "Session",
        "Agenda",
        "Section",
        "Voting",
        "Vote",
      ],
      Puheenvuorot: ["Speech", "ExcelSpeech"],
      "Ryhmät ja valiokunt": [
        "ParliamentaryGroup",
        "ParliamentaryGroupMembership",
        "Committee",
        "CommitteeMembership",
      ],
      "Tehtävät ja virat": ["GovernmentMembership", "TrustPosition"],
      Asiakirjat: ["VaskiDocument", "DocumentSubject", "DocumentRelationship"],
    };

    const tableNames = categories[category] || [];
    return overview.tables.filter((t) => tableNames.includes(t.tableName));
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Tietolähteiden tila
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Tietokantaan tuodun datan tilanne ja laatu
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
                Tauluja yhteensä
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
                Täyttöaste
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
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Viimeksi päivitetty
              </Typography>
              <Typography variant="body2">
                {new Date(overview.lastUpdated).toLocaleString("fi-FI")}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Tables by Category */}
      {[
        "Kansanedustajat",
        "Istunnot ja äänestykset",
        "Puheenvuorot",
        "Ryhmät ja valiokunt",
        "Tehtävät ja virat",
        "Asiakirjat",
      ].map((category) => {
        const tables = getCategoryTables(category);
        if (tables.length === 0) return null;

        return (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {category}
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Taulu</TableCell>
                    <TableCell align="right">Rivimäärä</TableCell>
                    <TableCell align="center">Tila</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tables.map((table) => (
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
                          label={table.hasData ? "OK" : "Tyhjä"}
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
          </Box>
        );
      })}

      {/* Sanity Checks Section */}
      {loadingSanityChecks ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : sanityChecks ? (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Tietojen validointi
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Automaattiset tarkistukset tietojen laadun ja eheyden
            varmistamiseksi
          </Typography>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {sanityChecks.totalChecks}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Tarkistuksia yhteensä
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">
                      {sanityChecks.passedChecks}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Läpäisty
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
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
                    Epäonnistunut
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

              return (
                <Box key={category} sx={{ mb: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="h6">{category}</Typography>
                    {failedCount > 0 && (
                      <Chip
                        label={`${failedCount} epäonnistui`}
                        size="small"
                        color="error"
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
                        {categoryChecks.map((check, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {check.passed ? (
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
                                  Virhe: {check.errorMessage}
                                </Typography>
                              ) : check.details ? (
                                <Typography
                                  variant="body2"
                                  color={
                                    check.passed ? "text.secondary" : "error"
                                  }
                                >
                                  {check.details}
                                </Typography>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
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
            Viimeksi ajettu:{" "}
            {new Date(sanityChecks.lastRun).toLocaleString("fi-FI")}
          </Typography>
        </Box>
      ) : null}

      {/* Note about data quality */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="body2">
          Tiedot päivitetään automaattisesti Eduskunnan avoimen datan
          rajapinnasta. Tyhjät taulut eivät välttämättä tarkoita virhettä -
          joitain tauluja ei ole vielä tuotu järjestelmään.
        </Typography>
      </Alert>
    </Container>
  );
}
