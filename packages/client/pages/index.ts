import {
  AdminPanelSettings,
  Event,
  HowToVote,
  Insights,
  People,
  Assessment,
} from "@mui/icons-material";
import type { SvgIconTypeMap } from "@mui/material";
import type { OverridableComponent } from "@mui/material/OverridableComponent";
import React, { type LazyExoticComponent, type ReactNode } from "react";

export const routes = {
  sessions: {
    title: "Sessions", // Translated via navigation.routes.sessions
    icon: Event,
    Component: React.lazy(() => import("./Sessions")),
  },
  composition: {
    title: "Composition", // Translated via navigation.routes.composition
    icon: People,
    Component: React.lazy(() => import("./Composition")),
  },
  votings: {
    title: "Votings", // Translated via navigation.routes.votings
    icon: HowToVote,
    Component: React.lazy(() => import("./Votings")),
  },
  insights: {
    title: "Insights", // Translated via navigation.routes.insights
    icon: Insights,
    Component: React.lazy(() => import("./Insights")),
  },
  status: {
    title: "Status", // Translated via navigation.routes.status
    icon: Assessment,
    Component: React.lazy(() => import("./Status")),
  },
  admin: {
    title: "Admin", // Translated via navigation.routes.admin
    icon: AdminPanelSettings,
    Component: React.lazy(() => import("./Admin")),
  },
} satisfies Record<
  string,
  {
    title: string;
    icon: OverridableComponent<SvgIconTypeMap<Record<string, never>, "svg">>;
    Component: LazyExoticComponent<() => ReactNode>;
  }
>;

export type RouteName = keyof typeof routes;
