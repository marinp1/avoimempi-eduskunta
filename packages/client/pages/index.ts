import {
  AccountBalance,
  Description,
  Event,
  Groups,
  Home,
  HowToVote,
  Insights,
  NewReleases,
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
    icon: Description,
    Component: React.lazy(() => import("./Documents")),
  },
  analytiikka: {
    title: "Analytiikka",
    icon: Insights,
    Component: React.lazy(() => import("./Insights")),
  },
  hallitukset: {
    title: "Hallitukset",
    icon: AccountBalance,
    Component: React.lazy(() => import("./Hallitukset")),
  },
  muutokset: {
    title: "Muutokset",
    icon: NewReleases,
    Component: React.lazy(() => import("./Changes")),
  },
} as const satisfies Record<
  string,
  {
    title: string;
    icon: OverridableComponent<SvgIconTypeMap<Record<string, never>, "svg">>;
    Component: LazyExoticComponent<() => ReactNode>;
  }
>;

export type RouteName = keyof typeof routes;
