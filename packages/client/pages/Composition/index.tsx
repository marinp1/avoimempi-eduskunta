import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import { Alert, Box, Button, Chip, Skeleton, Stack } from "@mui/material";
import React from "react";
import {
  isDateWithinHallituskausi,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { commonStyles, spacing } from "#client/theme";
import { FilterBar, PageIntro } from "#client/theme/components";
import { apiFetch } from "#client/utils/fetch";
import { warnInDevelopment } from "#client/utils/request-errors";
import { AnalyticsSection } from "./components/AnalyticsSection";
import { CompositionDiffBanner } from "./components/CompositionDiffBanner";
import { GlobalPersonSearch } from "./components/GlobalPersonSearch";
import { MemberBrowser } from "./components/MemberBrowser";
import { PartyDetailPanel } from "./components/PartyDetailPanel";
import { PartyDistribution } from "./components/PartyDistribution";
import { TimelineSelector } from "./components/TimelineSelector";
import type { RepresentativeSelection } from "./Details";
import {
  buildCompositionUrl,
  buildPartySummaries,
  type CompositionBrowserView,
  type CompositionSortValue,
  calculateAgeAtDate,
  formatFinnishDate,
  type GenderFilterValue,
  type GovernmentFilterValue,
  getActivationDateForSearchResult,
  getMemberStartDate,
  type MemberWithExtras,
  type PersonLookupResult,
  toRepresentativeSelectionFromMember,
  toRepresentativeSelectionFromSearchResult,
} from "./helpers";

const LOOKUP_DEBOUNCE_MS = 250;

const readUrlState = () => {
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get("date");
  const personParam = params.get("person");
  const viewParam = params.get("view");

  return {
    date:
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
        ? dateParam
        : new Date().toISOString().split("T")[0],
    personId: personParam ? Number.parseInt(personParam, 10) : null,
    query: params.get("q") ?? "",
    view: viewParam === "table" ? "table" : "list",
  } as const;
};

const fetchRepresentativeSelection = async (
  personId: number,
  signal?: AbortSignal,
): Promise<RepresentativeSelection> => {
  const [detailsResponse, membershipsResponse] = await Promise.all([
    apiFetch(`/api/person/${personId}/details`, { signal }),
    apiFetch(`/api/person/${personId}/group-memberships`, { signal }),
  ]);
  if (!detailsResponse.ok || !membershipsResponse.ok) {
    throw new Error(
      `HTTP ${detailsResponse.ok ? membershipsResponse.status : detailsResponse.status}`,
    );
  }

  const details = await detailsResponse.json();
  const memberships = await membershipsResponse.json();
  const latestMembership = memberships.at(-1);

  return {
    personId,
    summary: {
      firstName: details?.first_name,
      lastName: details?.last_name,
      partyName: latestMembership?.group_name ?? null,
      isInGovernment: null,
    },
  };
};

export default () => {
  const { t } = useScopedTranslation("composition");
  const { hallituskaudet, selectedHallituskausi, setSelectedHallituskausiId } =
    useHallituskausi();

  const initialUrlState = React.useMemo(() => readUrlState(), []);
  const [members, setMembers] = React.useState<MemberWithExtras[]>([]);
  const [previousMembers, setPreviousMembers] = React.useState<
    MemberWithExtras[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [date, setDate] = React.useState(initialUrlState.date);
  const [selectedRepresentative, setSelectedRepresentative] =
    React.useState<RepresentativeSelection | null>(null);
  const [selectedPersonId, setSelectedPersonId] = React.useState<number | null>(
    initialUrlState.personId,
  );
  const [partyFilter, setPartyFilter] = React.useState<string | null>(null);
  const [govFilter, setGovFilter] =
    React.useState<GovernmentFilterValue>("all");
  const [genderFilter, setGenderFilter] =
    React.useState<GenderFilterValue>("all");
  const [districtFilter, setDistrictFilter] = React.useState<string | null>(
    null,
  );
  const [ageRange, setAgeRange] = React.useState<[number, number] | null>(null);
  const [compositionSearch, setCompositionSearch] = React.useState("");
  const [activeInsightDrawer, setActiveInsightDrawer] = React.useState<
    "attendance" | "speechActivity" | "timeSeries" | null
  >(null);
  const [sortBy, setSortBy] = React.useState<CompositionSortValue>("party");
  const [viewMode, setViewMode] = React.useState<CompositionBrowserView>(
    initialUrlState.view,
  );
  const [lookupQuery, setLookupQuery] = React.useState(initialUrlState.query);
  const [committedLookupQuery, setCommittedLookupQuery] = React.useState(
    initialUrlState.query.trim(),
  );
  const [lookupResults, setLookupResults] = React.useState<
    PersonLookupResult[]
  >([]);
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [lookupSelectionMessage, setLookupSelectionMessage] = React.useState<
    string | null
  >(null);

  const todayIso = new Date().toISOString().split("T")[0];
  const isToday = date === todayIso;

  const syncUrl = React.useCallback(
    (
      updates: {
        date?: string | null;
        person?: number | null;
        q?: string | null;
        view?: CompositionBrowserView | null;
      },
      mode: "push" | "replace" = "push",
    ) => {
      const nextUrl = buildCompositionUrl(
        window.location.pathname,
        window.location.search,
        {
          date: updates.date,
          person:
            updates.person === undefined
              ? undefined
              : updates.person === null
                ? null
                : String(updates.person),
          q: updates.q,
          view: updates.view,
        },
      );

      if (mode === "replace") {
        window.history.replaceState({}, "", nextUrl);
      } else {
        window.history.pushState({}, "", nextUrl);
      }
    },
    [],
  );

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCommittedLookupQuery(lookupQuery.trim());
    }, LOOKUP_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [lookupQuery]);

  React.useEffect(() => {
    syncUrl({ q: committedLookupQuery || null }, "replace");
  }, [committedLookupQuery, syncUrl]);

  React.useEffect(() => {
    syncUrl({ view: viewMode === "list" ? null : viewMode }, "replace");
  }, [viewMode, syncUrl]);

  React.useEffect(() => {
    const controller = new AbortController();
    const loadMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch(`/api/composition/${date}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (controller.signal.aborted) return;
        setMembers((prev) => {
          if (prev.length > 0) setPreviousMembers(prev);
          return data;
        });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        warnInDevelopment("Failed to fetch composition members", loadError);
        console.error(loadError);
        setError(t("loadError"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadMembers();
    return () => controller.abort();
  }, [date, t]);

  React.useEffect(() => {
    if (committedLookupQuery.length < 2) {
      setLookupResults([]);
      setLookupError(null);
      setLookupLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadResults = async () => {
      try {
        setLookupLoading(true);
        setLookupError(null);
        const response = await apiFetch(
          `/api/person/search?q=${encodeURIComponent(
            committedLookupQuery,
          )}&date=${date}&limit=18`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!controller.signal.aborted) {
          setLookupResults(data);
        }
      } catch (loadError) {
        if (controller.signal.aborted) return;
        warnInDevelopment(
          "Failed to fetch composition lookup results",
          loadError,
        );
        console.error(loadError);
        setLookupResults([]);
        setLookupError(t("globalSearch.loadError"));
      } finally {
        if (!controller.signal.aborted) setLookupLoading(false);
      }
    };

    loadResults();
    return () => controller.abort();
  }, [committedLookupQuery, date, t]);

  React.useEffect(() => {
    const handlePopState = () => {
      const next = readUrlState();
      setDate(next.date);
      setLookupQuery(next.query);
      setCommittedLookupQuery(next.query.trim());
      setSelectedPersonId(next.personId);

      setViewMode(next.view);
      if (next.personId === null) {
        setSelectedRepresentative(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  React.useEffect(() => {
    if (!selectedHallituskausi) return;
    if (isDateWithinHallituskausi(date, selectedHallituskausi)) return;
    const fallback =
      date < selectedHallituskausi.startDate
        ? selectedHallituskausi.startDate
        : selectedHallituskausi.endDate || selectedHallituskausi.startDate;
    setDate(fallback);
    syncUrl({ date: fallback }, "replace");
  }, [date, selectedHallituskausi, syncUrl]);

  React.useEffect(() => {
    if (!selectedPersonId) {
      setLookupSelectionMessage(null);
      return;
    }

    const controller = new AbortController();
    const currentMember = members.find(
      (member) => member.person_id === selectedPersonId,
    );
    if (currentMember) {
      setLookupSelectionMessage(null);
      setSelectedRepresentative(
        toRepresentativeSelectionFromMember(currentMember),
      );
      return;
    }

    const currentLookupMatch = lookupResults.find(
      (result) => result.person_id === selectedPersonId,
    );
    if (currentLookupMatch) {
      setLookupSelectionMessage(null);
      setSelectedRepresentative(
        toRepresentativeSelectionFromSearchResult(currentLookupMatch),
      );
      return;
    }

    fetchRepresentativeSelection(selectedPersonId, controller.signal)
      .then((selection) => {
        if (!controller.signal.aborted) {
          setSelectedRepresentative(selection);
          setLookupSelectionMessage(null);
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment(
          `Failed to fetch representative selection for ${selectedPersonId}`,
          err,
        );
        setSelectedRepresentative({ personId: selectedPersonId });
        setLookupSelectionMessage(t("globalSearch.selectionFallback"));
      });

    return () => controller.abort();
  }, [lookupResults, members, selectedPersonId, t]);

  const stats = React.useMemo(() => {
    const totalMembers = members.length;
    const governmentMembers = members.filter(
      (member) => member.is_in_government === 1,
    ).length;
    const oppositionMembers = totalMembers - governmentMembers;
    const partySummaries = buildPartySummaries(members);
    const womenCount = members.filter((member) =>
      member.gender.toLowerCase().startsWith("n"),
    ).length;
    const menCount = members.filter((member) =>
      member.gender.toLowerCase().startsWith("m"),
    ).length;

    const ages = members.map((m) => calculateAgeAtDate(m.birth_date, date));
    const minAge = ages.length > 0 ? Math.min(...ages) : 20;
    const maxAge = ages.length > 0 ? Math.max(...ages) : 80;

    const districts = [
      ...new Set(
        members
          .map((m) => m.district_name)
          .filter((d): d is string => d != null),
      ),
    ].sort((a, b) => a.localeCompare(b));

    return {
      totalMembers,
      governmentMembers,
      oppositionMembers,
      partyCount: partySummaries.length,
      largestParty: partySummaries[0] ?? null,
      womenCount,
      menCount,
      partySummaries,
      minAge,
      maxAge,
      districts,
    };
  }, [members, date]);

  const filteredMembers = React.useMemo(() => {
    const q = compositionSearch.trim().toLowerCase();
    const sorted = [...members].filter((member) => {
      if (
        q &&
        !`${member.first_name} ${member.last_name}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (partyFilter && member.party_name !== partyFilter) {
        return false;
      }
      if (govFilter === "government" && member.is_in_government !== 1) {
        return false;
      }
      if (govFilter === "opposition" && member.is_in_government === 1) {
        return false;
      }
      if (
        genderFilter === "female" &&
        !member.gender.toLowerCase().startsWith("n")
      ) {
        return false;
      }
      if (
        genderFilter === "male" &&
        !member.gender.toLowerCase().startsWith("m")
      ) {
        return false;
      }
      if (districtFilter && member.district_name !== districtFilter) {
        return false;
      }
      if (ageRange) {
        const age = calculateAgeAtDate(member.birth_date, date);
        if (age < ageRange[0] || age > ageRange[1]) {
          return false;
        }
      }
      return true;
    });

    sorted.sort((left, right) => {
      if (sortBy === "party") {
        return (
          (left.party_name ?? "").localeCompare(right.party_name ?? "") ||
          left.sort_name.localeCompare(right.sort_name)
        );
      }
      if (sortBy === "age") {
        return (
          calculateAgeAtDate(right.birth_date, date) -
            calculateAgeAtDate(left.birth_date, date) ||
          left.sort_name.localeCompare(right.sort_name)
        );
      }
      if (sortBy === "tenure") {
        return (
          getMemberStartDate(left).localeCompare(getMemberStartDate(right)) ||
          left.sort_name.localeCompare(right.sort_name)
        );
      }
      return left.sort_name.localeCompare(right.sort_name);
    });

    return sorted;
  }, [
    ageRange,
    compositionSearch,
    date,
    districtFilter,
    genderFilter,
    govFilter,
    members,
    partyFilter,
    sortBy,
  ]);

  React.useEffect(() => {
    if (!partyFilter) return;
    if (members.some((member) => member.party_name === partyFilter)) return;
    setPartyFilter(null);
  }, [members, partyFilter]);

  const openRepresentative = React.useCallback(
    (selection: RepresentativeSelection, _nextDate?: string) => {
      const href = `/edustaja/${selection.personId}`;
      window.history.pushState({}, "", href);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [],
  );

  const handleDateChange = React.useCallback(
    (nextDate: string) => {
      if (
        selectedHallituskausi &&
        !isDateWithinHallituskausi(nextDate, selectedHallituskausi)
      ) {
        const clamped =
          nextDate < selectedHallituskausi.startDate
            ? selectedHallituskausi.startDate
            : selectedHallituskausi.endDate || nextDate;
        setDate(clamped);
        syncUrl({ date: clamped });
        return;
      }
      setDate(nextDate);
      syncUrl({ date: nextDate });
    },
    [selectedHallituskausi, syncUrl],
  );

  const handleResetToPresent = React.useCallback(() => {
    setDate(todayIso);
    setSelectedHallituskausiId("");
    syncUrl({ date: todayIso });
  }, [setSelectedHallituskausiId, syncUrl, todayIso]);

  const handleLookupResultClick = React.useCallback(
    (result: PersonLookupResult) => {
      const activationDate = getActivationDateForSearchResult(result, date);
      const currentMemberAtActivationDate = members.find(
        (member) => member.person_id === result.person_id,
      );

      if (
        result.is_active_on_selected_date !== 1 &&
        result.latest_active_date &&
        result.latest_active_date !== date
      ) {
        setLookupSelectionMessage(
          t("globalSearch.adjustedDateHint", {
            value: formatFinnishDate(result.latest_active_date),
          }),
        );
      } else {
        setLookupSelectionMessage(null);
      }

      openRepresentative(
        currentMemberAtActivationDate
          ? toRepresentativeSelectionFromMember(currentMemberAtActivationDate)
          : toRepresentativeSelectionFromSearchResult(result),
        activationDate,
      );
    },
    [date, members, openRepresentative, t],
  );

  const handleMemberClick = React.useCallback(
    (member: MemberWithExtras) => {
      setLookupSelectionMessage(null);
      openRepresentative(toRepresentativeSelectionFromMember(member));
    },
    [openRepresentative],
  );

  return (
    <Box>
      <PageIntro
        title={t("title")}
        summary={
          selectedHallituskausi
            ? t("summaryGovernment", {
                period: selectedHallituskausi.name,
                value: formatFinnishDate(date),
              })
            : isToday
              ? t("summaryCurrent", { value: formatFinnishDate(date) })
              : t("summaryHistorical", { value: formatFinnishDate(date) })
        }
        mobileMode="compact"
        mobileAnchorId="composition-content"
        mobileStatsPlacement="hidden"
        mobileSummary={
          !loading && !error ? (
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={`${t("snapshot.totalMembers")}: ${stats.totalMembers}`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                label={`${t("snapshot.partyCount")}: ${stats.partyCount}`}
                sx={{ fontWeight: 700 }}
              />
            </Box>
          ) : undefined
        }
        utility={
          <Button
            variant="outlined"
            size="small"
            onClick={handleResetToPresent}
            sx={{
              ...commonStyles.compactOutlinedPrimaryButton,
              alignSelf: { xs: "stretch", md: "flex-start" },
            }}
          >
            {t("returnToPresent")}
          </Button>
        }
        chips={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={t("details.analysis.selectedDate", {
                value: formatFinnishDate(date),
              })}
              sx={{ fontWeight: 600 }}
            />
            {selectedHallituskausi ? (
              <Chip
                size="small"
                icon={<AccountBalanceIcon sx={{ fontSize: 14 }} />}
                label={selectedHallituskausi.name}
                sx={{ fontWeight: 600 }}
              />
            ) : null}
            {!selectedHallituskausi ? (
              <Chip
                size="small"
                icon={
                  isToday ? (
                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <HistoryEduIcon sx={{ fontSize: 14 }} />
                  )
                }
                label={isToday ? t("context.current") : t("historicalView")}
                sx={{ fontWeight: 600 }}
              />
            ) : null}
          </Stack>
        }
      />

      <Box id="composition-content">
        <FilterBar sx={{ mb: spacing.md }}>
          <TimelineSelector
            hallituskaudet={hallituskaudet}
            selectedHallituskausi={selectedHallituskausi}
            date={date}
            todayIso={todayIso}
            onDateChange={handleDateChange}
          />
        </FilterBar>
      </Box>

      <GlobalPersonSearch
        lookupQuery={lookupQuery}
        setLookupQuery={setLookupQuery}
        lookupLoading={lookupLoading}
        lookupError={lookupError}
        lookupSelectionMessage={lookupSelectionMessage}
        lookupResults={lookupResults}
        committedLookupQuery={committedLookupQuery}
        selectedRepresentative={selectedRepresentative}
        onResultClick={handleLookupResultClick}
      />

      {loading ? (
        <Box sx={{ mb: spacing.md }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                xl: "repeat(5, 1fr)",
              },
              gap: 2,
            }}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rounded"
                height={112}
                animation="wave"
              />
            ))}
          </Box>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: spacing.md }}>
          {error}
        </Alert>
      ) : (
        <>
          {previousMembers.length > 0 && (
            <CompositionDiffBanner
              previousMembers={previousMembers}
              currentMembers={members}
            />
          )}

          <PartyDistribution
            stats={stats}
            partyFilter={partyFilter}
            setPartyFilter={setPartyFilter}
          />

          {partyFilter &&
            (() => {
              const selectedPartySummary = stats.partySummaries.find(
                (p) => p.partyName === partyFilter,
              );
              const partyCode = members.find(
                (m) => m.party_name === partyFilter,
              )?.party_code;
              return selectedPartySummary && partyCode ? (
                <PartyDetailPanel
                  partyCode={partyCode}
                  partyName={partyFilter}
                  partySummary={selectedPartySummary}
                  date={date}
                />
              ) : null;
            })()}

          <MemberBrowser
            filteredMembers={filteredMembers}
            totalMembers={members.length}
            compositionSearch={compositionSearch}
            setCompositionSearch={setCompositionSearch}
            sortBy={sortBy}
            setSortBy={setSortBy}
            govFilter={govFilter}
            setGovFilter={setGovFilter}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            districtFilter={districtFilter}
            setDistrictFilter={setDistrictFilter}
            districts={stats.districts}
            ageRange={ageRange}
            setAgeRange={setAgeRange}
            ageMin={stats.minAge}
            ageMax={stats.maxAge}
            partyFilter={partyFilter}
            setPartyFilter={setPartyFilter}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onMemberClick={handleMemberClick}
            selectedRepresentative={selectedRepresentative}
            date={date}
          />
        </>
      )}

      <AnalyticsSection
        activeInsightDrawer={activeInsightDrawer}
        setActiveInsightDrawer={setActiveInsightDrawer}
      />
    </Box>
  );
};
