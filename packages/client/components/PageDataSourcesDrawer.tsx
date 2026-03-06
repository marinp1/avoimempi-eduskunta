import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Fab,
  IconButton,
  Link,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTrace } from "#client/context/TraceContext";
import type { RouteName } from "../pages";
import { useThemedColors } from "../theme/ThemeContext";

type TableSourceDefinition = {
  tableName: string;
  purpose: string;
};

type TableSummary = {
  tableName: string;
  importedRows: number;
  distinctPages: number;
  firstScrapedAt: string | null;
  lastScrapedAt: string | null;
  firstMigratedAt: string | null;
  lastMigratedAt: string | null;
};

type RowTrace = {
  scrapedAt: string | null;
  migratedAt: string | null;
  apiUrl: string;
};

const PAGE_SOURCES: Record<RouteName, TableSourceDefinition[]> = {
  "": [
    { tableName: "MemberOfParliament", purpose: "Kansanedustajien perustiedot" },
    { tableName: "SaliDBIstunto", purpose: "Istuntojen nosto etusivulle" },
    { tableName: "SaliDBAanestys", purpose: "Aanestysnostot ja viimeisimmat tiedot" },
    { tableName: "VaskiData", purpose: "Asiakirja- ja dokumenttinostot" },
  ],
  edustajat: [
    { tableName: "MemberOfParliament", purpose: "Henkilotiedot ja ryhmat" },
    { tableName: "SaliDBAanestysEdustaja", purpose: "Edustajakohtainen aanestysdata" },
    { tableName: "SaliDBAanestys", purpose: "Aanestysten metatiedot" },
    { tableName: "SaliDBPuheenvuoro", purpose: "Puheenvuorojen tilastot" },
  ],
  puolueet: [
    { tableName: "MemberOfParliament", purpose: "Puolueiden kokoonpano" },
    { tableName: "SaliDBAanestysEdustaja", purpose: "Puoluekohtaiset aanestykset" },
    { tableName: "SaliDBAanestys", purpose: "Aanestyksen konteksti ja ajankohta" },
  ],
  istunnot: [
    { tableName: "SaliDBIstunto", purpose: "Istuntojen runko ja paivat" },
    { tableName: "SaliDBKohta", purpose: "Asiakohtien sisalto" },
    { tableName: "SaliDBPuheenvuoro", purpose: "Puheenvuorot istuntojen sisalla" },
    { tableName: "SaliDBAanestys", purpose: "Istuntoon liittyvat aanestykset" },
    { tableName: "SaliDBKohtaAanestys", purpose: "Asiakohdan ja aanestyksen linkitys" },
    { tableName: "SaliDBKohtaAsiakirja", purpose: "Asiakohdan asiakirjalinkit" },
    { tableName: "SaliDBTiedote", purpose: "Istuntoihin liittyvat tiedotteet" },
    { tableName: "VaskiData", purpose: "Asiakirjat, poytakirjat ja liitteet" },
  ],
  aanestykset: [
    { tableName: "SaliDBAanestys", purpose: "Aanestyksen paatiedot" },
    { tableName: "SaliDBAanestysEdustaja", purpose: "Edustajakohtaiset aanet" },
    { tableName: "SaliDBKohtaAanestys", purpose: "Aanestyksen kytkenta asiakohtaan" },
    { tableName: "SaliDBIstunto", purpose: "Istuntokonteksti" },
    { tableName: "SaliDBKohta", purpose: "Aanestettavan asian kuvaus" },
  ],
  asiakirjat: [
    { tableName: "VaskiData", purpose: "Asiakirjojen runkosisalto" },
    { tableName: "SaliDBKohtaAsiakirja", purpose: "Asiakirjan linkitys istuntoihin" },
  ],
  analytiikka: [
    { tableName: "MemberOfParliament", purpose: "Edustaja- ja puoluejakaumat" },
    { tableName: "SaliDBAanestys", purpose: "Aanestysaktiivisuuden pohjadata" },
    { tableName: "SaliDBAanestysEdustaja", purpose: "Henkilo- ja puoluekohtainen aanestysdata" },
    { tableName: "SaliDBPuheenvuoro", purpose: "Puheaktiivisuuden tilastot" },
  ],
  muutokset: [],
};

