import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
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
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { colors, commonStyles, gradients, spacing } from "#client/theme";
import { GlassCard, PageHeader } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { BulkOperationsPanel, ControlPanel } from "./components";

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
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const [status, setStatus] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCycleRef = useRef(0);

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
  const [currentMigratingTable, setCurrentMigratingTable] = useState<
    string | null
  >(null);
  const [currentMigratingDocumentType, setCurrentMigratingDocumentType] =
    useState<string | null>(null);
  const [migratorProgress, setMigratorProgress] = useState<string>("");
  const [migratorPercent, setMigratorPercent] = useState<number>(0);
  const [lastMigrationTimestamp, setLastMigrationTimestamp] = useState<
    string | null
  >(null);
  const migratorWsRef = useRef<WebSocket | null>(null);

  const buildPlaceholderStatus = (tableName: string): TableStatus => ({
    table_name: tableName,
    raw_page_count: 0,
    parsed_page_count: 0,
    has_raw_data: false,
    has_parsed_data: false,
    raw_last_updated: null,
    parsed_last_updated: null,
    raw_estimated_rows: 0,
    parsed_estimated_rows: 0,
    total_rows_in_api: 0,
    scrape_progress_percent: 0,
  });

  const overview: ScrapingOverview = useMemo(() => {
    const totalTables = status.length;
    const tablesWithData = status.filter((s) => s.has_raw_data).length;
    const tablesCompleted = status.filter(
      (s) =>
        s.total_rows_in_api &&
        s.scrape_progress_percent &&
        s.scrape_progress_percent >= 99.9,
    ).length;
    const totalApiRows = status.reduce(
      (sum, s) => sum + (s.total_rows_in_api || 0),
      0,
    );
    const totalScrapedRows = status.reduce(
      (sum, s) => sum + s.raw_estimated_rows,
      0,
    );
    const overallProgressPercent =
      totalApiRows > 0
        ? Math.min((totalScrapedRows / totalApiRows) * 100, 100)
        : 0;
    const tablesWithParsedData = status.filter((s) => s.has_parsed_data).length;
    const tablesFullyParsed = status.filter(
      (s) =>
        s.has_raw_data &&
        s.has_parsed_data &&
        s.parsed_page_count >= s.raw_page_count,
    ).length;
    const totalParsedRows = status.reduce(
      (sum, s) => sum + s.parsed_estimated_rows,
      0,
    );

    return {
      total_tables: totalTables,
      tables_with_data: tablesWithData,
      tables_completed: tablesCompleted,
      total_api_rows: totalApiRows,
      total_scraped_rows: totalScrapedRows,
      overall_progress_percent: overallProgressPercent,
      tables_with_parsed_data: tablesWithParsedData,
      tables_fully_parsed: tablesFullyParsed,
      total_parsed_rows: totalParsedRows,
    };
  }, [status]);

  const fetchData = async (showLoading = true) => {
    const cycleId = ++fetchCycleRef.current;
    let initialRenderReady = false;

    try {
      setError(null);
      if (showLoading) {
        setLoading(true);
      }

      const [tableListRes, migrationRes] = await Promise.all([
        fetch("/api/admin/table-list"),
        fetch("/api/migrator/last-migration"),
      ]);

      if (!tableListRes.ok || !migrationRes.ok) {
        throw new Error(`HTTP error`);
      }

      const tableNames: string[] = await tableListRes.json();
      const migrationData = await migrationRes.json();

      if (cycleId !== fetchCycleRef.current) {
        return;
      }

      setStatus(tableNames.map(buildPlaceholderStatus));
      setLastMigrationTimestamp(migrationData.timestamp);

      if (showLoading) {
        setLoading(false);
        initialRenderReady = true;
      }

      let nextIndex = 0;
      const workerCount = Math.min(4, tableNames.length);
      const workers = Array.from({ length: workerCount }, async () => {
        while (nextIndex < tableNames.length) {
          const currentIndex = nextIndex++;
          const tableName = tableNames[currentIndex];

          try {
            const res = await fetch(
              `/api/admin/table-status?tableName=${encodeURIComponent(tableName)}`,
            );
            if (!res.ok) {
              continue;
            }
            const row = (await res.json()) as TableStatus;
            if (cycleId !== fetchCycleRef.current) {
              return;
            }
            setStatus((prev) => {
              const rowIndex = prev.findIndex(
                (s) => s.table_name === tableName,
              );
              if (rowIndex < 0) return prev;
              const next = [...prev];
              next[rowIndex] = row;
              return next;
            });
          } catch (tableError) {
            console.error(
              `Failed to fetch status for ${tableName}`,
              tableError,
            );
          }
        }
      });
      await Promise.all(workers);
    } catch (err) {
      console.error(err);
      setError("Failed to load admin data.");
    } finally {
      if (
        showLoading &&
        !initialRenderReady &&
        cycleId === fetchCycleRef.current
      ) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();

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
            setCurrentMigratingTable(null);
            setCurrentMigratingDocumentType(null);
            setMigratorProgress("Starting database migration...");
            setMigratorPercent(0);
          } else if (message.data.status === "stopping") {
            setMigratorProgress("Stopping...");
          }
          break;

        case "progress": {
          if (typeof message.data.currentTable === "string") {
            setCurrentMigratingTable(message.data.currentTable);
          } else if (message.data.currentTable === null) {
            setCurrentMigratingTable(null);
          }

          if (typeof message.data.currentDocumentType === "string") {
            setCurrentMigratingDocumentType(message.data.currentDocumentType);
          } else if (message.data.currentDocumentType === null) {
            setCurrentMigratingDocumentType(null);
          }

          const totalTables =
            typeof message.data.totalTables === "number"
              ? message.data.totalTables
              : 0;
          const tablesCompleted =
            typeof message.data.tablesCompleted === "number"
              ? message.data.tablesCompleted
              : 0;
          if (totalTables > 0) {
            let progressPercent = (tablesCompleted / totalTables) * 100;

            const totalDocumentTypes =
              typeof message.data.totalDocumentTypes === "number"
                ? message.data.totalDocumentTypes
                : 0;
            const documentTypesCompleted =
              typeof message.data.documentTypesCompleted === "number"
                ? message.data.documentTypesCompleted
                : 0;

            if (
              message.data.currentTable === "VaskiData" &&
              totalDocumentTypes > 0
            ) {
              progressPercent =
                ((tablesCompleted +
                  documentTypesCompleted / totalDocumentTypes) /
                  totalTables) *
                100;
            }

            setMigratorPercent(Math.max(0, Math.min(100, progressPercent)));
          }

          setMigratorProgress(message.data.message || "Processing...");
          break;
        }

        case "complete":
          setMigratorRunning(false);
          setCurrentMigratingTable(null);
          setCurrentMigratingDocumentType(null);
          setMigratorProgress("Migration completed successfully");
          setMigratorPercent(100);
          setLastMigrationTimestamp(message.data.timestamp);
          setTimeout(() => fetchData(false), 500);
          break;

        case "error":
          setMigratorRunning(false);
          setCurrentMigratingTable(null);
          setCurrentMigratingDocumentType(null);
          setMigratorProgress(`Error: ${message.data.error}`);
          setMigratorPercent(0);
          break;

        case "stopped":
          setMigratorRunning(false);
          setCurrentMigratingTable(null);
          setCurrentMigratingDocumentType(null);
          setMigratorProgress("Migration stopped");
          setMigratorPercent(0);
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
      return <ErrorIcon sx={{ color: colors.error, fontSize: 18 }} />;
    }
    if (progressPercent >= 100) {
      return <CheckCircleIcon sx={{ color: colors.success, fontSize: 18 }} />;
    }
    return <WarningIcon sx={{ color: colors.warning, fontSize: 18 }} />;
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "-";
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

  const getStatusChip = (row: TableStatus) => {
    if (
      row.has_raw_data &&
      row.has_parsed_data &&
      row.parsed_page_count >= row.raw_page_count
    ) {
      return (
        <Chip
          label={t("admin.status.complete")}
          size="small"
          color="success"
          variant="outlined"
        />
      );
    }
    if (
      row.has_raw_data &&
      row.has_parsed_data &&
      row.parsed_page_count < row.raw_page_count
    ) {
      return (
        <Chip
          label={t("admin.status.needsReparsing")}
          size="small"
          color="warning"
          variant="outlined"
        />
      );
    }
    if (row.has_raw_data) {
      return (
        <Chip
          label={t("admin.status.needsParsing")}
          size="small"
          color="warning"
          variant="outlined"
        />
      );
    }
    return (
      <Chip
        label={t("admin.status.needsScraping")}
        size="small"
        color="error"
        variant="outlined"
      />
    );
  };

  return (
    <Box>
      <PageHeader
        title={t("admin.title")}
        subtitle={t("admin.subtitle")}
        actions={
          <IconButton
            onClick={() => fetchData(true)}
            title={t("admin.refreshStatus")}
            sx={{
              border: `1px solid ${themedColors.dataBorder}`,
              "&:hover": {
                borderColor: themedColors.primary,
                bgcolor: `${themedColors.primary}08`,
              },
            }}
          >
            <RefreshIcon />
          </IconButton>
        }
      />

      {error && (
        <Fade in timeout={500}>
          <Alert severity="error" sx={{ mb: spacing.md, borderRadius: 2 }}>
            {error}
          </Alert>
        </Fade>
      )}

      <Fade in timeout={500}>
        <Box sx={{ mb: spacing.md }}>
          <Box sx={commonStyles.responsiveGrid(200)}>
            <GlassCard sx={{ p: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  color: themedColors.textSecondary,
                  fontWeight: 500,
                  fontSize: "0.8125rem",
                  mb: 0.75,
                }}
              >
                {t("admin.overview.overallProgress")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: themedColors.textPrimary,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                {overview.overall_progress_percent.toFixed(1)}%
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: themedColors.textTertiary,
                  mt: 0.75,
                }}
              >
                {overview.total_scraped_rows.toLocaleString("fi-FI")} /{" "}
                {overview.total_api_rows.toLocaleString("fi-FI")}
              </Typography>
            </GlassCard>

            <GlassCard sx={{ p: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  color: themedColors.textSecondary,
                  fontWeight: 500,
                  fontSize: "0.8125rem",
                  mb: 0.75,
                }}
              >
                {t("admin.overview.tablesWithData")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: themedColors.textPrimary,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                {overview.tables_with_data}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: themedColors.textTertiary,
                  mt: 0.75,
                }}
              >
                / {overview.total_tables} {t("common.total")}
              </Typography>
            </GlassCard>

            <GlassCard sx={{ p: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  color: themedColors.textSecondary,
                  fontWeight: 500,
                  fontSize: "0.8125rem",
                  mb: 0.75,
                }}
              >
                {t("admin.overview.completedTables")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: themedColors.textPrimary,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                {overview.tables_completed}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: themedColors.textTertiary,
                  mt: 0.75,
                }}
              >
                {t("admin.overview.scraped100")}
              </Typography>
            </GlassCard>

            <GlassCard sx={{ p: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  color: themedColors.textSecondary,
                  fontWeight: 500,
                  fontSize: "0.8125rem",
                  mb: 0.75,
                }}
              >
                {t("admin.overview.tablesParsed")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: themedColors.textPrimary,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                }}
              >
                {overview.tables_with_parsed_data}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: themedColors.textTertiary,
                  mt: 0.75,
                }}
              >
                {overview.total_parsed_rows.toLocaleString("fi-FI")}{" "}
                {t("admin.overview.parsedRows")}
              </Typography>
            </GlassCard>
          </Box>
        </Box>
      </Fade>

      {/* Bulk Scraper Section */}
      <BulkOperationsPanel
        title={t("admin.actions.scraper")}
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
        title={t("admin.actions.parser")}
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
        progressPercent={migratorPercent}
        currentTable={
          currentMigratingDocumentType && currentMigratingTable === "VaskiData"
            ? `${currentMigratingTable}/${currentMigratingDocumentType}`
            : currentMigratingTable
        }
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
            minHeight: 300,
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
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    background: colors.primary,
                  }}
                >
                  <TableCell sx={{ ...commonStyles.tableHeader, width: 40 }} />
                  <TableCell sx={commonStyles.tableHeader}>
                    {t("admin.table.tableName")}
                  </TableCell>
                  <TableCell sx={commonStyles.tableHeader} align="center">
                    {t("admin.table.rawData")}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...commonStyles.tableHeader,
                      display: { xs: "none", md: "table-cell" },
                    }}
                    align="right"
                  >
                    {t("admin.table.rawPages")}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...commonStyles.tableHeader,
                      display: { xs: "none", sm: "table-cell" },
                    }}
                    align="right"
                  >
                    {t("admin.table.rawRows")}
                  </TableCell>
                  <TableCell sx={commonStyles.tableHeader} align="center">
                    {t("admin.table.parsedData")}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...commonStyles.tableHeader,
                      display: { xs: "none", sm: "table-cell" },
                    }}
                    align="right"
                  >
                    {t("admin.table.parsedRows")}
                  </TableCell>
                  <TableCell sx={commonStyles.tableHeader} align="center">
                    {t("admin.table.status")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {status.map((row, index) => {
                  const isExpanded = expandedRow === row.table_name;
                  const isThisTableScraping =
                    currentScrapingTable === row.table_name;
                  const isThisTableParsing =
                    currentParsingTable === row.table_name;

                  return (
                    <React.Fragment key={row.table_name}>
                      <TableRow
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : row.table_name)
                        }
                        sx={{
                          ...commonStyles.tableRow,
                          ...commonStyles.fadeIn(index * 15),
                          "&:hover": {
                            bgcolor: `${colors.primary}06`,
                          },
                        }}
                      >
                        <TableCell sx={{ py: 1 }}>
                          <IconButton size="small" tabIndex={-1}>
                            {isExpanded ? (
                              <KeyboardArrowUpIcon fontSize="small" />
                            ) : (
                              <KeyboardArrowDownIcon fontSize="small" />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography
                            variant="body2"
                            fontWeight="600"
                            fontFamily="monospace"
                            sx={{ color: themedColors.textPrimary }}
                          >
                            {row.table_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1 }}>
                          {getStatusIcon(row.scrape_progress_percent)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            py: 1,
                            display: { xs: "none", md: "table-cell" },
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.has_raw_data
                                ? themedColors.textPrimary
                                : themedColors.textTertiary,
                              fontWeight: 600,
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                            }}
                          >
                            {row.total_rows_in_api
                              ? `${row.raw_page_count} / ${Math.ceil(row.total_rows_in_api / 100)}`
                              : row.has_raw_data
                                ? row.raw_page_count.toLocaleString("fi-FI")
                                : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            py: 1,
                            display: { xs: "none", sm: "table-cell" },
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.has_raw_data
                                ? themedColors.textPrimary
                                : themedColors.textTertiary,
                              fontWeight: 500,
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                            }}
                          >
                            {row.has_raw_data
                              ? row.raw_estimated_rows.toLocaleString("fi-FI")
                              : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1 }}>
                          {getStatusIcon(row.has_parsed_data ? 100 : 0)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            py: 1,
                            display: { xs: "none", sm: "table-cell" },
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.has_parsed_data
                                ? themedColors.textPrimary
                                : themedColors.textTertiary,
                              fontWeight: 500,
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                            }}
                          >
                            {row.has_parsed_data
                              ? row.parsed_estimated_rows.toLocaleString(
                                  "fi-FI",
                                )
                              : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 1 }}>
                          {getStatusChip(row)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell
                          style={{ paddingBottom: 0, paddingTop: 0 }}
                          colSpan={8}
                        >
                          <Collapse
                            in={isExpanded}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box
                              sx={{
                                py: spacing.sm,
                                px: spacing.sm,
                                display: "flex",
                                flexDirection: { xs: "column", sm: "row" },
                                gap: spacing.md,
                              }}
                            >
                              {/* Scraper Controls */}
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="600"
                                  sx={{
                                    mb: 1,
                                    color: colors.info,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {t("admin.actions.scraper")}
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {isThisTableScraping ? (
                                    <>
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<StopIcon />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStopScraping();
                                        }}
                                        size="small"
                                      >
                                        {t("admin.actions.cancelScrape")}
                                      </Button>
                                      <Chip
                                        label={t("admin.actions.scraping")}
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartScraping(row.table_name);
                                        }}
                                        disabled={
                                          scraperRunning || parserRunning
                                        }
                                        size="small"
                                        sx={{
                                          background: gradients.scraper,
                                          "&:hover": {
                                            background:
                                              "linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)",
                                          },
                                        }}
                                      >
                                        {t("admin.actions.scrape")}
                                      </Button>
                                      {row.scrape_progress_percent !==
                                        undefined &&
                                        row.total_rows_in_api && (
                                          <Chip
                                            label={`${row.scrape_progress_percent.toFixed(1)}% - ${row.raw_estimated_rows.toLocaleString("fi-FI")} / ${Math.max(row.total_rows_in_api, row.raw_estimated_rows).toLocaleString("fi-FI")}`}
                                            size="small"
                                            variant="outlined"
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
                                  <Box sx={{ mt: 1.5 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ mb: 0.5, display: "block" }}
                                    >
                                      {scraperProgress}
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={scraperPercent}
                                      sx={{
                                        height: 4,
                                        borderRadius: 2,
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
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="600"
                                  sx={{
                                    mb: 1,
                                    color: colors.chartPurple,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.04em",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {t("admin.actions.parser")}
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1.5,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {isThisTableParsing ? (
                                    <>
                                      <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<StopIcon />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStopParsing();
                                        }}
                                        size="small"
                                      >
                                        {t("admin.actions.cancelParse")}
                                      </Button>
                                      <Chip
                                        label={t("admin.actions.parsing")}
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartParsing(row.table_name);
                                        }}
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
                                              "linear-gradient(180deg, #6D28D9 0%, #5B21B6 100%)",
                                          },
                                        }}
                                      >
                                        {t("admin.actions.parse")}
                                      </Button>
                                      {row.has_parsed_data && (
                                        <Chip
                                          label={`${row.parsed_page_count} pages - ${row.parsed_estimated_rows.toLocaleString("fi-FI")}`}
                                          size="small"
                                          variant="outlined"
                                          color="success"
                                        />
                                      )}
                                      {!row.has_raw_data && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {t("admin.actions.scrapeFirst")}
                                        </Typography>
                                      )}
                                    </>
                                  )}
                                </Box>
                                {isThisTableParsing && (
                                  <Box sx={{ mt: 1.5 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ mb: 0.5, display: "block" }}
                                    >
                                      {parserProgress}
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={parserPercent}
                                      sx={{
                                        height: 4,
                                        borderRadius: 2,
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

                            {/* Timestamps row */}
                            <Box
                              sx={{
                                px: spacing.sm,
                                pb: spacing.sm,
                                display: "flex",
                                gap: spacing.md,
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontFamily: "monospace" }}
                              >
                                {t("admin.table.rawLastUpdated")}:{" "}
                                {formatTimestamp(row.raw_last_updated)}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontFamily: "monospace" }}
                              >
                                {t("admin.table.parsedLastUpdated")}:{" "}
                                {formatTimestamp(row.parsed_last_updated)}
                              </Typography>
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
