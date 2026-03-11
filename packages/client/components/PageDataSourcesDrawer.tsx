import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Divider,
  Fab,
  Link,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getInitialTraceTab,
  getTraceItemKey,
  groupTraceItemsByTable,
  resolveTraceSelection,
  type TraceExplorerTab,
} from "#client/components/traceExplorerModel";
import { type TraceItem, useTrace } from "#client/context/TraceContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { apiFetch } from "#client/utils/fetch";
import { useOverlayDrawer } from "../context/OverlayDrawerContext";
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

const TRACE_DRAWER_KEY = "trace-explorer";

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
  hallitukset: [
    { tableName: "MemberOfParliament", purpose: "Ministerien henkilotiedot" },
  ],
  muutokset: [],
  laadunvalvonta: [],
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
  const { t: tPageSources } = useScopedTranslation("pageSources");
  const { t: tNavigation } = useScopedTranslation("navigation");
  const { pageItems, registerOpenDrawer } = useTrace();
  const { currentDrawerKey, openRootDrawer, replaceDrawer } =
    useOverlayDrawer();

  const sourceDefinitions = PAGE_SOURCES[activeRoute] ?? [];

  const overlayConfig = useMemo(
    () => ({
      drawerKey: TRACE_DRAWER_KEY,
      title: tPageSources("drawerTitle"),
      subtitle: tNavigation(`routes.${activeRoute}`),
      meta: (
        <>
          <Chip
            size="small"
            label={tPageSources("itemsCountMeta", { count: pageItems.length })}
          />
          <Chip
            size="small"
            label={tPageSources("tablesCountMeta", {
              count: sourceDefinitions.length,
            })}
          />
        </>
      ),
      paperSx: {
        width: { xs: "100%", sm: "96%", md: "88%", lg: "78%" },
        maxWidth: "1320px",
      },
      content: (
        <TraceOverlayContent
          activeRoute={activeRoute}
          sourceDefinitions={sourceDefinitions}
        />
      ),
    }),
    [
      activeRoute,
      pageItems.length,
      sourceDefinitions,
      tNavigation,
      tPageSources,
    ],
  );

  const openOverlay = useCallback(() => {
    openRootDrawer(overlayConfig);
  }, [openRootDrawer, overlayConfig]);

  useEffect(() => {
    registerOpenDrawer(openOverlay);
  }, [openOverlay, registerOpenDrawer]);

  useEffect(() => {
    if (currentDrawerKey !== TRACE_DRAWER_KEY) return;
    replaceDrawer(overlayConfig);
  }, [currentDrawerKey, overlayConfig, replaceDrawer]);

  return (
    <Tooltip title={tPageSources("openTooltip")}>
      <Fab
        color="primary"
        variant="extended"
        onClick={openOverlay}
        sx={{
          position: "fixed",
          right: { xs: 12, sm: 20 },
          bottom: { xs: 74, lg: 20 },
          zIndex: 1200,
          textTransform: "none",
        }}
      >
        <TravelExploreIcon sx={{ mr: 1 }} />
        {tPageSources("buttonLabel")}
      </Fab>
    </Tooltip>
  );
};

