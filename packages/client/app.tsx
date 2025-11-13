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
  ThemeProvider,
  GlobalStyles,
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PeopleIcon from "@mui/icons-material/People";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import VotingsPage from "./Votings";
import EdustajatPage from "./Edustajat";
import AdminPage from "./Admin";
import { theme, gradients, commonStyles, spacing, borderRadius } from "./theme";

const Pages = Object.freeze({
  Votings: "votings",
  Composition: "composition",
  Admin: "admin",
});

type Page = (typeof Pages)[keyof typeof Pages];

const PageComponents = {
  [Pages.Votings]: VotingsPage,
  [Pages.Composition]: EdustajatPage,
  [Pages.Admin]: AdminPage,
} satisfies Record<Page, React.FC<Record<string, never>>>;

export const App: React.FC = () => {
  // Initialize from URL path
  const getInitialTab = (): Page => {
    const path = window.location.pathname;
    if (path === "/votings") return Pages.Votings;
    if (path === "/composition" || path === "/composition/")
      return Pages.Composition;
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          body: {
            background: gradients.background,
            minHeight: "100vh",
          },
        }}
      />

      {/* Modern Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: gradients.primary,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Toolbar sx={{ py: spacing.xs }}>
          <Typography
            variant="h4"
            sx={{
              flexGrow: 1,
              ...commonStyles.gradientText,
              background: "rgba(255,255,255,0.95)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Avoimempi Eduskunta
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: spacing.lg, pb: spacing.xl }}>
        {/* Modern Tabs */}
        <Box
          sx={{
            mb: spacing.lg,
            ...commonStyles.glassCard,
            overflow: "hidden",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleChange}
            variant="fullWidth"
            sx={{
              "& .MuiTab-root": {
                fontWeight: 600,
                fontSize: "1rem",
                py: spacing.sm,
                transition: "all 0.3s ease",
                "&:hover": {
                  background: "rgba(102, 126, 234, 0.05)",
                },
              },
              "& .Mui-selected": {
                color: `${theme.palette.primary.main} !important`,
              },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
                background: gradients.primary,
              },
            }}
          >
            <Tab
              icon={<HowToVoteIcon />}
              iconPosition="start"
              label="Äänestykset"
              value={Pages.Votings}
            />
            <Tab
              icon={<PeopleIcon />}
              iconPosition="start"
              label="Edustajat"
              value={Pages.Composition}
            />
            <Tab
              icon={<AdminPanelSettingsIcon />}
              iconPosition="start"
              label="Admin"
              value={Pages.Admin}
            />
          </Tabs>
        </Box>

        {/* Active page */}
        <Box>
          <ActivePage />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
