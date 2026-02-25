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
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHallituskausi } from "./filters/HallituskausiContext";
import { type RouteName, routes } from "./pages";
import { colors, transitions as motion, spacing } from "./theme";
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
const MOBILE_MORE_TAB_VALUE = "__more__";
const headerGradient =
  "linear-gradient(120deg, #13213E 0%, #1B2A4A 58%, #28426E 100%)";

export const Navigation: React.FC<{
  activeTab: string;
  setActiveTab: (tab: RouteName) => void;
}> = ({ activeTab, setActiveTab }) => {
  const { t } = useTranslation();
  const {
    hallituskaudet,
    selectedHallituskausiId,
    setSelectedHallituskausiId,
    loading,
  } = useHallituskausi();
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
    newValue: RouteName | typeof MOBILE_MORE_TAB_VALUE,
  ) => {
    if (newValue === MOBILE_MORE_TAB_VALUE) {
      setDrawerOpen(true);
      return;
    }
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

  const allLabel = t("app.hallituskausi.all");

  const DrawerContent = (
    <Box
      sx={{ width: 280, background: colors.backgroundPaper }}
      role="presentation"
    >
      <Box
        sx={{
          p: 2.5,
          background: headerGradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 6px 18px rgba(15, 27, 51, 0.2)",
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
          sx={{
            color: "rgba(255,255,255,0.75)",
            transition: `background-color ${motion.fast}ms ${motion.easing.standard}`,
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.12)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.dataBorder}` }}>
        <FormControl size="small" fullWidth>
          <InputLabel id="drawer-hallituskausi-label">
            {t("app.hallituskausi.label")}
          </InputLabel>
          <Select
            labelId="drawer-hallituskausi-label"
            value={selectedHallituskausiId}
            label={t("app.hallituskausi.label")}
            onChange={(event) => setSelectedHallituskausiId(event.target.value)}
            disabled={loading}
          >
            <MenuItem value="">{allLabel}</MenuItem>
            {hallituskaudet.map((row) => (
              <MenuItem key={row.id} value={row.id}>
                {row.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
                  transition: `background-color ${motion.fast}ms ${motion.easing.standard}, transform ${motion.fast}ms ${motion.easing.standard}, border-color ${motion.fast}ms ${motion.easing.standard}`,
                  "&:hover": {
                    bgcolor: `${colors.primary}08`,
                    transform: "translateX(2px)",
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
          background: headerGradient,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 20px rgba(15, 27, 51, 0.24)",
          backdropFilter: "saturate(130%) blur(8px)",
          display: { xs: "none", lg: "flex" },
        }}
      >
        <Toolbar
          sx={{
            py: 0,
            px: { sm: spacing.lg },
            minHeight: { sm: 56 },
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              flexShrink: 1,
              minWidth: 0,
              maxWidth: { lg: 240, xl: 320 },
              mr: { lg: spacing.sm, xl: spacing.lg },
            }}
          >
            <Typography
              variant="h6"
              component="h1"
              sx={{
                color: "white",
                fontWeight: 600,
                fontSize: "1.0625rem",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t("app.title")}
            </Typography>
          </Box>

          <Box
            sx={{
              flexGrow: 1,
              minWidth: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={handleDesktopTabChange}
              sx={{
                maxWidth: "100%",
                minHeight: 56,
                "& .MuiTab-root": {
                  position: "relative",
                  fontWeight: 400,
                  fontSize: "0.8125rem",
                  py: 0,
                  px: { lg: 1.2, xl: 2 },
                  minHeight: 56,
                  transition: `color ${motion.fast}ms ${motion.easing.standard}, background-color ${motion.fast}ms ${motion.easing.standard}, transform ${motion.fast}ms ${motion.easing.standard}`,
                  color: "rgba(255,255,255,0.7)",
                  textTransform: "none",
                  letterSpacing: "0",
                  "&:hover": {
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    transform: "translateY(-1px)",
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
                  transition: `left ${motion.normal}ms ${motion.easing.emphasized}, width ${motion.normal}ms ${motion.easing.emphasized}`,
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

          <Box
            sx={{
              flexShrink: 0,
              width: { lg: 240, xl: 300 },
              minWidth: { lg: 220, xl: 260 },
            }}
          >
            <FormControl
              size="small"
              fullWidth
              sx={{
                "& .MuiInputLabel-root": {
                  color: "rgba(255,255,255,0.75)",
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "white",
                },
                "& .MuiInputLabel-root.MuiInputLabel-shrink": {
                  color: "rgba(255,255,255,0.9)",
                },
              }}
            >
              <InputLabel id="header-hallituskausi-label" shrink>
                {t("app.hallituskausi.label")}
              </InputLabel>
              <Select
                labelId="header-hallituskausi-label"
                value={selectedHallituskausiId}
                label={t("app.hallituskausi.label")}
                onChange={(event) =>
                  setSelectedHallituskausiId(event.target.value)
                }
                disabled={loading}
                displayEmpty
                renderValue={(value) =>
                  hallituskaudet.find((row) => row.id === value)?.label ||
                  allLabel
                }
                sx={{
                  color: "white",
                  ".MuiSelect-icon": { color: "white" },
                  transition: `background-color ${motion.fast}ms ${motion.easing.standard}`,
                  "& .MuiSelect-select": {
                    color: "white",
                  },
                  ".MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.35)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255,255,255,0.65)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "white",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.08)",
                  },
                }}
              >
                <MenuItem value="">{allLabel}</MenuItem>
                {hallituskaudet.map((row) => (
                  <MenuItem key={row.id} value={row.id}>
                    {row.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Top Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderRadius: 0,
          background: headerGradient,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 6px 14px rgba(15, 27, 51, 0.24)",
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
            sx={{
              color: "rgba(255,255,255,0.8)",
              p: 0.75,
              transition: `background-color ${motion.fast}ms ${motion.easing.standard}, transform ${motion.fast}ms ${motion.easing.standard}`,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.12)",
                transform: "translateY(-1px)",
              },
            }}
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
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            borderLeft: `1px solid ${colors.dataBorder}`,
            boxShadow: "0 12px 30px rgba(15, 27, 51, 0.2)",
          },
        }}
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
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "saturate(160%) blur(12px)",
          borderTop: `1px solid ${colors.dataBorder}`,
          boxShadow: "0 -8px 16px rgba(15, 27, 51, 0.08)",
          display: { xs: "flex", lg: "none" },
        }}
      >
        <Tabs
          value={
            mobileTabRoutes.some((r) => r.key === activeTab)
              ? activeTab
              : MOBILE_MORE_TAB_VALUE
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
              transition: `color ${motion.fast}ms ${motion.easing.standard}, transform ${motion.fast}ms ${motion.easing.standard}`,
              "& .MuiTab-iconWrapper": {
                marginBottom: 0.35,
                transition: `transform ${motion.fast}ms ${motion.easing.standard}`,
              },
              "&.Mui-selected": {
                color: colors.primary,
                fontWeight: 500,
                transform: "translateY(-1px)",
              },
              "&.Mui-selected .MuiTab-iconWrapper": {
                transform: "translateY(-1px)",
              },
            },
            "& .MuiTabs-indicator": {
              top: 0,
              bottom: "auto",
              height: 2,
              background: colors.primary,
              transition: `left ${motion.normal}ms ${motion.easing.emphasized}, width ${motion.normal}ms ${motion.easing.emphasized}`,
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
            value={MOBILE_MORE_TAB_VALUE}
          />
        </Tabs>
      </AppBar>
    </>
  );
};
