import {
  AdminPanelSettings,
  Assessment,
  Article,
  Event,
  Groups,
  Home,
  HowToVote,
  Insights,
  People,
} from "@mui/icons-material";
import type { SvgIconTypeMap } from "@mui/material";
import type { OverridableComponent } from "@mui/material/OverridableComponent";
import React, { type LazyExoticComponent, type ReactNode } from "react";

export const routes = {
  "": {
    title: "Etusivu",
    icon: Home,
    Component: React.lazy(() => import("./Home")),
  },
  edustajat: {
    title: "Edustajat",
    icon: People,
    Component: React.lazy(() => import("./Composition")),
  },
  puolueet: {
    title: "Puolueet",
    icon: Groups,
    Component: React.lazy(() => import("./Parties")),
  },
  istunnot: {
    title: "Istunnot",
    icon: Event,
    Component: React.lazy(() => import("./Sessions")),
  },
  aanestykset: {
    title: "Aanestykset",
    icon: HowToVote,
    Component: React.lazy(() => import("./Votings")),
  },
  asiakirjat: {
    title: "Asiakirjat",
    icon: Article,
    Component: React.lazy(() => import("./Documents")),
  },
  analytiikka: {
    title: "Analytiikka",
    icon: Insights,
    Component: React.lazy(() => import("./Insights")),
  },
  tila: {
    title: "Tila",
    icon: Assessment,
    Component: React.lazy(() => import("./Status")),
  },
  admin: {
    title: "Yllapito",
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
