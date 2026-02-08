import { Box, Container, CssBaseline, GlobalStyles, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Navigation } from "./Navigation";
import { type RouteName, routes } from "./pages";
import { spacing } from "./theme";
import { useThemedColors } from "./theme/ThemeContext";

const getInitialTab = (): RouteName => {
  const path = window.location.pathname;
  if (Object.keys(routes).includes(path)) return path as RouteName;
  return "composition";
};

export const App: React.FC = () => {
  const themedColors = useThemedColors();

  const [activeTab, setActiveTab] = useState<RouteName>(getInitialTab());

  // Handle initial redirect from / to /composition
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      const search = window.location.search;
      window.history.replaceState({}, "", `/composition${search}`);
      setActiveTab("composition");
    }
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
          body: {
            background: themedColors.background,
            minHeight: "100vh",
          },
        }}
      />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <Container
        maxWidth="xl"
        sx={{
          mt: { xs: 2, sm: spacing.md },
          px: { xs: 1.5, sm: 3 },
          pb: spacing.xl,
        }}
      >
        <Box>
          <React.Suspense fallback={<div>Loading...</div>}>
            <ActivePage.Component />
          </React.Suspense>
        </Box>

        {/* Disclaimer footer */}
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
            Tietolähde: Eduskunnan avoin data (avoindata.eduskunta.fi)
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
            Tämä on epävirallinen palvelu eikä liity eduskuntaan tai
            valtionhallintoon. Tiedot voivat olla puutteellisia tai
            viiveellisiä.
          </Typography>
        </Box>
      </Container>
    </>
  );
};

export default App;
