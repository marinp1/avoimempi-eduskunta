import { refs } from "../../../references";

const PrefixMap: Record<string, string> = {
  HE: "government-proposals",
  VK: "interpellations",
  KK: "written-questions",
  KKV: "written-questions",
  LA: "legislative-initiatives-law",
  TAA: "legislative-initiatives-budget",
  LTA: "legislative-initiatives-supplementary-budget",
  TPA: "legislative-initiatives-action",
  KA: "legislative-initiatives-discussion",
  KAA: "legislative-initiatives-citizens",
  MIE: "committee-reports",
  MIL: "committee-reports",
  EV: "parliament-answers",
};

export const inferDocumentType = (identifier: string | null): string | null => {
  if (!identifier) return null;
  const prefix = identifier.trim().split(/\s+/)[0]?.toUpperCase();
  if (!prefix) return null;
  return PrefixMap[prefix] ?? null;
};

/**
 * SPA navigation to the Documents page with the type + identifier query
 * applied. Uses the same `pushState` + `popstate` pattern the rest of the
 * client uses for in-page navigation.
 */
export const navigateToDocument = (identifier: string | null) => {
  const type = inferDocumentType(identifier);
  if (!type || !identifier) return false;
  const href = refs.documents(type, identifier);
  window.history.pushState({}, "", href);
  window.dispatchEvent(new PopStateEvent("popstate"));
  return true;
};