const TraceOverlayContent = ({
  activeRoute,
  sourceDefinitions,
}: {
  activeRoute: RouteName;
  sourceDefinitions: TableSourceDefinition[];
}) => {
  const themedColors = useThemedColors();
  const { t: tPageSources } = useScopedTranslation("pageSources");
  const { t: tNavigation } = useScopedTranslation("navigation");
  const { pageItems, traceItem, setTraceItem } = useTrace();

  const [activeTab, setActiveTab] = useState<TraceExplorerTab>(() =>
    getInitialTraceTab({
      pageItems,
      hasSourceDefinitions: sourceDefinitions.length > 0,
    }),
  );
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [summariesError, setSummariesError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, TableSummary>>({});
  const [rowTrace, setRowTrace] = useState<RowTrace | null>(null);
  const [rowTraceLoading, setRowTraceLoading] = useState(false);
  const [rowTraceError, setRowTraceError] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => resolveTraceSelection(pageItems, traceItem),
    [pageItems, traceItem],
  );
  const groupedItems = useMemo(
    () => groupTraceItemsByTable(pageItems),
    [pageItems],
  );
  const tableNames = useMemo(
    () =>
      Array.from(
        new Set(
          sourceDefinitions
            .map((definition) => definition.tableName)
            .filter((name) => name.trim() !== ""),
        ),
      ),
    [sourceDefinitions],
  );

  useEffect(() => {
    if (pageItems.length === 0) {
      if (traceItem) {
        setTraceItem(null);
      }
      if (sourceDefinitions.length > 0 && activeTab === "item") {
        setActiveTab("page");
      }
      return;
    }

    if (!selectedItem) return;
    if (
      !traceItem ||
      getTraceItemKey(traceItem) !== getTraceItemKey(selectedItem)
    ) {
      setTraceItem(selectedItem);
    }
  }, [
    activeTab,
    pageItems,
    selectedItem,
    setTraceItem,
    sourceDefinitions.length,
    traceItem,
  ]);

  useEffect(() => {
    if (tableNames.length === 0) {
      setSummaries({});
      return;
    }

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
        const response = await apiFetch(
          `/api/import-source/table-summaries?${params.toString()}`,
          { signal: abortController.signal },
        );
        if (!response.ok) throw new Error(tPageSources("fetchFailed"));

        const data = (await response.json()) as { tables: TableSummary[] };
        if (!mounted) return;

        const nextSummaries: Record<string, TableSummary> = {};
        for (const table of data.tables ?? []) {
          nextSummaries[table.tableName] = table;
        }
        setSummaries(nextSummaries);
      } catch (error) {
        if (abortController.signal.aborted || !mounted) return;
        setSummariesError(
          error instanceof Error ? error.message : tPageSources("fetchFailed"),
        );
      } finally {
        if (mounted) {
          setSummariesLoading(false);
        }
      }
    };

    fetchSummaries();
    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [tPageSources, tableNames]);

  useEffect(() => {
    if (!selectedItem) {
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
          table: selectedItem.table,
          pkName: selectedItem.pkName,
          pkValue: selectedItem.pkValue,
        });
        const response = await apiFetch(
          `/api/import-source/row-trace?${params.toString()}`,
          { signal: abortController.signal },
        );

        if (!mounted) return;

        if (response.status === 404) {
          setRowTrace(null);
          setRowTraceError(tPageSources("rowTraceNotFound"));
          return;
        }
        if (!response.ok) throw new Error(tPageSources("fetchFailed"));

        setRowTrace((await response.json()) as RowTrace);
      } catch (error) {
        if (abortController.signal.aborted || !mounted) return;
        setRowTraceError(
          error instanceof Error ? error.message : tPageSources("fetchFailed"),
        );
      } finally {
        if (mounted) {
          setRowTraceLoading(false);
        }
      }
    };

    fetchTrace();
    return () => {
      mounted = false;
      abortController.abort();
    };
  }, [selectedItem, tPageSources]);

  const totalImportedRows = useMemo(
    () =>
      tableNames.reduce(
        (sum, tableName) => sum + (summaries[tableName]?.importedRows ?? 0),
        0,
      ),
    [summaries, tableNames],
  );

  return (
    <Box sx={{ display: "grid", gap: 2.5 }}>
      <Box>
        <Typography
          variant="body2"
          sx={{ color: themedColors.textSecondary, mb: 1.5 }}
        >
          {tPageSources("overlayIntro", {
            route: tNavigation(`routes.${activeRoute}`),
          })}
        </Typography>
        <Tabs
          value={activeTab}
          onChange={(_, nextTab: TraceExplorerTab) => setActiveTab(nextTab)}
          variant="fullWidth"
          sx={{
            borderRadius: 2,
            p: 0.5,
            bgcolor: themedColors.backgroundSubtle,
            border: `1px solid ${themedColors.dataBorder}`,
            "& .MuiTabs-indicator": {
              display: "none",
            },
            "& .MuiTab-root": {
              minHeight: 44,
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 600,
              color: themedColors.textSecondary,
            },
            "& .Mui-selected": {
              bgcolor: themedColors.backgroundPaper,
              color: themedColors.textPrimary,
            },
          }}
        >
          <Tab value="item" label={tPageSources("itemTabLabel")} />
          <Tab value="page" label={tPageSources("pageTabLabel")} />
        </Tabs>
      </Box>

      {activeTab === "item" ? (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", lg: "320px minmax(0, 1fr)" },
            alignItems: "start",
          }}
        >
          <TraceItemBrowser
            groupedItems={groupedItems}
            selectedItemKey={
              selectedItem ? getTraceItemKey(selectedItem) : null
            }
            onSelect={(item) => setTraceItem(item)}
            themedColors={themedColors}
          />
          <TraceFlowCanvas
            rowTrace={rowTrace}
            rowTraceError={rowTraceError}
            rowTraceLoading={rowTraceLoading}
            selectedItem={selectedItem}
            sourceDefinitions={sourceDefinitions}
            themedColors={themedColors}
          />
        </Box>
      ) : (
        <TracePageSourcesTab
          sourceDefinitions={sourceDefinitions}
          summaries={summaries}
          summariesLoading={summariesLoading}
          summariesError={summariesError}
          themedColors={themedColors}
          totalImportedRows={totalImportedRows}
        />
      )}
    </Box>
  );
};

