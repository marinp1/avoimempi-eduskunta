import { apiFetch } from "#client/utils/fetch";

export const fetchPersonDetails = async (
  personId: number,
  signal?: AbortSignal,
) => {
  const jsonOrThrow = async <T>(
    responsePromise: Promise<{
      ok: boolean;
      status: number;
      json: () => Promise<T>;
    }>,
  ): Promise<T> => {
    const response = await responsePromise;
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  };

  const [
    groupMemberships,
    terms,
    representativeDetails,
    districts,
    leavingRecords,
    trustPositions,
    governmentMemberships,
  ] = await Promise.all([
    jsonOrThrow(
      apiFetch(`/api/person/${personId}/group-memberships`, { signal }),
    ),
    jsonOrThrow(apiFetch(`/api/person/${personId}/terms`, { signal })),
    jsonOrThrow(apiFetch(`/api/person/${personId}/details`, { signal })),
    jsonOrThrow(apiFetch(`/api/person/${personId}/districts`, { signal })),
    jsonOrThrow(
      apiFetch(`/api/person/${personId}/leaving-records`, { signal }),
    ),
    jsonOrThrow(
      apiFetch(`/api/person/${personId}/trust-positions`, { signal }),
    ),
    jsonOrThrow(
      apiFetch(`/api/person/${personId}/government-memberships`, { signal }),
    ),
  ]);
  return {
    groupMemberships,
    terms,
    representativeDetails,
    districts,
    leavingRecords,
    trustPositions,
    governmentMemberships,
  };
};

export type PersonDetailsBundle = Awaited<
  ReturnType<typeof fetchPersonDetails>
>;
