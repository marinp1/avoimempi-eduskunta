import { Box, Stack } from "@mui/material";
import React from "react";
import { Hero } from "./Hero";
import { LazySection } from "./components/LazySection";
import {
  getVisibleSections,
  type PersonCapabilities,
} from "./sections/registry";
import {
  fetchPersonDetails,
  type PersonDetailsBundle,
} from "./utils/fetchPersonDetails";
import { StickyRail } from "./StickyRail";

interface RepresentativeProps {
  personId: number;
}

interface ElectionContextResponse {
  election: { year: number; date: string; type: string } | null;
  candidacy: {
    district_id?: number;
    district_name?: string;
    list_number?: number | null;
  } | null;
}

const Representative: React.FC<RepresentativeProps> = ({ personId }) => {
  const [details, setDetails] = React.useState<PersonDetailsBundle | null>(
    null,
  );
  const selectedDate = React.useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );
  const scope = React.useMemo(
    () => ({
      selectedGovernmentName: null,
      selectedGovernmentPeriod: null,
    }),
    [],
  );
  const [electionContext, setElectionContext] =
    React.useState<ElectionContextResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeAnchor, setActiveAnchor] = React.useState<string | null>(null);

  const [capabilities, setCapabilities] =
    React.useState<PersonCapabilities | null>(null);
  const sections = React.useMemo(
    () => getVisibleSections(capabilities),
    [capabilities],
  );

  // Parallel data fetch on mount.
  React.useEffect(() => {
    if (!Number.isFinite(personId) || personId <= 0) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);

    Promise.allSettled([
      fetchPersonDetails(personId, signal)
        .then((data) => {
          if (!signal.aborted) setDetails(data);
        })
        .catch(() => {}),
      fetch(`/api/person/${personId}/election-context`, { signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setElectionContext(data as ElectionContextResponse | null)),
      fetch(`/api/person/${personId}/capabilities`, { signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!signal.aborted && data) {
            setCapabilities(data as PersonCapabilities);
          }
        })
        .catch(() => {}),
    ]).finally(() => {
      if (!signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [personId]);

  // Sync active anchor as the reader scrolls.
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.target as HTMLElement).offsetTop -
              (b.target as HTMLElement).offsetTop,
          );
        if (visible[0]) {
          setActiveAnchor(visible[0].target.id);
        }
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    for (const section of sections) {
      const el = document.getElementById(section.anchor);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  // Land on the anchor referenced in the URL hash on initial mount.
  React.useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      // Defer until skeletons are in the tree.
      const handle = window.setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
      }, 50);
      return () => window.clearTimeout(handle);
    }
  }, []);

  const repDetails = details?.representativeDetails ?? null;
  const latestParty = details?.groupMemberships?.at(-1)?.group_name ?? null;
  const heroDetails = repDetails
    ? {
        person_id: repDetails.person_id,
        first_name: repDetails.first_name,
        last_name: repDetails.last_name,
        party: latestParty,
      }
    : null;
  const fullName =
    repDetails && (repDetails.first_name || repDetails.last_name)
      ? `${repDetails.first_name ?? ""} ${repDetails.last_name ?? ""}`.trim()
      : `Edustaja #${personId}`;

  return (
    <Box>
      <Hero
        details={heroDetails}
        electionContext={electionContext}
        loading={loading}
      />
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={{ xs: 0, lg: 3 }}
        alignItems="flex-start"
        sx={{ mt: 0 }}
      >
        <StickyRail
          personId={personId}
          fullName={fullName}
          party={latestParty}
          sections={sections}
          activeAnchor={activeAnchor}
        />
        <Box sx={{ flex: 1, minWidth: 0, width: "100%", px: { xs: 1.5, lg: 0 } }}>
          {sections.map((section) => (
            <LazySection key={section.key} anchor={section.anchor}>
              <section.Component
                personId={personId}
                details={details ?? undefined}
                selectedDate={selectedDate}
                scope={scope}
              />
            </LazySection>
          ))}
        </Box>
      </Stack>
    </Box>
  );
};

export default Representative;
