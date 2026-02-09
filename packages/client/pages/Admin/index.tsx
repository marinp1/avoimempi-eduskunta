import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import WarningIcon from "@mui/icons-material/Warning";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Fade,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { colors, gradients } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import {
  AdminHeader,
  AdminOverview,
  BulkOperationsPanel,
  ControlPanel,
} from "./components";

type TableStatus = {
  table_name: string;
  raw_page_count: number;
  parsed_page_count: number;
  has_raw_data: boolean;
  has_parsed_data: boolean;
  raw_last_updated: string | null;
  parsed_last_updated: string | null;
  raw_estimated_rows: number;
  parsed_estimated_rows: number;
  total_rows_in_api?: number;
  scrape_progress_percent?: number;
};

type ScrapingOverview = {
  total_tables: number;
  tables_with_data: number;
  tables_completed: number;
  total_api_rows: number;
  total_scraped_rows: number;
  overall_progress_percent: number;
  tables_with_parsed_data: number;
  tables_fully_parsed: number;
  total_parsed_rows: number;
};

export default () => {
  const themedColors = useThemedColors();
  const [status, setStatus] = useState<TableStatus[]>([]);
  const [overview, setOverview] = useState<ScrapingOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scraper control state
  const [scraperRunning, setScraperRunning] = useState<boolean>(false);
  const [currentScrapingTable, setCurrentScrapingTable] = useState<
    string | null
  >(null);
  const [scraperProgress, setScraperProgress] = useState<string>("");
  const [scraperPercent, setScraperPercent] = useState<number>(0);
  const [scraperMode, setScraperMode] = useState<"single" | "bulk">("single");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const scraperWsRef = useRef<WebSocket | null>(null);

  // Parser control state
  const [parserRunning, setParserRunning] = useState<boolean>(false);
  const [currentParsingTable, setCurrentParsingTable] = useState<string | null>(
    null,
  );
  const [parserProgress, setParserProgress] = useState<string>("");
  const [parserPercent, setParserPercent] = useState<number>(0);
  const [parserMode, setParserMode] = useState<"single" | "bulk">("single");
  const parserWsRef = useRef<WebSocket | null>(null);

  // Migrator control state
  const [migratorRunning, setMigratorRunning] = useState<boolean>(false);
  const [migratorProgress, setMigratorProgress] = useState<string>("");
  const [lastMigrationTimestamp, setLastMigrationTimestamp] = useState<
    string | null
  >(null);
  const migratorWsRef = useRef<WebSocket | null>(null);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      // Fetch status, overview, and last migration timestamp
      const [statusRes, overviewRes, migrationRes] = await Promise.all([
        fetch("/api/admin/status"),
        fetch("/api/admin/overview"),
        fetch("/api/migrator/last-migration"),
      ]);

      if (!statusRes.ok || !overviewRes.ok) {
        throw new Error(`HTTP error`);
      }

      const statusData: TableStatus[] = await statusRes.json();
      const overviewData: ScrapingOverview = await overviewRes.json();
      const migrationData = await migrationRes.json();

      setStatus(statusData);
      setOverview(overviewData);
      setLastMigrationTimestamp(migrationData.timestamp);
    } catch (err) {
      console.error(err);
      setError("Failed to load admin data.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();

    // Setup Scraper WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const scraperWs = new WebSocket(
      `${protocol}//${window.location.host}/ws/scraper`,
    );

    scraperWs.onopen = () => {
      console.log("Scraper WebSocket connected");
    };

    scraperWs.onmessage = (event) => {
      const message = JSON.parse(event.data) as { type: string; data?: any };

      switch (message.type) {
        case "status":
          if (message.data.status === "started") {
            setScraperRunning(true);
            setScraperMode(message.data.mode === "bulk" ? "bulk" : "single");
            if (message.data.mode === "bulk") {
              setCurrentScrapingTable(null);
              setScraperProgress(
                `Starting bulk scrape of ${message.data.totalTables} tables...`,
              );
              setScraperPercent(0);
            } else {
              setCurrentScrapingTable(message.data.tableName);
              setScraperProgress(`Starting scrape...`);
              setScraperPercent(0);
            }
          } else if (message.data.status === "stopping") {
            setScraperProgress("Stopping...");
          }
          break;

        case "progress":
          if (message.data.mode === "bulk") {
            setCurrentScrapingTable(message.data.tableName);
            if (message.data.status === "completed") {
              setScraperProgress(
                `Completed ${message.data.tableName} (${message.data.currentTableIndex}/${message.data.totalTables})`,
              );
            } else if (message.data.status === "failed") {
              setScraperProgress(
                `Failed ${message.data.tableName}: ${message.data.error}`,
              );
            } else if (message.data.page) {
              setScraperProgress(
                `[${message.data.currentTableIndex}/${message.data.totalTables}] ${message.data.tableName}: Page ${message.data.page} - ${message.data.totalRows?.toLocaleString() || "N/A"} rows`,
              );
            } else {
              setScraperProgress(
                `Processing ${message.data.tableName} (${message.data.currentTableIndex}/${message.data.totalTables})`,
              );
            }
            setScraperPercent(
              message.data.overallPercentComplete ||
                message.data.percentComplete,
            );
          } else {
            setScraperProgress(
              `${message.data.tableName}: Page ${message.data.page} - ${message.data.totalRows.toLocaleString()} rows (${message.data.percentComplete.toFixed(1)}%)`,
            );
            setScraperPercent(message.data.percentComplete);
          }
          break;

        case "complete":
          setScraperRunning(false);
          setCurrentScrapingTable(null);
          if (
            message.data.failedTables &&
            message.data.failedTables.length > 0
          ) {
            setScraperProgress(
              `Completed with ${message.data.failedTables.length} error(s)`,
            );
          } else {
            setScraperProgress(`Completed successfully`);
          }
          setScraperPercent(100);
          setScraperMode("single");
          // Refresh data without showing loading spinner
          setTimeout(() => fetchData(false), 500);
          break;

        case "error":
          setScraperRunning(false);
          setCurrentScrapingTable(null);
          setScraperProgress(`Error: ${message.data.error}`);
          setScraperPercent(0);
          setScraperMode("single");
          break;

        case "stopped":
          setScraperRunning(false);
          setCurrentScrapingTable(null);
          setScraperProgress(`Stopped`);
          setScraperPercent(0);
          setScraperMode("single");
          break;
      }
    };

    scraperWs.onerror = (error) => {
      console.error("Scraper WebSocket error:", error);
    };

    scraperWs.onclose = () => {
      console.log("Scraper WebSocket disconnected");
    };

    scraperWsRef.current = scraperWs;

    // Setup Parser WebSocket connection
    const parserWs = new WebSocket(
      `${protocol}//${window.location.host}/ws/parser`,
    );

    parserWs.onopen = () => {
      console.log("Parser WebSocket connected");
    };

    parserWs.onmessage = (event) => {
      const message = JSON.parse(event.data) as { type: string; data?: any };

      switch (message.type) {
        case "status":
          if (message.data.status === "started") {
            setParserRunning(true);
            setParserMode(message.data.mode === "bulk" ? "bulk" : "single");
            if (message.data.mode === "bulk") {
              setCurrentParsingTable(null);
              setParserProgress(
                `Starting bulk parse of ${message.data.totalTables} tables...`,
              );
              setParserPercent(0);
            } else {
              setCurrentParsingTable(message.data.tableName);
              setParserProgress(`Starting parse...`);
              setParserPercent(0);
            }
          } else if (message.data.status === "stopping") {
            setParserProgress("Stopping...");
          }
          break;

        case "progress":
          if (message.data.mode === "bulk") {
            setCurrentParsingTable(message.data.tableName);
            if (message.data.status === "completed") {
              setParserProgress(
                `Completed ${message.data.tableName} (${message.data.currentTableIndex}/${message.data.totalTables})`,
              );
            } else if (message.data.status === "failed") {
              setParserProgress(
                `Failed ${message.data.tableName}: ${message.data.error}`,
              );
            } else if (message.data.page) {
              setParserProgress(
                `[${message.data.currentTableIndex}/${message.data.totalTables}] ${message.data.tableName}: Page ${message.data.page}/${message.data.totalPages} - ${message.data.rowsParsed?.toLocaleString() || "N/A"} rows`,
              );
            } else {
              setParserProgress(
                `Processing ${message.data.tableName} (${message.data.currentTableIndex}/${message.data.totalTables})`,
              );
            }
            setParserPercent(
              message.data.overallPercentComplete ||
                message.data.percentComplete,
            );
          } else {
            setParserProgress(
              `${message.data.tableName}: Page ${message.data.page}/${message.data.totalPages} - ${message.data.rowsParsed.toLocaleString()} rows (${message.data.percentComplete.toFixed(1)}%)`,
            );
            setParserPercent(message.data.percentComplete);
          }
          break;

        case "complete":
          setParserRunning(false);
          setCurrentParsingTable(null);
          if (
            message.data.failedTables &&
            message.data.failedTables.length > 0
          ) {
            setParserProgress(
              `Completed with ${message.data.failedTables.length} error(s)`,
            );
          } else {
            setParserProgress(`Completed successfully`);
          }
          setParserPercent(100);
          setParserMode("single");
          // Refresh data without showing loading spinner
          setTimeout(() => fetchData(false), 500);
          break;

        case "error":
          setParserRunning(false);
          setCurrentParsingTable(null);
          setParserProgress(`Error: ${message.data.error}`);
          setParserPercent(0);
          setParserMode("single");
          break;

        case "stopped":
          setParserRunning(false);
          setCurrentParsingTable(null);
          setParserProgress(`Stopped`);
          setParserPercent(0);
          setParserMode("single");
          break;
      }
    };

    parserWs.onerror = (error) => {
      console.error("Parser WebSocket error:", error);
    };

    parserWs.onclose = () => {
      console.log("Parser WebSocket disconnected");
    };

    parserWsRef.current = parserWs;

    // Setup Migrator WebSocket connection
    const migratorWs = new WebSocket(
      `${protocol}//${window.location.host}/ws/migrator`,
    );

    migratorWs.onopen = () => {
      console.log("Migrator WebSocket connected");
    };

    migratorWs.onmessage = (event) => {
      const message = JSON.parse(event.data) as { type: string; data?: any };

      switch (message.type) {
        case "status":
          if (message.data.status === "started") {
            setMigratorRunning(true);
            setMigratorProgress("Starting database migration...");
          } else if (message.data.status === "stopping") {
            setMigratorProgress("Stopping...");
          }
          break;

        case "progress":
          setMigratorProgress(message.data.message || "Processing...");
          break;

        case "complete":
          setMigratorRunning(false);
          setMigratorProgress("Migration completed successfully");
          setLastMigrationTimestamp(message.data.timestamp);
          // Refresh data without showing loading spinner
          setTimeout(() => fetchData(false), 500);
          break;

        case "error":
          setMigratorRunning(false);
          setMigratorProgress(`Error: ${message.data.error}`);
          break;

        case "stopped":
          setMigratorRunning(false);
          setMigratorProgress("Migration stopped");
          break;
      }
    };

    migratorWs.onerror = (error) => {
      console.error("Migrator WebSocket error:", error);
    };

    migratorWs.onclose = () => {
      console.log("Migrator WebSocket disconnected");
    };

    migratorWsRef.current = migratorWs;

    return () => {
      scraperWs.close();
      parserWs.close();
      migratorWs.close();
    };
  }, []);

  const handleStartScraping = async (tableName: string) => {
    try {
      const res = await fetch("/api/scraper/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableName,
          mode: { type: "auto-resume" },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      setExpandedRow(tableName);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to start scraping: ${err.message}`);
    }
  };

  const handleStopScraping = async () => {
    try {
      const res = await fetch("/api/scraper/stop", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to stop scraping: ${err.message}`);
    }
  };

  const handleStartParsing = async (tableName: string) => {
    try {
      const res = await fetch("/api/parser/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }

      setExpandedRow(tableName);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to start parsing: ${err.message}`);
    }
  };

  const handleStopParsing = async () => {
    try {
      const res = await fetch("/api/parser/stop", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to stop parsing: ${err.message}`);
    }
  };

  const handleBulkStartScraping = async (selectedTables: string[]) => {
    try {
      const res = await fetch("/api/scraper/bulk-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNames: selectedTables,
          mode: { type: "auto-resume" },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to start bulk scraping: ${err.message}`);
    }
  };

  const handleBulkStartParsing = async (selectedTables: string[]) => {
    try {
      const res = await fetch("/api/parser/bulk-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNames: selectedTables,
          force: false,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to start bulk parsing: ${err.message}`);
    }
  };

  const handleStartMigration = async () => {
    try {
      const res = await fetch("/api/migrator/start", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to start migration: ${err.message}`);
    }
  };

  const handleStopMigration = async () => {
    try {
      const res = await fetch("/api/migrator/stop", {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to stop migration: ${err.message}`);
    }
  };

  const getStatusIcon = (progressPercent?: number) => {
    if (progressPercent === undefined || progressPercent === 0) {
      // Unstarted
      return <ErrorIcon sx={{ color: colors.error, fontSize: 20 }} />;
    }
    if (progressPercent >= 100) {
      // Complete
      return <CheckCircleIcon sx={{ color: colors.success, fontSize: 20 }} />;
    }
    // Incomplete
    return <WarningIcon sx={{ color: colors.warning, fontSize: 20 }} />;
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("fi-FI", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <Box>
      <AdminHeader onRefresh={() => fetchData(true)} />

      {error && (
        <Fade in timeout={500}>
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        </Fade>
      )}

      <AdminOverview overview={overview} />

      {/* Bulk Scraper Section */}
      <BulkOperationsPanel
        title="Bulk Scraper"
        description="Scrape multiple tables sequentially"
        tableStatuses={status}
        isRunning={scraperRunning && scraperMode === "bulk"}
        progress={scraperProgress}
        progressPercent={scraperPercent}
        currentTable={currentScrapingTable}
        onStart={handleBulkStartScraping}
        onStop={handleStopScraping}
        gradient={gradients.scraper}
        disabled={scraperRunning || parserRunning || migratorRunning}
      />

      {/* Bulk Parser Section */}
      <BulkOperationsPanel
        title="Bulk Parser"
        description="Parse multiple tables sequentially"
        tableStatuses={status}
        isRunning={parserRunning && parserMode === "bulk"}
        progress={parserProgress}
        progressPercent={parserPercent}
        currentTable={currentParsingTable}
        onStart={handleBulkStartParsing}
        onStop={handleStopParsing}
        gradient={gradients.parser}
        disabled={scraperRunning || parserRunning || migratorRunning}
        filterCondition={(table) => table.has_raw_data}
      />

      {/* Database Migration Section */}
      <ControlPanel
        title="Database Migration"
        description="Build final SQLite database from parsed data"
        isRunning={migratorRunning}
        progress={migratorProgress}
        progressPercent={0}
        onStart={handleStartMigration}
        onStop={handleStopMigration}
        gradient={gradients.success}
        disabled={scraperRunning || parserRunning || migratorRunning}
        lastUpdate={
          lastMigrationTimestamp
            ? formatTimestamp(lastMigrationTimestamp)
            : undefined
        }
      />
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Fade in timeout={600}>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${themedColors.dataBorder}`,
              overflow: "hidden",
            }}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background: themedColors.background,
                  }}
                >
                  <TableCell sx={{ width: 50 }} />
                  <TableCell>
                    <Typography variant="body2" fontWeight="700">
                      Table Name
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Raw Data
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Raw Pages
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Raw Rows
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Raw Last Updated
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Parsed Data
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Parsed Pages
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Parsed Rows
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Parsed Last Updated
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Status
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {status.map((row, _index) => {
                  const isExpanded = expandedRow === row.table_name;
                  const isThisTableScraping =
                    currentScrapingTable === row.table_name;
                  const isThisTableParsing =
                    currentParsingTable === row.table_name;

                  return (
                    <React.Fragment key={row.table_name}>
                      <TableRow
                        sx={{
                          "&:hover": {
                            bgcolor: "rgba(0, 53, 128, 0.04)",
                          },
                          transition: "background-color 0.2s",
                        }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setExpandedRow(isExpanded ? null : row.table_name)
                            }
                          >
                            {isExpanded ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="600">
                            {row.table_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {getStatusIcon(row.scrape_progress_percent)}
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.has_raw_data
                                ? themedColors.textPrimary
                                : themedColors.textTertiary,
                              fontWeight: 600,
                            }}
                          >
                            {row.total_rows_in_api
                              ? `${row.raw_page_count} / ${Math.ceil(row.total_rows_in_api / 100)}`
                              : row.has_raw_data
                                ? row.raw_page_count.toLocaleString()
                                : "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.has_raw_data
                                ? themedColors.textPrimary
                                : themedColors.textTertiary,
                              fontWeight: 500,
                            }}
                          >
                            {row.has_raw_data
                              ? `${row.raw_estimated_rows.toLocaleString()}`
                              : "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="caption"
                            sx={{
                              color: row.raw_last_updated
                                ? themedColors.textSecondary
                                : themedColors.textTertiary,
                              fontFamily: "monospace",
                            }}
                          >
                            {formatTimestamp(row.raw_last_updated)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {getStatusIcon(row.has_parsed_data ? 100 : 0)}
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.has_parsed_data
                                ? themedColors.textPrimary
                                : themedColors.textTertiary,
                              fontWeight: 600,
                            }}
                          >
                            {row.has_parsed_data
                              ? row.parsed_page_count.toLocaleString()
                              : "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.has_parsed_data
                                ? themedColors.textPrimary
                                : themedColors.textTertiary,
                              fontWeight: 500,
                            }}
                          >
                            {row.has_parsed_data
                              ? `${row.parsed_estimated_rows.toLocaleString()}`
                              : "N/A"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="caption"
                            sx={{
                              color: row.parsed_last_updated
                                ? themedColors.textSecondary
                                : themedColors.textTertiary,
                              fontFamily: "monospace",
                            }}
                          >
                            {formatTimestamp(row.parsed_last_updated)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {row.has_raw_data &&
                          row.has_parsed_data &&
                          row.parsed_page_count >= row.raw_page_count ? (
                            <Chip
                              label="Complete"
                              size="small"
                              color="success"
                            />
                          ) : row.has_raw_data &&
                            row.has_parsed_data &&
                            row.parsed_page_count < row.raw_page_count ? (
                            <Chip
                              label="Needs Re-parsing"
                              size="small"
                              color="warning"
                            />
                          ) : row.has_raw_data ? (
                            <Chip
                              label="Needs Parsing"
                              size="small"
                              color="warning"
                            />
                          ) : (
                            <Chip
                              label="Needs Scraping"
                              size="small"
                              color="error"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell
                          style={{ paddingBottom: 0, paddingTop: 0 }}
                          colSpan={11}
                        >
                          <Collapse
                            in={isExpanded}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box sx={{ py: 3, px: 2 }}>
                              {/* Scraper Controls */}
                              <Box sx={{ mb: 3 }}>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="600"
                                  sx={{ mb: 1.5 }}
                                >
                                  Scraper
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                  }}
                                >
                                  {isThisTableScraping ? (
                                    <>
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<StopIcon />}
                                        onClick={handleStopScraping}
                                        size="small"
                                      >
                                        Cancel Scrape
                                      </Button>
                                      <Chip
                                        label="Scraping..."
                                        color="primary"
                                        size="small"
                                        sx={{
                                          background: gradients.scraper,
                                          color: "#FFFFFF",
                                        }}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="contained"
                                        startIcon={<PlayArrowIcon />}
                                        onClick={() =>
                                          handleStartScraping(row.table_name)
                                        }
                                        disabled={
                                          scraperRunning || parserRunning
                                        }
                                        size="small"
                                        sx={{
                                          background: gradients.scraper,
                                          "&:hover": {
                                            background:
                                              "linear-gradient(135deg, #5568d3 0%, #63408d 100%)",
                                          },
                                        }}
                                      >
                                        Scrape
                                      </Button>
                                      {row.scrape_progress_percent !==
                                        undefined &&
                                        row.total_rows_in_api && (
                                          <Chip
                                            label={`${row.scrape_progress_percent.toFixed(1)}% - ${row.raw_estimated_rows.toLocaleString()} / ${Math.max(row.total_rows_in_api, row.raw_estimated_rows).toLocaleString()} rows`}
                                            size="small"
                                            color={
                                              row.scrape_progress_percent >= 100
                                                ? "success"
                                                : "default"
                                            }
                                          />
                                        )}
                                    </>
                                  )}
                                </Box>
                                {isThisTableScraping && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ mb: 1 }}
                                    >
                                      {scraperProgress}
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={scraperPercent}
                                      sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: themedColors.backgroundSubtle,
                                        "& .MuiLinearProgress-bar": {
                                          background: gradients.scraper,
                                        },
                                      }}
                                    />
                                  </Box>
                                )}
                              </Box>

                              {/* Parser Controls */}
                              <Box>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="600"
                                  sx={{ mb: 1.5 }}
                                >
                                  Parser
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 2,
                                  }}
                                >
                                  {isThisTableParsing ? (
                                    <>
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<StopIcon />}
                                        onClick={handleStopParsing}
                                        size="small"
                                      >
                                        Cancel Parse
                                      </Button>
                                      <Chip
                                        label="Parsing..."
                                        color="secondary"
                                        size="small"
                                        sx={{
                                          background: gradients.parser,
                                          color: "#FFFFFF",
                                        }}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="contained"
                                        startIcon={<PlayArrowIcon />}
                                        onClick={() =>
                                          handleStartParsing(row.table_name)
                                        }
                                        disabled={
                                          !row.has_raw_data ||
                                          scraperRunning ||
                                          parserRunning
                                        }
                                        size="small"
                                        sx={{
                                          background: gradients.parser,
                                          "&:hover": {
                                            background:
                                              "linear-gradient(135deg, #e082ea 0%, #e4465b 100%)",
                                          },
                                        }}
                                      >
                                        Parse
                                      </Button>
                                      {row.has_parsed_data && (
                                        <Chip
                                          label={`${row.parsed_page_count} pages - ${row.parsed_estimated_rows.toLocaleString()} rows`}
                                          size="small"
                                          color="success"
                                        />
                                      )}
                                      {!row.has_raw_data && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          (Scrape data first)
                                        </Typography>
                                      )}
                                    </>
                                  )}
                                </Box>
                                {isThisTableParsing && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ mb: 1 }}
                                    >
                                      {parserProgress}
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={parserPercent}
                                      sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: themedColors.backgroundSubtle,
                                        "& .MuiLinearProgress-bar": {
                                          background: gradients.parser,
                                        },
                                      }}
                                    />
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Fade>
      )}
    </Box>
  );
};
