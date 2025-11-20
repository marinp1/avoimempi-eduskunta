import {
  AdminPanelSettings,
  CalendarToday,
  Event,
  HowToVote,
  Insights,
  People,
} from "@mui/icons-material";
import type { SvgIconTypeMap } from "@mui/material";
import type { OverridableComponent } from "@mui/material/OverridableComponent";
import React, { type LazyExoticComponent, type ReactNode } from "react";

export const routes = {
  agenda: {
    title: "Agenda",
    icon: CalendarToday,
    Component: React.lazy(() => import("./Agenda")),
  },
  sessions: {
    title: "Sessions",
    icon: Event,
    Component: React.lazy(() => import("./Sessions")),
  },
  composition: {
    title: "Composition",
    icon: People,
    Component: React.lazy(() => import("./Composition")),
  },
  votings: {
    title: "Votings",
    icon: HowToVote,
    Component: React.lazy(() => import("./Votings")),
  },
  insights: {
    title: "Insights",
    icon: Insights,
    Component: React.lazy(() => import("./Insights")),
  },
  admin: {
    title: "Admin",
    icon: AdminPanelSettings,
    Component: React.lazy(() => import("./Admin")),
  },
} satisfies Record<
  string,
  {
    title: string;
    icon: OverridableComponent<SvgIconTypeMap<{}, "svg">>;
    Component: LazyExoticComponent<() => ReactNode>;
  }
>;

export type RouteName = keyof typeof routes;
