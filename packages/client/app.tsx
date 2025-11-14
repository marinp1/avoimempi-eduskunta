import React, { useState, useEffect } from "react";
import {
  Container,
  Tabs,
  Tab,
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  GlobalStyles,
  IconButton,
  Tooltip,
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import InsightsIcon from "@mui/icons-material/Insights";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import VotingsPage from "./Votings";
import EdustajatPage from "./Edustajat";
import IstunnotPage from "./Istunnot";
import PaivatPage from "./Paivat";
import AdminPage from "./Admin";
import InsightsPage from "./Insights";
import { gradients, commonStyles, spacing, borderRadius } from "./theme";
import { useThemedColors, useTheme } from "./theme/ThemeContext";

const Pages = Object.freeze({
  Votings: "votings",
  Composition: "composition",
  Sessions: "sessions",
  Days: "days",
  Insights: "insights",
  Admin: "admin",
});

type Page = (typeof Pages)[keyof typeof Pages];

const PageComponents = {
  [Pages.Votings]: VotingsPage,
  [Pages.Composition]: EdustajatPage,
  [Pages.Sessions]: IstunnotPage,
  [Pages.Days]: PaivatPage,
  [Pages.Insights]: InsightsPage,
  [Pages.Admin]: AdminPage,
} satisfies Record<Page, React.FC<Record<string, never>>>;

export const App: React.FC = () => {
  const themedColors = useThemedColors();
  const { mode, toggleTheme } = useTheme();

  // Initialize from URL path
  const getInitialTab = (): Page => {
    const path = window.location.pathname;
    if (path === "/votings") return Pages.Votings;
    if (path === "/composition" || path === "/composition/")
      return Pages.Composition;
    if (path === "/sessions") return Pages.Sessions;
    if (path === "/days") return Pages.Days;
    if (path === "/insights") return Pages.Insights;
    if (path === "/admin") return Pages.Admin;
    // Default to composition
    return Pages.Composition;
  };

  const [activeTab, setActiveTab] = useState<Page>(getInitialTab());

  // Handle initial redirect from / to /composition
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      const search = window.location.search;
      window.history.replaceState({}, "", `/composition${search}`);
      setActiveTab(Pages.Composition);
    }
  }, []);

  // Update URL when tab changes
  const handleChange = (event: React.SyntheticEvent, newValue: Page) => {
    setActiveTab(newValue);
    const search = window.location.search;
    const newPath = `/${newValue}${search}`;
    window.history.pushState({}, "", newPath);
  };

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const ActivePage = PageComponents[activeTab];

  return (
    <>
      <CssBaseline />
      <GlobalStyles
        styles={{
          body: {
            background: themedColors.background,
            minHeight: "100vh",
          },
        }}
      />

      {/* Government-style Professional Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: gradients.primary,
          borderBottom: "3px solid rgba(255,255,255,0.2)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}
      >
        <Toolbar sx={{ py: spacing.md, px: spacing.lg }}>
          <Box sx={{ flexGrow: 0, mr: spacing.xl }}>
            <Typography
              variant="h5"
              component="h1"
              sx={{
                color: "white",
                fontWeight: 600,
                letterSpacing: "0.01em",
                fontSize: { xs: "1.125rem", sm: "1.375rem" },
                whiteSpace: "nowrap",
              }}
            >
              Avoimempi Eduskunta
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.9)",
                fontSize: "0.8125rem",
                fontWeight: 400,
                letterSpacing: "0.02em",
                mt: 0.25,
              }}
            >
              Suomen eduskunnan avoin data
            </Typography>
          </Box>

          {/* Navigation Tabs in Header */}
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
            <Tabs
              value={activeTab}
              onChange={handleChange}
              sx={{
                minHeight: 56,
                "& .MuiTab-root": {
                  fontWeight: 500,
                  fontSize: "0.9375rem",
                  py: spacing.sm,
                  px: spacing.lg,
                  minHeight: 56,
                  transition: "all 0.2s ease-in-out",
                  color: "rgba(255,255,255,0.9)",
                  textTransform: "none",
                  "&:hover": {
                    background: "rgba(255,255,255,0.12)",
                    color: "white",
                  },
                },
                "& .Mui-selected": {
                  color: "white !important",
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.08)",
                },
                "& .MuiTabs-indicator": {
                  height: 4,
                  background: "white",
                  borderRadius: 0,
                },
              }}
            >
              <Tab
                icon={<HowToVoteIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Äänestykset"
                value={Pages.Votings}
              />
              <Tab
                icon={<PeopleIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Edustajat"
                value={Pages.Composition}
              />
              <Tab
                icon={<EventIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Istunnot"
                value={Pages.Sessions}
              />
              <Tab
                icon={<CalendarTodayIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Päivät"
                value={Pages.Days}
              />
              <Tab
                icon={<InsightsIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Analytiikka"
                value={Pages.Insights}
              />
              <Tab
                icon={<AdminPanelSettingsIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Admin"
                value={Pages.Admin}
              />
            </Tabs>
          </Box>

          {/* Theme Switcher */}
          <Box sx={{ ml: spacing.md }}>
            <Tooltip title={mode === "light" ? "Tumma teema" : "Vaalea teema"}>
              <IconButton
                onClick={toggleTheme}
                sx={{
                  color: "white",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    background: "rgba(255,255,255,0.12)",
                  },
                }}
              >
                {mode === "light" ? (
                  <Brightness4Icon sx={{ fontSize: 24 }} />
                ) : (
                  <Brightness7Icon sx={{ fontSize: 24 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>

        {/* Mobile Navigation - Below Header */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            px: spacing.md,
            pb: spacing.sm,
            gap: spacing.sm,
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Tabs
              value={activeTab}
              onChange={handleChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 48,
                "& .MuiTab-root": {
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  py: spacing.xs,
                  px: spacing.md,
                  minHeight: 48,
                  transition: "all 0.2s ease-in-out",
                  color: "rgba(255,255,255,0.9)",
                  textTransform: "none",
                  "&:hover": {
                    background: "rgba(255,255,255,0.12)",
                    color: "white",
                  },
                },
                "& .Mui-selected": {
                  color: "white !important",
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.08)",
                },
                "& .MuiTabs-indicator": {
                  height: 4,
                  background: "white",
                  borderRadius: 0,
                },
              }}
            >
              <Tab
                icon={<HowToVoteIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Äänestykset"
                value={Pages.Votings}
              />
              <Tab
                icon={<PeopleIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Edustajat"
                value={Pages.Composition}
              />
              <Tab
                icon={<EventIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Istunnot"
                value={Pages.Sessions}
              />
              <Tab
                icon={<CalendarTodayIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Päivät"
                value={Pages.Days}
              />
              <Tab
                icon={<InsightsIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Analytiikka"
                value={Pages.Insights}
              />
              <Tab
                icon={<AdminPanelSettingsIcon sx={{ fontSize: 20 }} />}
                iconPosition="start"
                label="Admin"
                value={Pages.Admin}
              />
            </Tabs>
          </Box>

          {/* Theme Switcher for Mobile */}
          <Tooltip title={mode === "light" ? "Tumma teema" : "Vaalea teema"}>
            <IconButton
              onClick={toggleTheme}
              sx={{
                color: "white",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  background: "rgba(255,255,255,0.12)",
                },
              }}
            >
              {mode === "light" ? (
                <Brightness4Icon sx={{ fontSize: 24 }} />
              ) : (
                <Brightness7Icon sx={{ fontSize: 24 }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: spacing.md, pb: spacing.xl }}>
        {/* Active page */}
        <Box>
          <ActivePage />
        </Box>
      </Container>
    </>
  );
};

export default App;
