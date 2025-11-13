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
  createTheme,
  GlobalStyles,
} from "@mui/material";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PeopleIcon from "@mui/icons-material/People";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import VotingsPage from "./Votings";
import EdustajatPage from "./Edustajat";
import AdminPage from "./Admin";

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

const theme = createTheme({
  palette: {
    primary: {
      main: "#667eea",
    },
    secondary: {
      main: "#764ba2",
    },
    background: {
      default: "#f5f7fa",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.5px",
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export const App: React.FC = () => {
  // Initialize from URL path
  const getInitialTab = (): Page => {
    const path = window.location.pathname;
    if (path === "/votings") return Pages.Votings;
    if (path === "/composition" || path === "/composition/") return Pages.Composition;
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
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
            minHeight: "100vh",
          },
        }}
      />

      {/* Modern Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Typography
            variant="h4"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              letterSpacing: "-0.5px",
              background: "rgba(255,255,255,0.95)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Avoimempi Eduskunta
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, pb: 6 }}>
        {/* Modern Tabs */}
        <Box
          sx={{
            mb: 4,
            borderRadius: 3,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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
                py: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  background: "rgba(102, 126, 234, 0.05)",
                },
              },
              "& .Mui-selected": {
                color: "#667eea !important",
              },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
