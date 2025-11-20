import { AppBar, Box, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import type React from "react";
import { type RouteName, routes } from "./pages";
import { gradients, spacing } from "./theme";

export const Navigation: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
}> = ({ activeTab, setActiveTab }) => {
  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    const search = window.location.search;
    const newPath = `/${newValue}${search}`;
    window.history.pushState({}, "", newPath);
  };

  return (
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
        <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "flex" } }}>
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
            {Object.entries(routes).map(([key, { icon: Icon, title }]) => {
              if (
                process.env.MODE !== "production" &&
                (key as RouteName) === "admin"
              ) {
                // FIXME: Retain admin in prod
                return;
              }
              return (
                <Tab
                  key={key}
                  icon={<Icon sx={{ fontSize: 20 }} />}
                  iconPosition="start"
                  label={title}
                  value={key}
                />
              );
            })}
          </Tabs>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
