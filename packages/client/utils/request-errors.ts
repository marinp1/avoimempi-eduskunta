import { sanityChecksEnabled } from "#client/dev-constraints";

export const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  error.name === "AbortError";

export const warnInDevelopment = (message: string, error: unknown) => {
  if (!sanityChecksEnabled || isAbortError(error)) return;
  console.warn(message, error);
};