const formatDateTime = (value: string | null): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("fi-FI", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const PageDataSourcesDrawer = ({
  activeRoute,
}: {
  activeRoute: RouteName;
}) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const { traceItem, setTraceItem, registerOpenDrawer } = useTrace();

  const [open, setOpen] = useState(false);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [summariesError, setSummariesError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, TableSummary>>({});
  const [rowTrace, setRowTrace] = useState<RowTrace | null>(null);
  const [rowTraceLoading, setRowTraceLoading] = useState(false);
  const [rowTraceError, setRowTraceError] = useState<string | null>(null);

  const sourceDefinitions = PAGE_SOURCES[activeRoute] ?? [];
  const tableNames = useMemo(
    () =>
      Array.from(
        new Set(
          sourceDefinitions
            .map((d) => d.tableName)
            .filter((n) => n.trim() !== ""),
        ),
      ),
    [sourceDefinitions],
  );
  const tablesKey = tableNames.join("|");

  // Register openDrawer callback so TraceContext can open it
  const openDrawerFn = useRef(() => setOpen(true));
  useEffect(() => {
    registerOpenDrawer(openDrawerFn.current);
  }, [registerOpenDrawer]);

  // Clear error when route changes
  useEffect(() => {
    setSummariesError(null);
  }, [activeRoute]);

  // Fetch page-level summaries when drawer opens
  useEffect(() => {
    if (!open || tableNames.length === 0) return;

    const abortController = new AbortController();
    let mounted = true;

    const fetchSummaries = async () => {
      setSummariesLoading(true);
      setSummariesError(null);
      try {
        const params = new URLSearchParams();
        for (const tableName of tableNames) {
          params.append("tableName", tableName);
        }
        const response = await fetch(
          `/api/import-source/table-summaries?${params.toString()}`,
          { signal: abortController.signal },
        );
        if (!response.ok) throw new Error(t("pageSources.fetchFailed"));
        const data = (await response.json()) as { tables: TableSummary[] };
        if (!mounted) return;
        const next: Record<string, TableSummary> = {};
        for (const table of data.tables ?? []) {
          next[table.tableName] = table;
        }
        setSummaries(next);
      } catch (err) {
        if (abortController.signal.aborted || !mounted) return;
        setSummariesError(
          err instanceof Error ? err.message : t("pageSources.fetchFailed"),
        );
      } finally {
        if (mounted) setSummariesLoading(false);
      }
    };

    fetchSummaries();
    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [open, tablesKey, tableNames, t]);

  // Fetch row-level trace when traceItem changes and drawer is open
  useEffect(() => {
    if (!open || !traceItem) {
      setRowTrace(null);
      setRowTraceError(null);
      return;
    }

    const abortController = new AbortController();
    let mounted = true;

    const fetchTrace = async () => {
      setRowTraceLoading(true);
      setRowTraceError(null);
      try {
        const params = new URLSearchParams({
          table: traceItem.table,
          pkName: traceItem.pkName,
          pkValue: traceItem.pkValue,
        });
        const response = await fetch(
          `/api/import-source/row-trace?${params.toString()}`,
          { signal: abortController.signal },
        );
        if (!mounted) return;
        if (response.status === 404) {
          setRowTrace(null);
          setRowTraceError(t("pageSources.rowTraceNotFound"));
          return;
        }
        if (!response.ok) throw new Error(t("pageSources.fetchFailed"));
        setRowTrace(await response.json() as RowTrace);
      } catch (err) {
        if (abortController.signal.aborted || !mounted) return;
        setRowTraceError(
          err instanceof Error ? err.message : t("pageSources.fetchFailed"),
        );
      } finally {
        if (mounted) setRowTraceLoading(false);
      }
    };

    fetchTrace();
    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [open, traceItem, t]);

  const handleClose = () => {
    setOpen(false);
    setTraceItem(null);
  };

  const handleClearTrace = () => {
    setTraceItem(null);
  };

  return (
    <>
      <Tooltip title={t("pageSources.openTooltip")}>
        <Fab
          color="primary"
          variant="extended"
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            right: { xs: 12, sm: 20 },
            bottom: { xs: 74, lg: 20 },
            zIndex: 1200,
            textTransform: "none",
          }}
        >
          <TravelExploreIcon sx={{ mr: 1 }} />
          {t("pageSources.buttonLabel")}
        </Fab>
      </Tooltip>

      <Drawer anchor="right" open={open} onClose={handleClose}>
        <Box
          sx={{
            width: { xs: "100vw", sm: 460 },
            maxWidth: "100vw",
            height: "100%",
            bgcolor: themedColors.backgroundPaper,
            color: themedColors.textPrimary,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${themedColors.dataBorder}`,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {traceItem && (
                <IconButton onClick={handleClearTrace} size="small">
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              )}
              <Box>
                <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
                  {t("pageSources.drawerTitle")}
                </Typography>
                <Typography variant="caption" sx={{ color: themedColors.textTertiary }}>
                  {traceItem
                    ? traceItem.label
                    : t(`navigation.routes.${activeRoute}`)}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ p: 2, overflowY: "auto", height: "calc(100% - 69px)" }}>
            {/* Item trace section */}
            {traceItem && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="overline"
                  sx={{ color: themedColors.textTertiary, display: "block", mb: 1 }}
                >
                  {t("pageSources.itemTraceTitle")}
                </Typography>

                {rowTraceLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : rowTraceError ? (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    {rowTraceError}
                  </Alert>
                ) : rowTrace ? (
                  <Box
                    sx={{
                      border: `1px solid ${themedColors.dataBorder}`,
                      borderRadius: 2,
                      p: 1.5,
                      bgcolor: themedColors.backgroundSubtle,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {traceItem.table}
                      </Typography>
                      <Chip
                        label={`${traceItem.pkName}=${traceItem.pkValue}`}
                        size="small"
                        sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
                      />
                    </Box>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                      {t("pageSources.lastScrapeLine", {
                        value: formatDateTime(rowTrace.scrapedAt),
                      })}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                      {t("pageSources.lastMigrationLine", {
                        value: formatDateTime(rowTrace.migratedAt),
                      })}
                    </Typography>
                    <Button
                      component={Link}
                      href={rowTrace.apiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNewIcon sx={{ fontSize: "0.9rem !important" }} />}
                      sx={{ textTransform: "none", fontSize: "0.75rem" }}
                    >
                      {t("pageSources.openApiSource")}
                    </Button>
                  </Box>
                ) : null}

                <Divider sx={{ mt: 2, mb: 1 }} />
              </Box>
            )}

            {/* Page-level sources */}
            {traceItem ? (
              <Accordion
                disableGutters
                elevation={0}
                defaultExpanded={false}
                sx={{ "&:before": { display: "none" }, background: "transparent" }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{ color: themedColors.textTertiary }}
                  >
                    {t("pageSources.pageLevelTitle")}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 0 }}>
                  <PageSourcesList
                    sourceDefinitions={sourceDefinitions}
                    summaries={summaries}
                    summariesLoading={summariesLoading}
                    summariesError={summariesError}
                    themedColors={themedColors}
                    t={t}
                  />
                </AccordionDetails>
              </Accordion>
            ) : (
              <PageSourcesList
                sourceDefinitions={sourceDefinitions}
                summaries={summaries}
                summariesLoading={summariesLoading}
                summariesError={summariesError}
                themedColors={themedColors}
                t={t}
              />
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

const PageSourcesList = ({
  sourceDefinitions,
  summaries,
  summariesLoading,
  summariesError,
  themedColors,
  t,
}: {
  sourceDefinitions: TableSourceDefinition[];
  summaries: Record<string, TableSummary>;
  summariesLoading: boolean;
  summariesError: string | null;
  themedColors: ReturnType<typeof import("../theme/ThemeContext").useThemedColors>;
  t: ReturnType<typeof import("react-i18next").useTranslation>["t"];
}) => {
  if (sourceDefinitions.length === 0) {
    return (
      <Alert severity="info" role="status" aria-live="polite">
        {t("pageSources.noMapping")}
      </Alert>
    );
  }

  if (summariesLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {summariesError && (
        <Alert severity="warning" role="status" aria-live="polite">
          {summariesError}
        </Alert>
      )}
      {sourceDefinitions.map((sourceDefinition) => {
        const summary = summaries[sourceDefinition.tableName];
        return (
          <Box
            key={sourceDefinition.tableName}
            sx={{
              border: `1px solid ${themedColors.dataBorder}`,
              borderRadius: 2,
              p: 1.5,
              bgcolor: themedColors.backgroundSubtle,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {sourceDefinition.purpose}
              </Typography>
              <Chip
                label={sourceDefinition.tableName}
                size="small"
                sx={{ maxWidth: 190 }}
              />
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              {t("pageSources.lastScrapeLine", {
                value: formatDateTime(summary?.lastScrapedAt ?? null),
              })}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
              {t("pageSources.lastMigrationLine", {
                value: formatDateTime(summary?.lastMigratedAt ?? null),
              })}
            </Typography>
            <Typography variant="caption" sx={{ display: "block" }}>
              {t("pageSources.summaryCounts", {
                rows: summary?.importedRows ?? 0,
                pages: summary?.distinctPages ?? 0,
              })}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default PageDataSourcesDrawer;
