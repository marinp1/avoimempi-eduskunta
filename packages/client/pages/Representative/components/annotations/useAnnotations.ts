import React from "react";
import { apiFetch } from "#client/utils/fetch";
import type { Annotation } from "./types";

/**
 * Fetches annotations for a person, optionally filtered by kind. Until the
 * EntityAnnotation table is migrated this always resolves to `[]` — the
 * consuming components render nothing on empty arrays.
 *
 * The server endpoint also accepts a `kind` query param, but apiFetch is
 * typed against route literals so we keep the URL bare and filter client-side.
 */
export const useAnnotations = (
  personId: number,
  kind?: string,
): Annotation[] | null => {
  const [data, setData] = React.useState<Annotation[] | null>(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    apiFetch(`/api/person/${personId}/annotations`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Annotation[]) => {
        if (ctrl.signal.aborted) return;
        const filtered = kind ? rows.filter((row) => row.kind === kind) : rows;
        setData(filtered);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setData([]);
      });
    return () => ctrl.abort();
  }, [personId, kind]);

  return data;
};
