import {
  Box,
  Container,
  CssBaseline,
  GlobalStyles,
  Link,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { apiFetch } from "#client/utils/fetch";
import { PageDataSourcesDrawer } from "./components/PageDataSourcesDrawer";
import { TraceProvider } from "./context/TraceContext";
import { Navigation } from "./Navigation";
import { type RouteName, routes } from "./pages";
import { colors, spacing, transitions } from "./theme";
import { useThemedColors } from "./theme/ThemeContext";

const getInitialTab = (): RouteName => {
  const path = window.location.pathname.replace(/^\//, "");
  if (path in routes) return path as RouteName;
  return "";
};

export const App: React.FC = () => {
  const themedColors = useThemedColors();
  const { t } = useScopedTranslation("app");

  const [activeTab, setActiveTab] = useState<RouteName>(getInitialTab());
  const [dbInfo, setDbInfo] = useState<ApiRouteResponse<"/api/db-info"> | null>(null);
  const [versionInfo, setVersionInfo] =
    useState<ApiRouteResponse<"/api/version"> | null>(null);
  const [changeSummary, setChangeSummary] = useState<Pick<
    ApiRouteResponse<`/api/changes-report`>,
    "totalNewRows" | "totalChangedRows"
  > | null>(null);

  useEffect(() => {
    apiFetch("/api/db-info")
      .then((res) => res.json())
      .then((data: ApiRouteResponse<"/api/db-info">) => {
        setDbInfo(data);
      })
      .catch(() => {});

    apiFetch("/api/version")
      .then((res) => res.json())
      .then(setVersionInfo)
      .catch(() => {});

    apiFetch("/api/changes-report")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.totalNewRows === "number") {
          setChangeSummary({
            totalNewRows: data.totalNewRows,
            totalChangedRows: data.totalChangedRows,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const ActivePage = routes[activeTab] ?? routes[""];

  return (
    <TraceProvider>
      <CssBaseline />
      <GlobalStyles
        styles={{
          "html, body, #root": {
            minHeight: "100%",
          },
          body: {
            position: "relative",
            background: `
              radial-gradient(1100px 620px at 8% -10%, var(--ae-ambient-primary), transparent 70%),
              radial-gradient(900px 540px at 98% 0%, var(--ae-ambient-accent), transparent 72%),
              linear-gradient(180deg, ${colors.backgroundDefault} 0%, ${colors.backgroundSubtle} 100%)
          `,
            backgroundAttachment: "fixed",
            minHeight: "100vh",
            overflowX: "hidden",
          },
          "#root": {
            position: "relative",
            zIndex: 1,
          },
          "@keyframes pageEnter": {
            from: {
              opacity: 0,
              transform: "translateY(10px)",
            },
            to: {
              opacity: 1,
              transform: "translateY(0)",
            },
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animationDuration: "0.01ms !important",
              animationIterationCount: "1 !important",
              transitionDuration: "0.01ms !important",
              scrollBehavior: "auto !important",
            },
          },
        }}
      />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <Container
        maxWidth="xl"
        sx={{
          mt: { xs: 2, sm: spacing.md },
          px: { xs: 1.5, sm: 3 },
          pb: { xs: 10, lg: spacing.xl },
        }}
      >
        <Box
          key={activeTab}
          sx={{
            position: "relative",
            animation: `pageEnter ${transitions.slow}ms ${transitions.easing.emphasized}`,
            transformOrigin: "top center",
            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        >
          <React.Suspense
            fallback={<Typography variant="body2">{t("loading")}</Typography>}
          >
            <ActivePage.Component />
          </React.Suspense>
        </Box>

        <Box
          component="footer"
          sx={{
            mt: spacing.lg,
            pt: spacing.md,
            pb: spacing.sm,
            textAlign: "center",
            borderTop: `1px solid ${themedColors.dataBorder}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: themedColors.textTertiary,
              display: "block",
              lineHeight: 1.6,
            }}
          >
            {t("disclaimer.source")}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: themedColors.textTertiary,
              display: "block",
              mt: 0.5,
              lineHeight: 1.6,
            }}
          >
            {t("disclaimer.unofficial")}
          </Typography>
          {dbInfo?.lastScraperRunAt && (
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                display: "block",
                mt: 0.5,
                lineHeight: 1.6,
              }}
            >
              {t("disclaimer.lastScraperRunAt", {
                timestamp: new Date(dbInfo.lastScraperRunAt).toLocaleString("fi-FI"),
              })}
            </Typography>
          )}
          {dbInfo?.lastMigratorRunAt && (
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                display: "block",
                mt: 0.5,
                lineHeight: 1.6,
              }}
            >
              {t("disclaimer.lastMigratorRunAt", {
                timestamp: new Date(dbInfo.lastMigratorRunAt).toLocaleString("fi-FI"),
              })}
            </Typography>
          )}
          {dbInfo?.lastMigrationTimestamp && (
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                display: "block",
                mt: 0.5,
                lineHeight: 1.6,
              }}
            >
              {t("disclaimer.dbBuildTimestamp", {
                timestamp: new Date(dbInfo.lastMigrationTimestamp).toLocaleString("fi-FI"),
              })}
            </Typography>
          )}
          {versionInfo && (
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                display: "block",
                mt: 0.5,
                lineHeight: 1.6,
              }}
            >
              {`v${versionInfo.version}${versionInfo.gitHash ? ` (${versionInfo.gitHash})` : ""}`}
            </Typography>
          )}
          {changeSummary && (
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                display: "block",
                mt: 0.5,
                lineHeight: 1.6,
              }}
            >
              <Link
                href="/muutokset"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState({}, "", "/muutokset");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
                sx={{ color: "inherit", textDecorationColor: "inherit" }}
              >
                {changeSummary.totalNewRows + changeSummary.totalChangedRows > 0
                  ? `${changeSummary.totalNewRows + changeSummary.totalChangedRows} muutosta viime päivityksessä`
                  : "Ei muutoksia viime päivityksessä"}
              </Link>
            </Typography>
          )}
        </Box>
      </Container>
      <PageDataSourcesDrawer activeRoute={activeTab} />
    </TraceProvider>
  );
};

export default App;
