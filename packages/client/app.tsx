import {
  Box,
  Container,
  CssBaseline,
  GlobalStyles,
  LinearProgress,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageDataSourcesDrawer } from "./components/PageDataSourcesDrawer";
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
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<RouteName>(getInitialTab());
  const [migrationOngoing, setMigrationOngoing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshMaintenanceStatus = async () => {
      try {
        const response = await fetch("/api/system/maintenance", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = (await response.json()) as { migrationOngoing?: boolean };
        if (!cancelled) {
          setMigrationOngoing(data.migrationOngoing === true);
        }
      } catch {
        // Ignore transient network errors and retry on next interval.
      }
    };

    refreshMaintenanceStatus();
    const intervalId = window.setInterval(refreshMaintenanceStatus, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const ActivePage = routes[activeTab];

  return (
    <>
      <CssBaseline />
      <GlobalStyles
        styles={{
          ":root": {
            "--ae-ambient-primary": "rgba(74, 111, 165, 0.18)",
            "--ae-ambient-accent": "rgba(232, 145, 58, 0.1)",
            "--ae-ambient-neutral": "rgba(27, 42, 74, 0.06)",
          },
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
          "body::before": {
            content: '""',
            position: "fixed",
            width: "38vw",
            minWidth: 320,
            height: "38vw",
            minHeight: 320,
            top: "-14vw",
            right: "-12vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, var(--ae-ambient-primary) 0%, transparent 72%)",
            filter: "blur(16px)",
            pointerEvents: "none",
            zIndex: 0,
            animation: `ambientFloatA ${transitions.extraSlow * 3}ms ${transitions.easing.smooth} infinite alternate`,
          },
          "body::after": {
            content: '""',
            position: "fixed",
            width: "28vw",
            minWidth: 250,
            height: "28vw",
            minHeight: 250,
            bottom: "-11vw",
            left: "-10vw",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, var(--ae-ambient-neutral) 0%, transparent 74%)",
            filter: "blur(16px)",
            pointerEvents: "none",
            zIndex: 0,
            animation: `ambientFloatB ${transitions.extraSlow * 4}ms ${transitions.easing.smooth} infinite alternate`,
          },
          "@keyframes ambientFloatA": {
            from: {
              transform: "translate3d(0, 0, 0) scale(1)",
            },
            to: {
              transform: "translate3d(-2.5vw, 2vw, 0) scale(1.08)",
            },
          },
          "@keyframes ambientFloatB": {
            from: {
              transform: "translate3d(0, 0, 0) scale(1)",
            },
            to: {
              transform: "translate3d(2vw, -1.5vw, 0) scale(1.04)",
            },
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
            "body::before, body::after": {
              display: "none",
            },
          },
        }}
      />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      {migrationOngoing && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            backgroundColor: "rgba(10, 17, 29, 0.65)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Box
            sx={{
              width: "min(640px, 100%)",
              borderRadius: 2,
              overflow: "hidden",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.35)",
              bgcolor: "background.paper",
              border: `1px solid ${themedColors.dataBorder}`,
            }}
          >
            <Box
              sx={{
                p: 2,
                background:
                  "linear-gradient(135deg, rgba(232,145,58,0.16), rgba(74,111,165,0.16))",
              }}
            >
              <Typography variant="h6">Migration ongoing</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                The application is temporarily unavailable while the database is
                being rebuilt.
              </Typography>
            </Box>
            <LinearProgress />
          </Box>
        </Box>
      )}
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
            fallback={
              <Typography variant="body2">{t("app.loading")}</Typography>
            }
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
            {t("app.disclaimer.source")}
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
            {t("app.disclaimer.unofficial")}
          </Typography>
        </Box>
      </Container>
      <PageDataSourcesDrawer activeRoute={activeTab} />
    </>
  );
};

export default App;
