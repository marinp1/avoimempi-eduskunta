import React, { useState } from "react";
import { Container, Tabs, Tab, Box, CssBaseline } from "@mui/material";
import VotingsPage from "./Votings";
import EdustajatPage from "./Edustajat";

const Pages = Object.freeze({
  Votings: "votings",
  Edustajat: "edustajat",
});

type Page = (typeof Pages)[keyof typeof Pages];

const PageComponents = {
  [Pages.Votings]: VotingsPage,
  [Pages.Edustajat]: EdustajatPage,
} satisfies Record<Page, React.FC<Record<string, never>>>;

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Page>(Pages.Edustajat);

  const handleChange = (event: React.SyntheticEvent, newValue: Page) => {
    setActiveTab(newValue);
  };

  const ActivePage = PageComponents[activeTab];

  return (
    <>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Votings" value={Pages.Votings} />
            <Tab label="Edustajat" value={Pages.Edustajat} />
          </Tabs>
        </Box>

        {/* Active page */}
        <Box>
          <ActivePage />
        </Box>
      </Container>
    </>
  );
};

export default App;
