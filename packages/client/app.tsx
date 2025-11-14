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
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PeopleIcon from "@mui/icons-material/People";
import EventIcon from "@mui/icons-material/Event";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import InsightsIcon from "@mui/icons-material/Insights";
import VotingsPage from "./Votings";
import EdustajatPage from "./Edustajat";
import IstunnotPage from "./Istunnot";
import AdminPage from "./Admin";
import InsightsPage from "./Insights";
import { gradients, commonStyles, spacing, borderRadius } from "./theme";
import { useThemedColors } from "./theme/ThemeContext";

const Pages = Object.freeze({
  Votings: "votings",
  Composition: "composition",
  Sessions: "sessions",
  Insights: "insights",
  Admin: "admin",
});

type Page = (typeof Pages)[keyof typeof Pages];

const PageComponents = {
  [Pages.Votings]: VotingsPage,
  [Pages.Composition]: EdustajatPage,
  [Pages.Sessions]: IstunnotPage,
  [Pages.Insights]: InsightsPage,
  [Pages.Admin]: AdminPage,
} satisfies Record<Page, React.FC<Record<string, never>>>;

export const App: React.FC = () => {
  const themedColors = useThemedColors();

  // Initialize from URL path
  const getInitialTab = (): Page => {
    const path = window.location.pathname;
    if (path === "/votings") return Pages.Votings;
    if (path === "/composition" || path === "/composition/")
      return Pages.Composition;
    if (path === "/sessions") return Pages.Sessions;
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

      {/* Professional Header with Navigation */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: gradients.primary,
          borderBottom: "2px solid rgba(255,255,255,0.15)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Toolbar sx={{ py: spacing.sm, px: spacing.lg }}>
          <Box sx={{ flexGrow: 0, mr: spacing.xl }}>
            <Typography
              variant="h5"
              component="h1"
              sx={{
                color: "white",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                whiteSpace: "nowrap",
              }}
            >
              Avoimempi Eduskunta
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "0.75rem",
                fontWeight: 500,
                letterSpacing: "0.02em",
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
                minHeight: 48,
                "& .MuiTab-root": {
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  py: spacing.xs,
                  px: spacing.md,
                  minHeight: 48,
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  color: "rgba(255,255,255,0.85)",
                  "&:hover": {
                    background: "rgba(255,255,255,0.1)",
                    color: "white",
                  },
                },
                "& .Mui-selected": {
                  color: "white !important",
                  fontWeight: 700,
                },
                "& .MuiTabs-indicator": {
                  height: 3,
                  background: "white",
                  borderRadius: "3px 3px 0 0",
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
        </Toolbar>

        {/* Mobile Navigation - Below Header */}
        <Box
          sx={{
            display: { xs: "block", md: "none" },
            px: spacing.md,
            pb: spacing.xs,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              "& .MuiTab-root": {
                fontWeight: 600,
                fontSize: "0.875rem",
                py: spacing.xs,
                px: spacing.sm,
                minHeight: 48,
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                color: "rgba(255,255,255,0.85)",
                "&:hover": {
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                },
              },
              "& .Mui-selected": {
                color: "white !important",
                fontWeight: 700,
              },
              "& .MuiTabs-indicator": {
                height: 3,
                background: "white",
                borderRadius: "3px 3px 0 0",
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
