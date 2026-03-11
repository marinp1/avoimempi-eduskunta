import {
  Close as CloseIcon,
  Event,
  Home,
  HowToVote,
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
  Popover,
  Select,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import type React from "react";
import { useState } from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { useHallituskausi } from "./filters/HallituskausiContext";
import { type RouteName, routes } from "./pages";
import { colors, transitions as motion, spacing } from "./theme";

/** Primary routes shown as tabs in the desktop navigation */
const desktopPrimaryRoutes: RouteName[] = [
  "",
  "edustajat",
  "puolueet",
  "istunnot",
  "aanestykset",
  "asiakirjat",
  "analytiikka",
];

/** Secondary routes shown in the "More" popover on desktop */
const desktopSecondaryRoutes: RouteName[] = [
  "hallitukset",
  "laadunvalvonta",
  "muutokset",
];

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
  const { t: tApp } = useScopedTranslation("app");
  const { t: tNavigation } = useScopedTranslation("navigation");
  const {
    hallituskaudet,
    selectedHallituskausiId,
    setSelectedHallituskausiId,
    loading,
  } = useHallituskausi();

  const appTitle = tApp("title") as string;
  const titleDotFi = appTitle.endsWith(".fi");
  const titleBase = titleDotFi ? appTitle.slice(0, -3) : appTitle;
  const titleSuffix = titleDotFi ? ".fi" : null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
  const moreOpen = Boolean(moreAnchorEl);

  const isSecondaryActive = desktopSecondaryRoutes.includes(
    activeTab as RouteName,
  );

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

  const allDrawerRoutes = Object.keys(routes) as RouteName[];

  const allLabel = tApp("hallituskausi.all");

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
            {titleBase}
            {titleSuffix && (
              <Box
                component="span"
                sx={{ opacity: 0.5, fontWeight: 400, fontSize: "0.88em" }}
              >
                {titleSuffix}
              </Box>
            )}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255,255,255,0.7)",
              display: "block",
              mt: 0.25,
            }}
          >
            {tApp("subtitle")}
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
            {tApp("hallituskausi.label")}
          </InputLabel>
          <Select
            labelId="drawer-hallituskausi-label"
            value={selectedHallituskausiId}
            label={tApp("hallituskausi.label")}
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
                  primary={tNavigation(`routes.${path}`)}
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
              {titleBase}
              {titleSuffix && (
                <Box
                  component="span"
                  sx={{ opacity: 0.5, fontWeight: 400, fontSize: "0.88em" }}
                >
                  {titleSuffix}
                </Box>
              )}
            </Typography>
          </Box>

          <Box
            sx={{
              flexGrow: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
            }}
          >
            <Tabs
              value={isSecondaryActive ? false : activeTab}
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
              {desktopPrimaryRoutes.map((key) => (
                <Tab
                  key={key}
                  label={tNavigation(`routes.${key}`)}
                  value={key}
                />
              ))}
            </Tabs>

            {/* "More" button for secondary desktop routes */}
            <IconButton
              onClick={(e) => setMoreAnchorEl(e.currentTarget)}
              aria-label={tNavigation("more")}
              aria-haspopup="true"
              aria-expanded={moreOpen}
              size="small"
              sx={{
                color: isSecondaryActive ? "white" : "rgba(255,255,255,0.7)",
                bgcolor: isSecondaryActive
                  ? "rgba(255,255,255,0.14)"
                  : "transparent",
                borderRadius: 1,
                transition: `background-color ${motion.fast}ms ${motion.easing.standard}, color ${motion.fast}ms ${motion.easing.standard}`,
                "&:hover": {
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.12)",
                },
              }}
            >
              <MoreHoriz fontSize="small" />
            </IconButton>

            <Popover
              open={moreOpen}
              anchorEl={moreAnchorEl}
              onClose={() => setMoreAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
              transformOrigin={{ vertical: "top", horizontal: "center" }}
              PaperProps={{
                sx: {
                  mt: 0.5,
                  minWidth: 180,
                  border: `1px solid ${colors.dataBorder}`,
                  boxShadow: "0 8px 24px rgba(15,27,51,0.16)",
                },
              }}
            >
              <List dense disablePadding sx={{ py: 0.5 }}>
                {desktopSecondaryRoutes.map((key) => {
                  const route = routes[key];
                  const Icon = route.icon;
                  const isActive = activeTab === key;
                  return (
                    <ListItem key={key} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          navigate(key);
                          setMoreAnchorEl(null);
                        }}
                        sx={{
                          py: 1,
                          px: 2,
                          color: isActive ? colors.primary : colors.textPrimary,
                          bgcolor: isActive
                            ? `${colors.primary}08`
                            : "transparent",
                          "&:hover": { bgcolor: `${colors.primary}08` },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isActive
                              ? colors.primary
                              : colors.textSecondary,
                            minWidth: 32,
                          }}
                        >
                          <Icon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={tNavigation(`routes.${key}`)}
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
            </Popover>
          </Box>

          <Box sx={{ flexShrink: 0 }}>
            <Select
              value={selectedHallituskausiId}
              onChange={(event) =>
                setSelectedHallituskausiId(event.target.value)
              }
              disabled={loading}
              displayEmpty
              size="small"
              renderValue={(value) =>
                hallituskaudet.find((row) => row.id === value)?.label ||
                allLabel
              }
              sx={{
                fontSize: "0.8125rem",
                color: "white",
                ".MuiSelect-icon": { color: "rgba(255,255,255,0.7)" },
                "& .MuiSelect-select": {
                  color: "white",
                  py: "6px",
                  px: "14px",
                },
                ".MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.25)",
                  borderRadius: "20px",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.55)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.75)",
                  borderWidth: "1px",
                },
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderRadius: "20px",
                },
                transition: `background-color ${motion.fast}ms ${motion.easing.standard}`,
              }}
            >
              <MenuItem value="">{allLabel}</MenuItem>
              {hallituskaudet.map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.label}
                </MenuItem>
              ))}
            </Select>
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
            py: 0.75,
            px: 2,
            minHeight: 48,
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
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
              lineHeight: 1.3,
            }}
          >
            {titleBase}
            {titleSuffix && (
              <Box
                component="span"
                sx={{ opacity: 0.5, fontWeight: 400, fontSize: "0.88em" }}
              >
                {titleSuffix}
              </Box>
            )}
          </Typography>
          {activeTab !== "" && (
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.65)", lineHeight: 1, mt: 0.2 }}
            >
              {tNavigation(`routes.${activeTab as RouteName}`)}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            borderRight: `1px solid ${colors.dataBorder}`,
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
            width: "100%",
            overflow: "hidden",
            "& .MuiTab-root": {
              minWidth: 0,
              maxWidth: "none",
              flex: "1 1 0",
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
              label={tNavigation(`routes.${key}`)}
              value={key}
            />
          ))}
          <Tab
            icon={<MoreHoriz sx={{ fontSize: 22 }} />}
            label={tNavigation("more")}
            value={MOBILE_MORE_TAB_VALUE}
            onClick={() => setDrawerOpen(true)}
          />
        </Tabs>
      </AppBar>
    </>
  );
};
