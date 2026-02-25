import CloseIcon from "@mui/icons-material/Close";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  Fab,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

const PAGE_SOURCES: Record<RouteName, TableSourceDefinition[]> = {
  "": [
    {
      tableName: "MemberOfParliament",
      purpose: "Kansanedustajien perustiedot",
    },
    { tableName: "SaliDBIstunto", purpose: "Istuntojen nosto etusivulle" },
    {
      tableName: "SaliDBAanestys",
      purpose: "Aanestysnostot ja viimeisimmat tiedot",
    },
    { tableName: "VaskiData", purpose: "Asiakirja- ja dokumenttinostot" },
  ],
  edustajat: [
    { tableName: "MemberOfParliament", purpose: "Henkilotiedot ja ryhmat" },
    {
      tableName: "SaliDBAanestysEdustaja",
      purpose: "Edustajakohtainen aanestysdata",
    },
    { tableName: "SaliDBAanestys", purpose: "Aanestysten metatiedot" },
    { tableName: "SaliDBPuheenvuoro", purpose: "Puheenvuorojen tilastot" },
  ],
  puolueet: [
    { tableName: "MemberOfParliament", purpose: "Puolueiden kokoonpano" },
    {
      tableName: "SaliDBAanestysEdustaja",
      purpose: "Puoluekohtaiset aanestykset",
    },
    {
      tableName: "SaliDBAanestys",
      purpose: "Aanestyksen konteksti ja ajankohta",
    },
  ],
  istunnot: [
    { tableName: "SaliDBIstunto", purpose: "Istuntojen runko ja paivat" },
    { tableName: "SaliDBKohta", purpose: "Asiakohtien sisalto" },
    {
      tableName: "SaliDBPuheenvuoro",
      purpose: "Puheenvuorot istuntojen sisalla",
    },
    { tableName: "SaliDBAanestys", purpose: "Istuntoon liittyvat aanestykset" },
    {
      tableName: "SaliDBKohtaAanestys",
      purpose: "Asiakohdan ja aanestyksen linkitys",
    },
    {
      tableName: "SaliDBKohtaAsiakirja",
      purpose: "Asiakohdan asiakirjalinkit",
    },
    { tableName: "SaliDBTiedote", purpose: "Istuntoihin liittyvat tiedotteet" },
    { tableName: "VaskiData", purpose: "Asiakirjat, poytakirjat ja liitteet" },
  ],
  aanestykset: [
    { tableName: "SaliDBAanestys", purpose: "Aanestyksen paatiedot" },
    { tableName: "SaliDBAanestysEdustaja", purpose: "Edustajakohtaiset aanet" },
    {
      tableName: "SaliDBKohtaAanestys",
      purpose: "Aanestyksen kytkenta asiakohtaan",
    },
    { tableName: "SaliDBIstunto", purpose: "Istuntokonteksti" },
    { tableName: "SaliDBKohta", purpose: "Aanestettavan asian kuvaus" },
  ],
  asiakirjat: [
    { tableName: "VaskiData", purpose: "Asiakirjojen runkosisalto" },
    {
      tableName: "SaliDBKohtaAsiakirja",
      purpose: "Asiakirjan linkitys istuntoihin",
    },
  ],
  analytiikka: [
    { tableName: "MemberOfParliament", purpose: "Edustaja- ja puoluejakaumat" },
    { tableName: "SaliDBAanestys", purpose: "Aanestysaktiivisuuden pohjadata" },
    {
      tableName: "SaliDBAanestysEdustaja",
      purpose: "Henkilo- ja puoluekohtainen aanestysdata",
    },
    { tableName: "SaliDBPuheenvuoro", purpose: "Puheaktiivisuuden tilastot" },
  ],
  tila: [],
  admin: [],
};

const formatDateTime = (value: string | null): string => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("fi-FI", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const PageDataSourcesDrawer = ({
  activeRoute,
}: {
  activeRoute: RouteName;
}) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, TableSummary>>({});

  const sourceDefinitions = PAGE_SOURCES[activeRoute] ?? [];
  const tableNames = useMemo(
    () =>
      Array.from(
        new Set(
          sourceDefinitions
            .map((sourceDefinition) => sourceDefinition.tableName)
            .filter((tableName) => tableName.trim() !== ""),
        ),
      ),
    [sourceDefinitions],
  );
  const tablesKey = tableNames.join("|");

  useEffect(() => {
    setError(null);
  }, [activeRoute]);

  useEffect(() => {
    if (!open || tableNames.length === 0) {
      return;
    }

    const abortController = new AbortController();
    let mounted = true;

    const fetchSummaries = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        for (const tableName of tableNames) {
          params.append("tableName", tableName);
        }

        const response = await fetch(
          `/api/import-source/table-summaries?${params.toString()}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          throw new Error(t("pageSources.fetchFailed"));
        }

        const data = (await response.json()) as { tables: TableSummary[] };
        if (!mounted) return;

        const nextSummaries: Record<string, TableSummary> = {};
        for (const table of data.tables ?? []) {
          nextSummaries[table.tableName] = table;
        }
        setSummaries(nextSummaries);
      } catch (err) {
        if (abortController.signal.aborted) return;
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : t("pageSources.fetchFailed"),
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSummaries();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [open, tablesKey, tableNames]);

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

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            width: { xs: "100vw", sm: 460 },
            maxWidth: "100vw",
            height: "100%",
            bgcolor: themedColors.backgroundPaper,
            color: themedColors.textPrimary,
          }}
        >
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
            <Box>
              <Typography
                variant="h6"
                sx={{ fontSize: "1rem", fontWeight: 600 }}
              >
                {t("pageSources.drawerTitle")}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: themedColors.textTertiary }}
              >
                {t(`navigation.routes.${activeRoute}`)}
              </Typography>
            </Box>
            <IconButton onClick={() => setOpen(false)} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ p: 2, overflowY: "auto", height: "calc(100% - 69px)" }}>
            {sourceDefinitions.length === 0 ? (
              <Alert severity="info">{t("pageSources.noMapping")}</Alert>
            ) : loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={26} />
              </Box>
            ) : (
              <Box sx={{ display: "grid", gap: 1.5 }}>
                {error ? <Alert severity="warning">{error}</Alert> : null}
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
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mb: 0.5 }}
                      >
                        {t("pageSources.lastScrapeLine", {
                          value: formatDateTime(summary?.lastScrapedAt ?? null),
                        })}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mb: 0.5 }}
                      >
                        {t("pageSources.lastMigrationLine", {
                          value: formatDateTime(
                            summary?.lastMigratedAt ?? null,
                          ),
                        })}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mb: 1 }}
                      >
                        {t("pageSources.summaryCounts", {
                          rows: summary?.importedRows ?? 0,
                          pages: summary?.distinctPages ?? 0,
                        })}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default PageDataSourcesDrawer;