const TraceItemBrowser = ({
  groupedItems,
  selectedItemKey,
  onSelect,
  themedColors,
}: {
  groupedItems: ReturnType<typeof groupTraceItemsByTable>;
  selectedItemKey: string | null;
  onSelect: (item: TraceItem) => void;
  themedColors: ReturnType<
    typeof import("../theme/ThemeContext").useThemedColors
  >;
}) => {
  const { t } = useScopedTranslation("pageSources");

  return (
    <Box
      sx={{
        border: `1px solid ${themedColors.dataBorder}`,
        borderRadius: 3,
        bgcolor: themedColors.backgroundPaper,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${themedColors.dataBorder}`,
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: themedColors.textTertiary }}
        >
          {t("itemBrowserEyebrow")}
        </Typography>
        <Typography variant="body2" sx={{ color: themedColors.textSecondary }}>
          {t("itemBrowserDescription")}
        </Typography>
      </Box>

      {groupedItems.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="info" role="status" aria-live="polite">
            {t("noPageItems")}
          </Alert>
        </Box>
      ) : (
        <Stack sx={{ maxHeight: { lg: "70vh" }, overflowY: "auto" }}>
          {groupedItems.map((group, index) => (
            <Box
              key={group.table}
              sx={{
                px: 2,
                py: 1.5,
                borderBottom:
                  index === groupedItems.length - 1
                    ? "none"
                    : `1px solid ${themedColors.dataBorder}`,
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {group.table}
                </Typography>
                <Chip
                  size="small"
                  label={t("groupCount", { count: group.items.length })}
                />
              </Stack>
              <Stack spacing={0.75}>
                {group.items.map((item) => {
                  const itemKey = getTraceItemKey(item);
                  const selected = itemKey === selectedItemKey;

                  return (
                    <ButtonBase
                      key={itemKey}
                      onClick={() => onSelect(item)}
                      sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        px: 1.25,
                        py: 1,
                        borderRadius: 2,
                        border: `1px solid ${
                          selected
                            ? `${themedColors.primary}55`
                            : themedColors.dataBorder
                        }`,
                        bgcolor: selected
                          ? `${themedColors.primary}12`
                          : themedColors.backgroundSubtle,
                        textAlign: "left",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          minWidth: 0,
                          flex: 1,
                          fontWeight: selected ? 700 : 500,
                          color: themedColors.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.label}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${item.pkName}=${item.pkValue}`}
                        sx={{
                          maxWidth: 156,
                          flexShrink: 0,
                          fontFamily: "monospace",
                          fontSize: "0.65rem",
                        }}
                      />
                    </ButtonBase>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

const TraceFlowCanvas = ({
  selectedItem,
  rowTrace,
  rowTraceError,
  rowTraceLoading,
  sourceDefinitions,
  themedColors,
}: {
  selectedItem: TraceItem | null;
  rowTrace: RowTrace | null;
  rowTraceError: string | null;
  rowTraceLoading: boolean;
  sourceDefinitions: TableSourceDefinition[];
  themedColors: ReturnType<
    typeof import("../theme/ThemeContext").useThemedColors
  >;
}) => {
  const { t } = useScopedTranslation("pageSources");
  const sourcePurpose = useMemo(
    () =>
      selectedItem
        ? (sourceDefinitions.find(
            (definition) => definition.tableName === selectedItem.table,
          )?.purpose ?? null)
        : null,
    [selectedItem, sourceDefinitions],
  );

  if (!selectedItem) {
    return (
      <Alert severity="info" role="status" aria-live="polite">
        {t("noPageItems")}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        border: `1px solid ${themedColors.dataBorder}`,
        borderRadius: 3,
        bgcolor: themedColors.backgroundPaper,
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Stack spacing={1.5}>
        <Box>
          <Typography
            variant="overline"
            sx={{ color: themedColors.textTertiary }}
          >
            {t("itemTraceTitle")}
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontSize: "1.05rem", fontWeight: 700, mt: 0.25 }}
          >
            {selectedItem.label}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ mt: 1 }}
          >
            <Chip size="small" label={selectedItem.table} />
            <Chip
              size="small"
              label={`${selectedItem.pkName}=${selectedItem.pkValue}`}
              sx={{ fontFamily: "monospace" }}
            />
            {sourcePurpose && <Chip size="small" label={sourcePurpose} />}
          </Stack>
        </Box>

        {rowTraceError && (
          <Alert severity="info" role="status" aria-live="polite">
            {rowTraceError}
          </Alert>
        )}

        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={{ xs: 1.25, xl: 1 }}
          alignItems="stretch"
        >
          <TraceFlowStep
            title={t("flowStepVisibleTitle")}
            eyebrow={t("flowStepVisibleEyebrow")}
            icon={<VisibilityOutlinedIcon sx={{ fontSize: 18 }} />}
            themedColors={themedColors}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {selectedItem.label}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: themedColors.textSecondary,
                mt: 0.75,
              }}
            >
              {t("flowStepVisibleCopy")}
            </Typography>
          </TraceFlowStep>

          <TraceFlowConnector themedColors={themedColors} />

          <TraceFlowStep
            title={t("flowStepImportedTitle")}
            eyebrow={t("flowStepImportedEyebrow")}
            icon={<StorageRoundedIcon sx={{ fontSize: 18 }} />}
            themedColors={themedColors}
          >
            {rowTraceLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <>
                <Typography
                  variant="caption"
                  sx={{ display: "block", mb: 0.5 }}
                >
                  {t("lastScrapeLine", {
                    value: formatDateTime(rowTrace?.scrapedAt ?? null),
                  })}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", mb: 0.75 }}
                >
                  {t("lastMigrationLine", {
                    value: formatDateTime(rowTrace?.migratedAt ?? null),
                  })}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", color: themedColors.textSecondary }}
                >
                  {t("flowStepImportedCopy")}
                </Typography>
              </>
            )}
          </TraceFlowStep>

          <TraceFlowConnector themedColors={themedColors} />

          <TraceFlowStep
            title={t("flowStepApiTitle")}
            eyebrow={t("flowStepApiEyebrow")}
            icon={<AccountTreeRoundedIcon sx={{ fontSize: 18 }} />}
            themedColors={themedColors}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
              {t("apiSourceLabel")}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: themedColors.textSecondary,
                mb: 1.25,
              }}
            >
              {t("flowStepApiCopy")}
            </Typography>
            {rowTrace ? (
              <Button
                component={Link}
                href={rowTrace.apiUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                variant="outlined"
                endIcon={
                  <OpenInNewIcon sx={{ fontSize: "0.9rem !important" }} />
                }
                sx={{ textTransform: "none", alignSelf: "flex-start" }}
              >
                {t("openApiSource")}
              </Button>
            ) : (
              <Typography
                variant="caption"
                sx={{ color: themedColors.textTertiary }}
              >
                {t("openApiUnavailable")}
              </Typography>
            )}
          </TraceFlowStep>
        </Stack>
      </Stack>
    </Box>
  );
};

