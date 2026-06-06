import {
  DOC_KIND_KEYS,
  type DocumentKind,
  type DocumentKindModule,
} from "./types";
import { writtenQuestion } from "./written-question";
import { writtenQuestionResponse } from "./written-question-response";
import { oralQuestion } from "./oral-question";
import { interpellation } from "./interpellation";
import { governmentProposal } from "./government-proposal";
import { legislativeInitiative } from "./legislative-initiative";
import { committeeReport } from "./committee-report";
import { expertStatement } from "./expert-statement";
import { parliamentAnswer } from "./parliament-answer";

/** The single registry of every document kind. Add a kind here once. */
export const DOCUMENT_KINDS: Record<DocumentKind, DocumentKindModule> = {
  kk: writtenQuestion,
  suullinen: oralQuestion,
  valikysymys: interpellation,
  vastaus: writtenQuestionResponse,
  he: governmentProposal,
  aloite: legislativeInitiative,
  mietinto: committeeReport,
  asiantuntija: expertStatement,
  "vastaus-edk": parliamentAnswer,
};

/** All kind modules in canonical display order. */
export const DOCUMENT_KIND_LIST: DocumentKindModule[] = DOC_KIND_KEYS.map(
  (k) => DOCUMENT_KINDS[k],
);
