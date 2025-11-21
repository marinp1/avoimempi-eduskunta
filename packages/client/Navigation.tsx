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
import { type RouteName, routes } from "./pages";
import theme, { gradients, spacing } from "./theme";
import { applicationMode } from "./utils";

export const Navigation: React.FC<{
  activeTab: string;
  setActiveTab: (tab: RouteName) => void;
}> = ({ activeTab, setActiveTab }) => {
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

  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      <List>
        {Object.entries(routes).map(([path, { icon: Icon, title }]) => {
          if (
            applicationMode === "production" &&
            (path as RouteName) === "admin"
          ) {
            return null;
          }
          return (
            <ListItem key={path} disablePadding>
              <ListItemButton
                onClick={() => setActiveTab(path as RouteName)}
                sx={{
                  color:
                    activeTab === path
                      ? theme.palette.primary.light
                      : "inherit",
                }}
              >
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={title} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        borderRadius: 0,
        background: gradients.primary,
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

        <Box
          sx={{
            justifyContent: "end",
            flexGrow: 1,
            display: { xs: "flex", lg: "none" },
          }}
        >
          <IconButton aria-label="menu" onClick={toggleDrawer(true)}>
            <MenuIcon></MenuIcon>
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
            {Object.entries(routes).map(([key, { icon: Icon, title }]) => {
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
