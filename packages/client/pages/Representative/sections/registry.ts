import type React from "react";
import type { RepresentativeAnalysisScope } from "../../Composition/Details";
import type { PersonDetailsBundle as PersonDetailsBundleImport } from "../utils/fetchPersonDetails";
import AiSummary from "./AiSummary";
import Activity from "./Activity";
import Background from "./Background";
import Bills from "./Bills";
import Committees from "./Committees";
import Interpellations from "./Interpellations";
import Painopisteet from "./Painopisteet";
import SanatVsTeot from "./SanatVsTeot";
import Sidonnaisuudet from "./Sidonnaisuudet";
import Speeches from "./Speeches";
import Vaalikone from "./Vaalikone";
import Voting from "./Voting";

export type PersonDetailsBundle = PersonDetailsBundleImport;

export interface ProfileSectionProps {
  personId: number;
  details?: PersonDetailsBundle;
  selectedDate: string;
  scope: RepresentativeAnalysisScope;
}

export interface PersonCapabilities {
  hasVaalikone: boolean;
  hasAiSummary: boolean;
  hasSentiment: boolean;
  hasTopicTags: boolean;
  hasElectionContext: boolean;
}

export interface ProfileSection {
  key: string;
  /** URL hash anchor (without `#`). */
  anchor: string;
  /** Plain Finnish label for the rail nav. */
  label: string;
  /**
   * Core sections always render even when empty (the empty body is the
   * point — never hide damning absences). Optional sections may hide via
   * `isAvailable`.
   */
  variant: "core" | "optional";
  Component: React.FC<ProfileSectionProps>;
  /**
   * Optional sections only: returns whether the section has any data for the
   * given person. Until the underlying data sources are ingested all optional
   * sections return `false` and stay hidden.
   */
  isAvailable?: (capabilities: PersonCapabilities | null) => boolean;
}

export const profileSections: ProfileSection[] = [
  {
    key: "painopisteet",
    anchor: "painopisteet",
    label: "Painopisteet",
    variant: "core",
    Component: Painopisteet,
  },
  {
    key: "sanat-vs-teot",
    anchor: "sanat-vs-teot",
    label: "Sanat vs. teot",
    variant: "core",
    Component: SanatVsTeot,
  },
  {
    key: "vaalikone",
    anchor: "vaalikone",
    label: "Vaalikone",
    variant: "optional",
    Component: Vaalikone,
    isAvailable: (caps) => caps?.hasVaalikone ?? false,
  },
  {
    key: "ai-summary",
    anchor: "ai-tiivistelma",
    label: "AI-tiivistelmä",
    variant: "optional",
    Component: AiSummary,
    isAvailable: (caps) => caps?.hasAiSummary ?? false,
  },
  {
    key: "voting",
    anchor: "aanestykset",
    label: "Äänestykset",
    variant: "core",
    Component: Voting,
  },
  {
    key: "speeches",
    anchor: "puheenvuorot",
    label: "Puheenvuorot",
    variant: "core",
    Component: Speeches,
  },
  {
    key: "bills",
    anchor: "aloitteet",
    label: "Aloitteet",
    variant: "core",
    Component: Bills,
  },
  {
    key: "interpellations",
    anchor: "valikysymykset",
    label: "Välikysymykset & kysymykset",
    variant: "core",
    Component: Interpellations,
  },
  {
    key: "committees",
    anchor: "valiokunnat",
    label: "Valiokunnat",
    variant: "core",
    Component: Committees,
  },
  {
    key: "sidonnaisuudet",
    anchor: "sidonnaisuudet",
    label: "Sidonnaisuudet",
    variant: "core",
    Component: Sidonnaisuudet,
  },
  {
    key: "activity",
    anchor: "aktiivisuus",
    label: "Aktiivisuus",
    variant: "core",
    Component: Activity,
  },
  {
    key: "background",
    anchor: "tausta",
    label: "Tausta",
    variant: "core",
    Component: Background,
  },
];

/**
 * Returns the sections that should actually render for a given person.
 * Core sections always pass; optional sections check their `isAvailable`.
 */
export const getVisibleSections = (
  capabilities: PersonCapabilities | null,
) =>
  profileSections.filter(
    (section) =>
      section.variant === "core" ||
      (section.isAvailable?.(capabilities) ?? false),
  );
