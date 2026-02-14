import {
  Close as CloseIcon,
  Event,
  Home,
  HowToVote,
  Menu as MenuIcon,
  MoreHoriz,
  People,
} from "@mui/icons-material";
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
import { colors, spacing } from "./theme";
import { applicationMode } from "./utils";

/** Routes to show in the main desktop navigation */
const mainNavRoutes: RouteName[] = [
  "",
  "edustajat",
  "puolueet",
  "istunnot",
  "aanestykset",
  "asiakirjat",
  "analytiikka",
];

/** Routes that are dev-only */
const devRoutes: RouteName[] = ["tila", "admin"];

/** Routes for mobile bottom tabs */
const mobileTabRoutes: { key: RouteName; icon: React.ElementType }[] = [
  { key: "", icon: Home },
  { key: "edustajat", icon: People },
  { key: "aanestykset", icon: HowToVote },
  { key: "istunnot", icon: Event },
];

export const Navigation: React.FC<{
  activeTab: string;
  setActiveTab: (tab: RouteName) => void;
}> = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigate = (path: RouteName) => {
    setActiveTab(path);
    const search = window.location.search;
    const newPath = path === "" ? `/${search}` : `/${path}${search}`;
    window.history.pushState({}, "", newPath);
  };

  const handleDesktopTabChange = (
    _event: React.SyntheticEvent,
    newValue: RouteName,
  ) => {
    navigate(newValue);
  };

  const handleMobileTabChange = (
    _event: React.SyntheticEvent,
    newValue: RouteName,
  ) => {
    navigate(newValue);
  };

  const handleDrawerNavClick = (path: RouteName) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const visibleRoutes =
    applicationMode === "production"
      ? mainNavRoutes
      : [...mainNavRoutes, ...devRoutes];

  const allDrawerRoutes =
    applicationMode === "production"
      ? (Object.keys(routes).filter(
          (k) => !devRoutes.includes(k as RouteName),
        ) as RouteName[])
      : (Object.keys(routes) as RouteName[]);

  const DrawerContent = (
    <Box sx={{ width: 280 }} role="presentation">
      <Box
        sx={{
          p: 2.5,
          background: colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              color: "white",
              fontWeight: 600,
              fontSize: "1.0625rem",
            }}
          >
            {t("app.title")}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.7)",
              display: "block",
              mt: 0.25,
            }}
          >
            {t("app.subtitle")}
          </Typography>
        </Box>
        <IconButton
          onClick={() => setDrawerOpen(false)}
          sx={{ color: "rgba(255,255,255,0.7)" }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <List sx={{ pt: 0.5 }}>
        {allDrawerRoutes.map((path) => {
          const route = routes[path as RouteName];
          const Icon = route.icon;
          const isActive = activeTab === path;
          return (
            <ListItem key={path} disablePadding>
              <ListItemButton
                onClick={() => handleDrawerNavClick(path as RouteName)}
                sx={{
                  py: 1.25,
                  px: 2.5,
                  color: isActive ? colors.primary : colors.textPrimary,
                  bgcolor: isActive ? `${colors.primary}08` : "transparent",
                  borderLeft: isActive
                    ? `3px solid ${colors.primary}`
                    : "3px solid transparent",
                  "&:hover": {
                    bgcolor: `${colors.primary}08`,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? colors.primary : colors.textSecondary,
                    minWidth: 36,
                  }}
                >
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={t(`navigation.routes.${path}`)}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 400,
                    fontSize: "0.875rem",
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
    <>
      {/* Desktop Header */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderRadius: 0,
          background: colors.primary,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          display: { xs: "none", lg: "flex" },
        }}
      >
        <Toolbar
          sx={{
            py: 0,
            px: { sm: spacing.lg },
            minHeight: { sm: 56 },
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flexShrink: 0, mr: spacing.lg }}>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                color: "white",
                fontWeight: 600,
                fontSize: "1.0625rem",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              {t("app.title")}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <Tabs
              value={activeTab}
              onChange={handleDesktopTabChange}
              sx={{
                minHeight: 56,
                "& .MuiTab-root": {
                  fontWeight: 400,
                  fontSize: "0.8125rem",
                  py: 0,
                  px: 2,
                  minHeight: 56,
                  transition: "all 0.15s ease-in-out",
                  color: "rgba(255,255,255,0.7)",
                  textTransform: "none",
                  letterSpacing: "0",
                  "&:hover": {
                    color: "white",
                  },
                },
                "& .Mui-selected": {
                  color: "white !important",
                  fontWeight: 500,
                },
                "& .MuiTabs-indicator": {
                  height: 2,
                  background: "white",
                  borderRadius: "1px 1px 0 0",
                },
              }}
            >
              {visibleRoutes.map((key) => (
                <Tab
                  key={key}
                  label={t(`navigation.routes.${key}`)}
                  value={key}
                />
              ))}
            </Tabs>
          </Box>

          <Box sx={{ flexShrink: 0, width: 100 }} />
        </Toolbar>
      </AppBar>

      {/* Mobile Top Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderRadius: 0,
          background: colors.primary,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          display: { xs: "flex", lg: "none" },
        }}
      >
        <Toolbar
          sx={{
            py: 0,
            px: 2,
            minHeight: 48,
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="h6"
            component="h1"
            sx={{
              color: "white",
              fontWeight: 600,
              fontSize: "0.9375rem",
              letterSpacing: "-0.01em",
            }}
          >
            {t("app.title")}
          </Typography>
          <IconButton
            aria-label={t("navigation.openMenu")}
            onClick={() => setDrawerOpen(true)}
            sx={{ color: "rgba(255,255,255,0.8)", p: 0.75 }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {DrawerContent}
      </Drawer>

      {/* Mobile Bottom Tab Bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          top: "auto",
          bottom: 0,
          borderRadius: 0,
          background: colors.backgroundPaper,
          borderTop: `1px solid ${colors.dataBorder}`,
          display: { xs: "flex", lg: "none" },
        }}
      >
        <Tabs
          value={
            mobileTabRoutes.some((r) => r.key === activeTab) ? activeTab : false
          }
          onChange={handleMobileTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 56,
            "& .MuiTab-root": {
              minHeight: 56,
              py: 1,
              px: 0,
              fontSize: "0.6875rem",
              fontWeight: 400,
              color: colors.textTertiary,
              textTransform: "none",
              letterSpacing: "0",
              "&.Mui-selected": {
                color: colors.primary,
                fontWeight: 500,
              },
            },
            "& .MuiTabs-indicator": {
              top: 0,
              bottom: "auto",
              height: 2,
              background: colors.primary,
            },
          }}
        >
          {mobileTabRoutes.map(({ key, icon: Icon }) => (
            <Tab
              key={key}
              icon={<Icon sx={{ fontSize: 22 }} />}
              label={t(`navigation.routes.${key}`)}
              value={key}
            />
          ))}
          <Tab
            icon={<MoreHoriz sx={{ fontSize: 22 }} />}
            label={t("navigation.more")}
            value="__more__"
            onClick={(e) => {
              e.preventDefault();
              setDrawerOpen(true);
            }}
          />
        </Tabs>
      </AppBar>
    </>
  );
};
