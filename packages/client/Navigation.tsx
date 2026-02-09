import { Menu as MenuIcon } from "@mui/icons-material";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type RouteName, routes } from "./pages";
import theme, { gradients, spacing } from "./theme";
import { applicationMode } from "./utils";

export const Navigation: React.FC<{
  activeTab: string;
  setActiveTab: (tab: RouteName) => void;
}> = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation();

  const handleChange = (_event: React.SyntheticEvent, newValue: RouteName) => {
    setActiveTab(newValue);
    const search = window.location.search;
    const newPath = `/${newValue}${search}`;
    window.history.pushState({}, "", newPath);
  };

  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const handleMobileNavClick = (path: RouteName) => {
    setActiveTab(path);
    const search = window.location.search;
    const newPath = `/${path}${search}`;
    window.history.pushState({}, "", newPath);
    setOpen(false);
  };

  const DrawerList = (
    <Box sx={{ width: 280 }} role="presentation">
      <Box
        sx={{
          p: 2.5,
          background: gradients.primary,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "white",
            fontWeight: 600,
            fontSize: "1.125rem",
          }}
        >
          {t("app.title")}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "rgba(255,255,255,0.8)",
            display: "block",
            mt: 0.5,
          }}
        >
          {t("app.subtitle")}
        </Typography>
      </Box>
      <List sx={{ pt: 1 }}>
        {Object.entries(routes).map(([path, { icon: Icon }]) => {
          if (
            applicationMode === "production" &&
            (path as RouteName) === "admin"
          ) {
            return null;
          }
          const isActive = activeTab === path;
          return (
            <ListItem key={path} disablePadding>
              <ListItemButton
                onClick={() => handleMobileNavClick(path as RouteName)}
                sx={{
                  py: 1.5,
                  px: 2.5,
                  color: isActive ? theme.palette.primary.main : "text.primary",
                  bgcolor: isActive
                    ? `${theme.palette.primary.main}0A`
                    : "transparent",
                  borderRight: isActive
                    ? `3px solid ${theme.palette.primary.main}`
                    : "3px solid transparent",
                  "&:hover": {
                    bgcolor: `${theme.palette.primary.main}0A`,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive
                      ? theme.palette.primary.main
                      : "text.secondary",
                    minWidth: 40,
                  }}
                >
                  <Icon />
                </ListItemIcon>
                <ListItemText
                  primary={t(`navigation.routes.${path}`)}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.9375rem",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        borderRadius: 0,
        background: gradients.primary,
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
      }}
    >
      <Toolbar
        sx={{
          py: { xs: 1.5, sm: spacing.md },
          px: { xs: 2, sm: spacing.lg },
          minHeight: { xs: 56, sm: 64 },
        }}
      >
        <Box sx={{ flexGrow: 0, mr: { xs: 0, lg: spacing.xl } }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              color: "white",
              fontWeight: 600,
              letterSpacing: "0.01em",
              fontSize: { xs: "1rem", sm: "1.375rem" },
              whiteSpace: "nowrap",
            }}
          >
            {t("app.title")}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.9)",
              fontSize: { xs: "0.6875rem", sm: "0.8125rem" },
              fontWeight: 400,
              letterSpacing: "0.02em",
              mt: 0.25,
              display: { xs: "none", sm: "block" },
            }}
          >
            {t("app.subtitle")}
          </Typography>
        </Box>

        <Box
          sx={{
            justifyContent: "end",
            flexGrow: 1,
            display: { xs: "flex", lg: "none" },
          }}
        >
          <IconButton
            aria-label={t("navigation.openMenu")}
            onClick={toggleDrawer(true)}
            sx={{
              color: "white",
              p: 1,
            }}
          >
            <MenuIcon />
          </IconButton>
          <Drawer anchor="right" open={open} onClose={toggleDrawer(false)}>
            {DrawerList}
          </Drawer>
        </Box>

        {/* Navigation Tabs in Header */}
        <Box sx={{ flexGrow: 1, display: { xs: "none", lg: "flex" } }}>
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
            {Object.entries(routes).map(([key, { icon: Icon }]) => {
              if (
                applicationMode === "production" &&
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
                  label={t(`navigation.routes.${key}`)}
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