const TraceFlowStep = ({
  eyebrow,
  title,
  icon,
  children,
  themedColors,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  themedColors: ReturnType<
    typeof import("../theme/ThemeContext").useThemedColors
  >;
}) => (
  <Box
    sx={{
      minWidth: 0,
      flex: 1,
      borderRadius: 3,
      border: `1px solid ${themedColors.dataBorder}`,
      bgcolor: themedColors.backgroundSubtle,
      p: 2,
    }}
  >
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box
        sx={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          bgcolor: `${themedColors.primary}12`,
          color: themedColors.primary,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="overline"
          sx={{ color: themedColors.textTertiary }}
        >
          {eyebrow}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          {title}
        </Typography>
        {children}
      </Box>
    </Stack>
  </Box>
);

const TraceFlowConnector = ({
  themedColors,
}: {
  themedColors: ReturnType<
    typeof import("../theme/ThemeContext").useThemedColors
  >;
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      px: { xl: 0.25 },
      py: { xs: 0.25, xl: 0 },
    }}
  >
    <Box
      sx={{
        width: { xs: 2, xl: 26 },
        height: { xs: 20, xl: 2 },
        borderRadius: 999,
        bgcolor: `${themedColors.primary}33`,
      }}
    />
  </Box>
);

const TracePageSourcesTab = ({
  sourceDefinitions,
  summaries,
  summariesLoading,
  summariesError,
  themedColors,
  totalImportedRows,
}: {
  sourceDefinitions: TableSourceDefinition[];
  summaries: Record<string, TableSummary>;
  summariesLoading: boolean;
  summariesError: string | null;
  themedColors: ReturnType<
    typeof import("../theme/ThemeContext").useThemedColors
  >;
  totalImportedRows: number;
}) => {
  const { t } = useScopedTranslation("pageSources");
  const totalTables = sourceDefinitions.length;

  if (sourceDefinitions.length === 0) {
    return (
      <Alert severity="info" role="status" aria-live="polite">
        {t("noMapping")}
      </Alert>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Chip
          size="small"
          label={t("tablesCountMeta", { count: totalTables })}
        />
        <Chip
          size="small"
          label={t("summaryRowsMeta", { count: totalImportedRows })}
        />
      </Stack>

      {summariesError && (
        <Alert severity="warning" role="status" aria-live="polite">
          {summariesError}
        </Alert>
      )}

      {summariesLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          {sourceDefinitions.map((sourceDefinition) => {
            const summary = summaries[sourceDefinition.tableName];

            return (
              <Box
                key={sourceDefinition.tableName}
                sx={{
                  border: `1px solid ${themedColors.dataBorder}`,
                  borderRadius: 3,
                  p: 2,
                  bgcolor: themedColors.backgroundPaper,
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {sourceDefinition.purpose}
                  </Typography>
                  <Chip size="small" label={sourceDefinition.tableName} />
                </Stack>
                <Divider sx={{ mb: 1.25 }} />
                <Typography
                  variant="caption"
                  sx={{ display: "block", mb: 0.5 }}
                >
                  {t("lastScrapeLine", {
                    value: formatDateTime(summary?.lastScrapedAt ?? null),
                  })}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", mb: 0.5 }}
                >
                  {t("lastMigrationLine", {
                    value: formatDateTime(summary?.lastMigratedAt ?? null),
                  })}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: "block", color: themedColors.textSecondary }}
                >
                  {t("summaryCounts", {
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
  );
};

export default PageDataSourcesDrawer;
