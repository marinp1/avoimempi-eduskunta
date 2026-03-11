import EventIcon from "@mui/icons-material/Event";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import MicIcon from "@mui/icons-material/Mic";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { SessionSectionPanel } from "#client/pages/Sessions/components/SessionSectionPanel";
import type {
  SectionDocumentLink,
  SectionRollCallData,
  SpeechData,
  SubSection,
  Voting,
  VotingInlineDetails,
} from "#client/pages/Sessions/shared/types";
import {
  getSectionOrderLabel,
  isRollCallSection,
} from "#client/pages/Sessions/shared/utils";
import { colors, commonStyles, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";
import { formatDateLongFi } from "#client/utils/date-time";
import { HomeSectionDetails } from "./HomeSectionDetails";
import {
  CompositionPanel,
  HomeHero,
  HomeMetricStrip,
  ProceedingsShell,
  SessionSummaryCard,
  SignalsPanel,
} from "./components";
import type { HomeOverview, HomeSection, HomeSession } from "./types";

const SPEECH_PAGE_SIZE = 20;
const INITIAL_SECTION_PREVIEW_COUNT = 6;

type SectionLoadErrorKey =
  | "speeches"
  | "votings"
  | "links"
  | "subSections"
  | "rollCall";

const getScopedAsOfDate = (
  selectedHallituskausi: ReturnType<typeof useHallituskausi>["selectedHallituskausi"],
) => {
  const today = new Date().toISOString().slice(0, 10);
  if (!selectedHallituskausi) return today;

  let value = selectedHallituskausi.endDate || today;
  if (selectedHallituskausi.endDate) {
    const [year, month, day] = selectedHallituskausi.endDate
      .split("-")
      .map((part) => Number(part));
    const end = new Date(Date.UTC(year, month - 1, day));
    end.setUTCDate(end.getUTCDate() - 1);
    const previousDay = end.toISOString().slice(0, 10);
    value =
      previousDay >= selectedHallituskausi.startDate
        ? previousDay
        : selectedHallituskausi.startDate;
  }

  if (value < selectedHallituskausi.startDate) return selectedHallituskausi.startDate;
  return value;
};

const Home = () => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tErrors } = useScopedTranslation("errors");
  const { t: tHome } = useScopedTranslation("home");
  const { t: tSessions } = useScopedTranslation("sessions");
  const themedColors = useThemedColors();
  const { selectedHallituskausi } = useHallituskausi();

  const [overview, setOverview] = useState<HomeOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [sectionSpeechData, setSectionSpeechData] = useState<Record<number, SpeechData>>({});
  const [sectionVotings, setSectionVotings] = useState<Record<number, Voting[]>>({});
  const [sectionLinks, setSectionLinks] = useState<Record<string, SectionDocumentLink[]>>({});
  const [sectionRollCalls, setSectionRollCalls] = useState<Record<number, SectionRollCallData | null>>({});
  const [sectionSubSections, setSectionSubSections] = useState<Record<number, SubSection[]>>({});
  const [loadingSpeeches, setLoadingSpeeches] = useState<Set<number>>(new Set());
  const [loadingVotings, setLoadingVotings] = useState<Set<number>>(new Set());
  const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());
  const [loadingRollCalls, setLoadingRollCalls] = useState<Set<number>>(new Set());
  const [loadingSubSections, setLoadingSubSections] = useState<Set<number>>(new Set());
  const [loadingMoreSpeeches, setLoadingMoreSpeeches] = useState<Set<number>>(new Set());
  const [sectionLoadErrors, setSectionLoadErrors] = useState<
    Record<number, Partial<Record<SectionLoadErrorKey, string>>>
  >({});
  const [expandedVotingIds, setExpandedVotingIds] = useState<Set<number>>(new Set());
  const [votingDetailsById, setVotingDetailsById] = useState<Record<number, VotingInlineDetails>>({});
  const [loadingVotingDetails, setLoadingVotingDetails] = useState<Set<number>>(new Set());

  const asOfDate = useMemo(
    () => getScopedAsOfDate(selectedHallituskausi),
    [selectedHallituskausi],
  );

  const fetchOverview = useCallback(async () => {
    try {
      setLoadingOverview(true);
      setError(null);

      const params = new URLSearchParams({ asOfDate });
      if (selectedHallituskausi) {
        params.set("startDate", selectedHallituskausi.startDate);
        if (selectedHallituskausi.endDate) {
          params.set("endDate", selectedHallituskausi.endDate);
        }
        params.set("governmentName", selectedHallituskausi.name);
        params.set("governmentStartDate", selectedHallituskausi.startDate);
      }

      const response = await apiFetch(`/api/home/overview?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      setOverview(payload);
      setSectionLoadErrors({});
    } catch {
      setError(tHome("loadingError"));
      setOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  }, [asOfDate, selectedHallituskausi, tHome]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const allSessions = overview?.latestDay.sessions || [];

  const findSection = useCallback(
    (sectionId: number, sectionKey: string): HomeSection | undefined =>
      allSessions
        .flatMap((session) => session.sections || [])
        .find((section) => section.id === sectionId || section.key === sectionKey),
    [allSessions],
  );

  const getErrorReason = (fetchError: unknown) =>
    fetchError instanceof Error ? fetchError.message : tErrors("unknownError");

  const setSectionLoadError = (
    sectionId: number,
    key: SectionLoadErrorKey,
    reason: string,
  ) => {
    setSectionLoadErrors((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), [key]: reason },
    }));
  };

  const clearSectionLoadError = (sectionId: number, key: SectionLoadErrorKey) => {
    setSectionLoadErrors((prev) => {
      const current = prev[sectionId];
      if (!current || !current[key]) return prev;
      const nextSection = { ...current };
      delete nextSection[key];
      if (Object.keys(nextSection).length === 0) {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      }
      return { ...prev, [sectionId]: nextSection };
    });
  };

  const fetchSpeeches = async (sectionKey: string, offset = 0) => {
    const response = await apiFetch(
      `/api/sections/${sectionKey}/speeches?limit=${SPEECH_PAGE_SIZE}&offset=${offset}`,
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  };

  const fetchSectionLinks = async (sectionKey: string) => {
    const response = await apiFetch(`/api/sections/${sectionKey}/links`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  };

  const fetchSectionSubSections = async (sectionKey: string) => {
    const response = await apiFetch(`/api/sections/${sectionKey}/subsections`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  };

  const fetchSectionRollCall = async (sectionKey: string) => {
    const response = await apiFetch(`/api/sections/${sectionKey}/roll-call`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  };

  const loadSectionData = useCallback(
    async (sectionId: number, sectionKey: string) => {
      const section = findSection(sectionId, sectionKey);

      if (!sectionSpeechData[sectionId]) {
        setLoadingSpeeches((prev) => new Set(prev).add(sectionId));
        try {
          const data = await fetchSpeeches(sectionKey);
          setSectionSpeechData((prev) => ({ ...prev, [sectionId]: data }));
          clearSectionLoadError(sectionId, "speeches");
        } catch (fetchError) {
          setSectionLoadError(sectionId, "speeches", getErrorReason(fetchError));
        } finally {
          setLoadingSpeeches((prev) => {
            const next = new Set(prev);
            next.delete(sectionId);
            return next;
          });
        }
      }

      if (!sectionVotings[sectionId]) {
        setLoadingVotings((prev) => new Set(prev).add(sectionId));
        try {
          const response = await apiFetch(`/api/sections/${sectionKey}/votings`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          setSectionVotings((prev) => ({ ...prev, [sectionId]: data }));
          clearSectionLoadError(sectionId, "votings");
        } catch (fetchError) {
          setSectionLoadError(sectionId, "votings", getErrorReason(fetchError));
        } finally {
          setLoadingVotings((prev) => {
            const next = new Set(prev);
            next.delete(sectionId);
            return next;
          });
        }
      }

      if (!sectionLinks[sectionKey]) {
        setLoadingLinks((prev) => new Set(prev).add(sectionKey));
        try {
          const data = await fetchSectionLinks(sectionKey);
          setSectionLinks((prev) => ({ ...prev, [sectionKey]: data }));
          clearSectionLoadError(sectionId, "links");
        } catch (fetchError) {
          setSectionLoadError(sectionId, "links", getErrorReason(fetchError));
        } finally {
          setLoadingLinks((prev) => {
            const next = new Set(prev);
            next.delete(sectionKey);
            return next;
          });
        }
      }

      if (!Object.hasOwn(sectionSubSections, sectionId)) {
        setLoadingSubSections((prev) => new Set(prev).add(sectionId));
        try {
          const data = await fetchSectionSubSections(sectionKey);
          setSectionSubSections((prev) => ({ ...prev, [sectionId]: data }));
          clearSectionLoadError(sectionId, "subSections");
        } catch (fetchError) {
          setSectionLoadError(sectionId, "subSections", getErrorReason(fetchError));
        } finally {
          setLoadingSubSections((prev) => {
            const next = new Set(prev);
            next.delete(sectionId);
            return next;
          });
        }
      }

      if (section && isRollCallSection(section) && !Object.hasOwn(sectionRollCalls, sectionId)) {
        setLoadingRollCalls((prev) => new Set(prev).add(sectionId));
        try {
          const data = await fetchSectionRollCall(sectionKey);
          setSectionRollCalls((prev) => ({ ...prev, [sectionId]: data }));
          clearSectionLoadError(sectionId, "rollCall");
        } catch (fetchError) {
          setSectionLoadError(sectionId, "rollCall", getErrorReason(fetchError));
        } finally {
          setLoadingRollCalls((prev) => {
            const next = new Set(prev);
            next.delete(sectionId);
            return next;
          });
        }
      }
    },
    [findSection, sectionLinks, sectionRollCalls, sectionSpeechData, sectionSubSections, sectionVotings],
  );

  const toggleSection = (sectionId: number, sectionKey: string) => {
    const nextExpanded = !expandedSections.has(sectionId);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });

    if (nextExpanded) {
      void loadSectionData(sectionId, sectionKey);
    }
  };

  const loadMoreSpeeches = async (sectionId: number, sectionKey: string) => {
    const current = sectionSpeechData[sectionId];
    if (!current || current.page >= current.totalPages) return;

    setLoadingMoreSpeeches((prev) => new Set(prev).add(sectionId));
    try {
      const nextOffset = current.page * SPEECH_PAGE_SIZE;
      const data = await fetchSpeeches(sectionKey, nextOffset);
      setSectionSpeechData((prev) => ({
        ...prev,
        [sectionId]: {
          ...data,
          speeches: [...(prev[sectionId]?.speeches || []), ...data.speeches],
        },
      }));
      clearSectionLoadError(sectionId, "speeches");
    } catch (fetchError) {
      setSectionLoadError(sectionId, "speeches", getErrorReason(fetchError));
    } finally {
      setLoadingMoreSpeeches((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
  };

  const fetchVotingDetails = async (votingId: number) => {
    if (votingDetailsById[votingId] || loadingVotingDetails.has(votingId)) return;
    setLoadingVotingDetails((prev) => new Set(prev).add(votingId));
    try {
      const response = await apiFetch(`/api/votings/${votingId}/details`);
      if (!response.ok) return;
      const data = await response.json();
      setVotingDetailsById((prev) => ({ ...prev, [votingId]: data }));
    } finally {
      setLoadingVotingDetails((prev) => {
        const next = new Set(prev);
        next.delete(votingId);
        return next;
      });
    }
  };

  const toggleVotingDetails = (votingId: number) => {
    const nextExpanded = !expandedVotingIds.has(votingId);
    setExpandedVotingIds((prev) => {
      const next = new Set(prev);
      if (next.has(votingId)) next.delete(votingId);
      else next.add(votingId);
      return next;
    });
    if (nextExpanded) {
      void fetchVotingDetails(votingId);
    }
  };

  const toggleSessionExpansion = (sessionKey: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionKey)) next.delete(sessionKey);
      else next.add(sessionKey);
      return next;
    });
  };

  if (loadingOverview) {
    return (
      <Box sx={{ ...commonStyles.centeredFlex, minHeight: 320 }}>
        <CircularProgress size={28} sx={{ color: themedColors.primary }} />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => void fetchOverview()}>
              {tCommon("retry")}
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {overview && (
        <>
          <HomeHero overview={overview} tHome={tHome} />
          <HomeMetricStrip overview={overview} tHome={tHome} />

          <Grid container spacing={2} sx={{ mb: spacing.md }}>
            <Grid size={{ xs: 12, lg: 5 }}>
              <CompositionPanel overview={overview} tHome={tHome} />
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <ProceedingsShell
                tHome={tHome}
                latestDate={overview.latestDay.date}
              >
                {overview.latestDay.sessions.length === 0 ? (
                  <Box sx={{ p: 3 }}>
                    <Alert severity="info">{tHome("noProceedings")}</Alert>
                  </Box>
                ) : (
                  overview.latestDay.sessions.map((session) => {
                    const previewCount = expandedSessions.has(session.key)
                      ? session.sections.length
                      : Math.min(session.sections.length, INITIAL_SECTION_PREVIEW_COUNT);
                    const speechLag =
                      overview.latestDay.vaskiLatestSpeechDate &&
                      session.date &&
                      new Date(session.date).getTime() >
                        new Date(overview.latestDay.vaskiLatestSpeechDate).getTime();

                    return (
                      <Box key={session.id}>
                        <SessionSummaryCard
                          session={session}
                          tHome={tHome}
                          tSessions={tSessions}
                        />

                        {speechLag && (
                          <Box sx={{ px: 2, pt: 2 }}>
                            <Alert
                              severity="info"
                              icon={<WarningAmberIcon fontSize="inherit" />}
                            >
                              <Typography sx={{ fontSize: "0.8125rem" }}>
                                {tSessions("speechContentPending")}{" "}
                                {tSessions("speechContentLatest", {
                                  date: formatDateLongFi(
                                    overview.latestDay.vaskiLatestSpeechDate as string,
                                  ),
                                })}
                              </Typography>
                            </Alert>
                          </Box>
                        )}

                        {session.sections.slice(0, previewCount).map((section) => {
                          const isExpanded = expandedSections.has(section.id);
                          const sectionNotices = (session.notices || []).filter(
                            (notice) => notice.section_key === section.key,
                          );

                          return (
                            <SessionSectionPanel
                              key={section.id}
                              sectionId={section.id}
                              sectionKey={section.key}
                              isExpanded={isExpanded}
                              onToggle={() => toggleSection(section.id, section.key)}
                              headerContent={
                                <>
                                  <Chip
                                    label={getSectionOrderLabel(section)}
                                    size="small"
                                    sx={{
                                      background: colors.primary,
                                      color: "#fff",
                                      fontWeight: 700,
                                      ...commonStyles.compactChipMd,
                                    }}
                                  />
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography
                                      sx={{
                                        fontWeight: 700,
                                        fontSize: "0.9rem",
                                        color: colors.textPrimary,
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {section.title || section.processing_title || tSessions("noTitle")}
                                    </Typography>
                                    {section.processing_title &&
                                      section.processing_title !== section.title && (
                                        <Typography
                                          sx={{
                                            ...commonStyles.compactTextLg,
                                            color: colors.textSecondary,
                                            mt: 0.25,
                                          }}
                                        >
                                          {section.processing_title}
                                        </Typography>
                                      )}
                                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.85 }}>
                                      <Chip
                                        size="small"
                                        icon={<EventIcon sx={{ fontSize: "14px !important" }} />}
                                        label={tSessions("speakersCount", {
                                          count: section.speaker_count ?? 0,
                                        })}
                                        sx={{ ...commonStyles.compactChipXs }}
                                      />
                                      <Chip
                                        size="small"
                                        icon={<MicIcon sx={{ fontSize: "14px !important" }} />}
                                        label={tSessions("speechesCount", {
                                          count: section.speech_count ?? 0,
                                        })}
                                        sx={{
                                          ...commonStyles.compactChipXs,
                                          color: colors.primaryLight,
                                          background: `${colors.primaryLight}12`,
                                        }}
                                      />
                                      <Chip
                                        size="small"
                                        icon={<HowToVoteIcon sx={{ fontSize: "14px !important" }} />}
                                        label={tSessions("votingsCount", {
                                          count: section.voting_count ?? 0,
                                        })}
                                        sx={{
                                          ...commonStyles.compactChipXs,
                                          color: colors.success,
                                          background: `${colors.success}12`,
                                        }}
                                      />
                                      {section.minutes_related_document_identifier && (
                                        <Chip
                                          size="small"
                                          icon={<InsertDriveFileOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                                          label={section.minutes_related_document_identifier}
                                          sx={{
                                            ...commonStyles.compactChipXs,
                                            color: colors.warning,
                                            background: `${colors.warning}12`,
                                          }}
                                        />
                                      )}
                                      {sectionNotices.length > 0 && (
                                        <Chip
                                          size="small"
                                          label={tHome("noticeCount", {
                                            count: sectionNotices.length,
                                          })}
                                          sx={{
                                            ...commonStyles.compactChipXs,
                                            color: colors.warning,
                                            background: `${colors.warning}12`,
                                          }}
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                </>
                              }
                            >
                              <HomeSectionDetails
                                session={session}
                                section={section}
                                speechData={sectionSpeechData[section.id]}
                                votings={sectionVotings[section.id] || []}
                                links={sectionLinks[section.key] || []}
                                rollCallData={sectionRollCalls[section.id]}
                                subSections={sectionSubSections[section.id]}
                                notices={session.notices || []}
                                loadingSpeeches={loadingSpeeches.has(section.id)}
                                loadingMoreSpeeches={loadingMoreSpeeches.has(section.id)}
                                loadingVotings={loadingVotings.has(section.id)}
                                loadingLinks={loadingLinks.has(section.key)}
                                loadingRollCalls={loadingRollCalls.has(section.id)}
                                loadingSubSections={loadingSubSections.has(section.id)}
                                sectionErrors={sectionLoadErrors[section.id]}
                                expandedVotingIds={expandedVotingIds}
                                votingDetailsById={votingDetailsById}
                                loadingVotingDetails={loadingVotingDetails}
                                vaskiLatestSpeechDate={overview.latestDay.vaskiLatestSpeechDate}
                                onRetry={() => void loadSectionData(section.id, section.key)}
                                onLoadMoreSpeeches={() =>
                                  void loadMoreSpeeches(section.id, section.key)
                                }
                                onToggleVotingDetails={toggleVotingDetails}
                              />
                            </SessionSectionPanel>
                          );
                        })}

                        {session.sections.length > INITIAL_SECTION_PREVIEW_COUNT && (
                          <Box sx={{ p: 2, borderBottom: `1px solid ${colors.dataBorder}` }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => toggleSessionExpansion(session.key)}
                              sx={{ ...commonStyles.compactOutlinedPrimaryButton }}
                            >
                              {expandedSessions.has(session.key)
                                ? tHome("showLessSections")
                                : tHome("showMoreSections", {
                                    count:
                                      session.sections.length - INITIAL_SECTION_PREVIEW_COUNT,
                                  })}
                            </Button>
                          </Box>
                        )}
                      </Box>
                    );
                  })
                )}
              </ProceedingsShell>
            </Grid>
          </Grid>

          <SignalsPanel overview={overview} tHome={tHome} />
        </>
      )}
    </Box>
  );
};

export default Home;
