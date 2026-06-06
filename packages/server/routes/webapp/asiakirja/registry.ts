import type { AsiakirjaViewModel } from "#webapp/templates/pages/asiakirja";
import type { WebappDeps } from "../deps";
import type { DocumentKind } from "#shared/constants/DocumentKinds";
import { buildWrittenQuestion } from "./written-question";
import { buildOralQuestion } from "./oral-question";
import { buildInterpellation } from "./interpellation";
import { buildGovernmentProposal } from "./government-proposal";
import { buildLegislativeInitiative } from "./legislative-initiative";
import { buildCommitteeReport } from "./committee-report";
import { buildParliamentAnswer } from "./parliament-answer";

export type BuilderFn = (
  id: string,
  deps: WebappDeps,
) => AsiakirjaViewModel | null;

export const KIND_BUILDERS: Record<DocumentKind, BuilderFn | undefined> = {
  kk: buildWrittenQuestion,
  suullinen: buildOralQuestion,
  valikysymys: buildInterpellation,
  he: buildGovernmentProposal,
  aloite: buildLegislativeInitiative,
  mietinto: buildCommitteeReport,
  vastaus: buildWrittenQuestion,
  asiantuntija: undefined,
  "vastaus-edk": buildParliamentAnswer,
};
