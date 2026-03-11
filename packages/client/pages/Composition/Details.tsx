import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CloseIcon from "@mui/icons-material/Close";
import EmailIcon from "@mui/icons-material/Email";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MicIcon from "@mui/icons-material/Mic";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PersonIcon from "@mui/icons-material/Person";
import QuizIcon from "@mui/icons-material/Quiz";
import WorkIcon from "@mui/icons-material/Work";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
} from "@mui/material";
import React from "react";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import theme, { colors } from "#client/theme";
import { VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { isSafeExternalUrl } from "#client/utils/eduskunta-links";
import { apiFetch } from "#client/utils/fetch";

type SpeechType =
  ApiRouteResponse<`/api/person/:id/speeches`>["speeches"][number];

type SectionSpeechType = Pick<
  DatabaseTables.Speech,
  | "id"
  | "section_key"
  | "session_key"
  | "person_id"
  | "first_name"
  | "last_name"
  | "party_abbreviation"
  | "speech_type"
  | "ordinal_number"
> & {
  start_time: string | null;
  end_time: string | null;
  content: string | null;
};

type SectionConversationType = {
  speeches: SectionSpeechType[];
  total: number;
  truncated: boolean;
};

type SectionDetailsType = ApiRouteResponse<`/api/sections/:sectionKey`>;

type CommitteeType = ApiRouteItem<`/api/person/:id/committees`>;

type VotesByPersonType = ApiRouteItem<`/api/person/:id/votes`>;

type PersonQuestionType = ApiRouteItem<`/api/person/:id/questions`>;

type VotingInlineDetails = ApiRouteResponse<`/api/votings/:id/details`>;

const fetchPersonDetails = async (personId: number) => {
  const [
    groupMemberships,
    terms,
    representativeDetails,
    districts,
    leavingRecords,
    trustPositions,
    governmentMemberships,
  ] = await Promise.all([
    apiFetch(`/api/person/${personId}/group-memberships`).then((res) =>
      res.json(),
    ),
    apiFetch(`/api/person/${personId}/terms`).then((res) => res.json()),
    apiFetch(`/api/person/${personId}/details`).then((res) => res.json()),
    apiFetch(`/api/person/${personId}/districts`).then((res) => res.json()),
    apiFetch(`/api/person/${personId}/leaving-records`).then((res) =>
      res.json(),
    ),
    apiFetch(`/api/person/${personId}/trust-positions`).then((res) =>
      res.json(),
    ),
    apiFetch(`/api/person/${personId}/government-memberships`).then((res) =>
      res.json(),
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

const fetchPersonVotes = async (personId: number) => {
  const res = await apiFetch(`/api/person/${personId}/votes`);
  return res.json();
};

const fetchPersonSpeeches = async (
  personId: number,
  limit = 50,
  offset = 0,
) => {
  const res = await apiFetch(
    `/api/person/${personId}/speeches?limit=${limit}&offset=${offset}`,
  );
  return res.json();
};

const SECTION_SPEECH_PAGE_SIZE = 100;
const SECTION_SPEECH_MAX_PAGES = 30;
const SECTION_SPEECH_TARGET_SEEK_MAX_PAGES = 500;
const SECTION_SPEECH_REQUEST_TIMEOUT_MS = 15_000;
const SECTION_SPEECH_TOTAL_FETCH_TIMEOUT_MS = 12_000;

const fetchSectionSpeechesPage = async (
  sectionKey: string,
  limit = SECTION_SPEECH_PAGE_SIZE,
  offset = 0,
) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    SECTION_SPEECH_REQUEST_TIMEOUT_MS,
  );
  const res = await apiFetch(
    `/api/sections/${encodeURIComponent(sectionKey)}/speeches?limit=${limit}&offset=${offset}`,
    { signal: controller.signal },
  ).finally(() => {
    window.clearTimeout(timeoutId);
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

const fetchSectionDetails = async (sectionKey: string) => {
  const res = await apiFetch(`/api/sections/${encodeURIComponent(sectionKey)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

const fetchSectionConversation = async (
  sectionKey: string,
  targetSpeechId?: number,
): Promise<SectionConversationType> => {
  const startedAt = Date.now();
  let page = 1;
  let totalPages = 1;
  let offset = 0;
  let total = 0;
  const speeches: SectionSpeechType[] = [];
  let targetSpeechIncluded = targetSpeechId === undefined;

  while (
    page <= totalPages &&
    page <= SECTION_SPEECH_TARGET_SEEK_MAX_PAGES &&
    Date.now() - startedAt < SECTION_SPEECH_TOTAL_FETCH_TIMEOUT_MS
  ) {
    const data = await fetchSectionSpeechesPage(
      sectionKey,
      SECTION_SPEECH_PAGE_SIZE,
      offset,
    );
    speeches.push(...data.speeches);
    if (targetSpeechId !== undefined) {
      targetSpeechIncluded =
        targetSpeechIncluded ||
        data.speeches.some((speech) => speech.id === targetSpeechId);
    }
    total = data.total;
    totalPages = data.totalPages || 1;
    if (data.speeches.length === 0) break;
    if (page >= SECTION_SPEECH_MAX_PAGES && targetSpeechIncluded) break;
    if (page >= SECTION_SPEECH_MAX_PAGES && targetSpeechId === undefined) break;
    page += 1;
    offset += SECTION_SPEECH_PAGE_SIZE;
  }

  return {
    speeches,
    total,
    truncated: speeches.length < total,
  };
};

const fetchPersonCommittees = async (personId: number) => {
  const res = await apiFetch(`/api/person/${personId}/committees`);
  return res.json();
};

const fetchPersonQuestions = async (personId: number, limit = 500) => {
  const res = await apiFetch(
    `/api/person/${personId}/questions?limit=${limit}`,
  );
  return res.json();
};

const displayDate = (date?: string | null, ongoingLabel = "-") => {
  if (!date) return ongoingLabel;
  return new Date(date).toLocaleDateString("fi-FI");
};

const calculateAge = (birthDate: string, asOfDate: string) => {
  const birth = new Date(birthDate);
  const asOf = new Date(asOfDate);
  let age = asOf.getFullYear() - birth.getFullYear();
  const m = asOf.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < birth.getDate())) age--;
  return age;
};

/** Info row used in the overview tab */
const InfoRow: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => {
  const themedColors = useThemedColors();
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        py: 1,
        borderBottom: `1px solid ${themedColors.dataBorder}`,
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: themedColors.textSecondary, minWidth: 120 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight="600"
        sx={{ color: themedColors.textPrimary, textAlign: "right" }}
      >
        {value}
      </Typography>
    </Box>
  );
};

/** Section heading inside tabs */
const SectionLabel: React.FC<{
  icon: React.ReactNode;
  label: string;
}> = ({ icon, label }) => {
  const themedColors = useThemedColors();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 1.5,
        mt: 2.5,
        "&:first-of-type": { mt: 0 },
      }}
    >
      {icon}
      <Typography
        variant="subtitle2"
        fontWeight="700"
        sx={{ color: themedColors.textPrimary }}
      >
        {label}
      </Typography>
    </Box>
  );
};

// ──────────────────────────── Tab: Yleistiedot ────────────────────────────

const OverviewTab: React.FC<{
  details: Awaited<ReturnType<typeof fetchPersonDetails>>;
}> = ({ details }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();

  return (
    <Box>
      {/* Basic Info */}
      <SectionLabel
        icon={<PersonIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />}
        label={t("details.basicInfo")}
      />
      <Box sx={{ mb: 2 }}>
        {details.representativeDetails?.gender && (
          <InfoRow
            label={t("details.gender")}
            value={details.representativeDetails.gender}
          />
        )}
        {details.representativeDetails?.birth_date && (
          <InfoRow
            label={t("details.birthDate")}
            value={
              <>
                {displayDate(details.representativeDetails.birth_date)}
                {details.representativeDetails.birth_place &&
                  ` (${details.representativeDetails.birth_place})`}
              </>
            }
          />
        )}
        {details.representativeDetails?.death_date && (
          <InfoRow
            label={t("details.deathDate")}
            value={
              <>
                {displayDate(details.representativeDetails.death_date)}
                {details.representativeDetails.death_place &&
                  ` (${details.representativeDetails.death_place})`}
                {details.representativeDetails.birth_date &&
                  ` - ${calculateAge(details.representativeDetails.birth_date, details.representativeDetails.death_date)} ${t("details.years")}`}
              </>
            }
          />
        )}
        {details.representativeDetails?.profession && (
          <InfoRow
            label={t("details.profession")}
            value={details.representativeDetails.profession}
          />
        )}
      </Box>

      {/* Contact Info */}
      {(details.representativeDetails?.email ||
        details.representativeDetails?.phone ||
        details.representativeDetails?.website) && (
        <>
          <SectionLabel
            icon={
              <EmailIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />
            }
            label={t("details.contactInfo")}
          />
          <Box sx={{ mb: 2 }}>
            {details.representativeDetails.email && (
              <InfoRow
                label={t("details.email")}
                value={details.representativeDetails.email}
              />
            )}
            {details.representativeDetails.phone && (
              <InfoRow
                label={t("details.phone")}
                value={details.representativeDetails.phone}
              />
            )}
            {details.representativeDetails.website && (
              <InfoRow
                label={t("details.website")}
                value={
                  <a
                    href={
                      isSafeExternalUrl(details.representativeDetails.website)
                        ? details.representativeDetails.website
                        : undefined
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: colors.primaryLight,
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {details.representativeDetails.website}
                  </a>
                }
              />
            )}
          </Box>
        </>
      )}

      {/* Districts */}
      {details.districts && details.districts.length > 0 && (
        <>
          <SectionLabel
            icon={
              <LocationOnIcon
                sx={{ color: colors.primaryLight, fontSize: 20 }}
              />
            }
            label={t("details.electoralDistricts")}
          />
          <List dense sx={{ p: 0, mb: 2 }}>
            {details.districts.map((district) => (
              <ListItem key={district.id} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  disableTypography
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{ color: themedColors.textPrimary }}
                    >
                      {district.district_name}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {displayDate(district.start_date, t("details.ongoing"))} -{" "}
                      {displayDate(district.end_date, t("details.ongoing"))}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Parliamentary Membership */}
      {details.groupMemberships && details.groupMemberships.length > 0 && (
        <>
          <SectionLabel
            icon={
              <HowToVoteIcon
                sx={{ color: colors.primaryLight, fontSize: 20 }}
              />
            }
            label={t("details.membership")}
          />
          <List dense sx={{ p: 0, mb: 2 }}>
            {details.groupMemberships.map((membership, i) => {
              const leavingRecord = details.leavingRecords?.find((record) => {
                if (!membership.end_date || !record.end_date) {
                  return false;
                }
                const recordDate = new Date(record.end_date);
                const membershipEndDate = new Date(membership.end_date);
                const diffDays = Math.abs(
                  (recordDate.getTime() - membershipEndDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                return diffDays < 30;
              });
              return (
                <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                  <ListItemText
                    disableTypography
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ color: themedColors.textPrimary }}
                      >
                        {membership.group_name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ color: themedColors.textSecondary }}
                        >
                          {displayDate(
                            membership.start_date,
                            t("details.ongoing"),
                          )}{" "}
                          -{" "}
                          {displayDate(
                            membership.end_date,
                            t("details.ongoing"),
                          )}
                          {leavingRecord?.replacement_person &&
                            ` (${t("details.successorLine", { value: leavingRecord.replacement_person })})`}
                        </Typography>
                        {leavingRecord?.description && (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{
                              color: themedColors.textTertiary,
                              fontStyle: "italic",
                              mt: 0.25,
                            }}
                          >
                            {leavingRecord.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      {/* Government Memberships */}
      {details.governmentMemberships &&
        details.governmentMemberships.length > 0 && (
          <>
            <SectionLabel
              icon={
                <AccountBalanceIcon
                  sx={{ color: colors.primaryLight, fontSize: 20 }}
                />
              }
              label={t("details.governmentCoalitionParticipation")}
            />
            <List dense sx={{ p: 0 }}>
              {details.governmentMemberships.map((membership, i) => (
                <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                  <ListItemText
                    disableTypography
                    primary={
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          sx={{ color: themedColors.textPrimary }}
                        >
                          {membership.government}
                        </Typography>
                        {membership.ministry && (
                          <Typography
                            variant="body2"
                            sx={{ color: themedColors.textSecondary }}
                          >
                            {membership.ministry}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.25 }}>
                        <Typography
                          variant="caption"
                          fontWeight="600"
                          sx={{ color: colors.primaryLight }}
                        >
                          {membership.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ color: themedColors.textSecondary }}
                        >
                          {displayDate(
                            membership.start_date,
                            t("details.ongoing"),
                          )}{" "}
                          -{" "}
                          {displayDate(
                            membership.end_date,
                            t("details.ongoing"),
                          )}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
    </Box>
  );
};

// ──────────────────────────── Tab: Aanestykset ────────────────────────────

const VotesTab: React.FC<{ personId: number }> = ({ personId }) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tComposition } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const [votes, setVotes] = React.useState<VotesByPersonType[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedVoting, setSelectedVoting] =
    React.useState<VotesByPersonType | null>(null);
  const [votingDetailsById, setVotingDetailsById] = React.useState<
    Record<number, VotingInlineDetails>
  >({});
  const [loadingVotingDetails, setLoadingVotingDetails] = React.useState<
    Set<number>
  >(new Set());
  const [failedVotingDetails, setFailedVotingDetails] = React.useState<
    Set<number>
  >(new Set());
  const [selectedGovName, setSelectedGovName] = React.useState<string | null>(null);
  const DISPLAY_LIMIT = 200;
  const [displayCount, setDisplayCount] = React.useState(DISPLAY_LIMIT);

  const selectGov = (name: string | null) => {
    setSelectedGovName(name);
    setDisplayCount(DISPLAY_LIMIT);
  };

  React.useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchPersonVotes(personId)
      .then((v) => {
        if (ignore) return;
        setVotes(v);
        setSelectedVoting(null);
        setVotingDetailsById({});
        setLoadingVotingDetails(new Set());
        setFailedVotingDetails(new Set());
        setSelectedGovName(null);
        setDisplayCount(DISPLAY_LIMIT);
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [personId]);

  const openVoting = (votingId: number, startTime?: string | null) => {
    window.history.pushState(
      {},
      "",
      refs.voting(votingId, undefined, startTime || undefined),
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const fetchVotingDetails = async (votingId: number, force = false) => {
    if (
      !force &&
      (votingDetailsById[votingId] || loadingVotingDetails.has(votingId))
    ) {
      return;
    }
    if (force || failedVotingDetails.has(votingId)) {
      setFailedVotingDetails((prev) => {
        const next = new Set(prev);
        next.delete(votingId);
        return next;
      });
    }
    setLoadingVotingDetails((prev) => new Set(prev).add(votingId));
    try {
      const res = await apiFetch(`/api/votings/${votingId}/details`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVotingDetailsById((prev) => ({ ...prev, [votingId]: data }));
    } catch {
      setFailedVotingDetails((prev) => new Set(prev).add(votingId));
    } finally {
      setLoadingVotingDetails((prev) => {
        const next = new Set(prev);
        next.delete(votingId);
        return next;
      });
    }
  };

  const openVotingDetails = (vote: VotesByPersonType) => {
    setSelectedVoting(vote);
    void fetchVotingDetails(vote.id);
  };

  const closeVotingDetails = () => {
    setSelectedVoting(null);
  };

  const selectedVotingDetails = selectedVoting
    ? votingDetailsById[selectedVoting.id]
    : null;
  const selectedVotingLoading = selectedVoting
    ? loadingVotingDetails.has(selectedVoting.id)
    : false;
  const selectedVotingFailed = selectedVoting
    ? failedVotingDetails.has(selectedVoting.id)
    : false;

  const governmentStats = React.useMemo(() => {
    if (!votes) return [];
    const map = new Map<string, {
      governmentName: string;
      governmentStartDate: string;
      governmentEndDate: string | null;
      isCoalition: boolean;
      yes: number; no: number; abstain: number; absent: number; total: number;
    }>();
    for (const v of votes) {
      if (!v.government_name) continue;
      const key = v.government_name;
      if (!map.has(key)) {
        map.set(key, {
          governmentName: v.government_name,
          governmentStartDate: v.government_start_date!,
          governmentEndDate: v.government_end_date,
          isCoalition: v.is_coalition === 1,
          yes: 0, no: 0, abstain: 0, absent: 0, total: 0,
        });
      }
      const s = map.get(key)!;
      s.total++;
      if (v.vote === "Jaa") s.yes++;
      else if (v.vote === "Ei") s.no++;
      else if (v.vote === "Tyhjää") s.abstain++;
      else if (v.vote === "Poissa") s.absent++;
    }
    return [...map.values()].sort(
      (a, b) => new Date(b.governmentStartDate).getTime() - new Date(a.governmentStartDate).getTime(),
    );
  }, [votes]);

  const filteredVotes = React.useMemo(
    () =>
      selectedGovName
        ? (votes ?? []).filter((v) => v.government_name === selectedGovName)
        : (votes ?? []),
    [votes, selectedGovName],
  );

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  const totalVotes = votes?.length || 0;
  const yesVotes = votes?.filter((v) => v.vote === "Jaa").length || 0;
  const noVotes = votes?.filter((v) => v.vote === "Ei").length || 0;
  const emptyVotes = votes?.filter((v) => v.vote === "Tyhjää").length || 0;
  const absentVotes = votes?.filter((v) => v.vote === "Poissa").length || 0;
  const participationRate =
    totalVotes > 0
      ? (((totalVotes - absentVotes) / totalVotes) * 100).toFixed(1)
      : "0";

  const selectedGovStats = selectedGovName
    ? governmentStats.find((s) => s.governmentName === selectedGovName) ?? null
    : null;

  const displayStats = selectedGovStats
    ? {
        yes: selectedGovStats.yes,
        no: selectedGovStats.no,
        empty: selectedGovStats.abstain,
        absent: selectedGovStats.absent,
        total: selectedGovStats.total,
      }
    : {
        yes: yesVotes,
        no: noVotes,
        empty: emptyVotes,
        absent: absentVotes,
        total: totalVotes,
      };
  const displayParticipationRate =
    displayStats.total > 0
      ? (((displayStats.total - displayStats.absent) / displayStats.total) * 100).toFixed(1)
      : "0";

  return (
    <Box>
      {/* Recent votes (flat list) */}
      {votes && votes.length > 0 && (
        <>
          <SectionLabel
            icon={
              <HowToVoteIcon
                sx={{ color: colors.primaryLight, fontSize: 20 }}
              />
            }
            label={tComposition("details.votes.recentVotes")}
          />
          {governmentStats.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}>
              <Chip
                label={tComposition("details.votes.allGovernments")}
                size="small"
                onClick={() => selectGov(null)}
                sx={{
                  height: 22,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  ...(selectedGovName === null
                    ? { bgcolor: colors.primary, color: "white" }
                    : { variant: "outlined", bgcolor: "transparent", border: `1px solid ${themedColors.dataBorder}`, color: themedColors.textSecondary }),
                }}
              />
              {governmentStats.map((s) => (
                <Chip
                  key={s.governmentName}
                  label={`${s.governmentName} (${new Date(s.governmentStartDate).getFullYear()}–${s.governmentEndDate ? new Date(s.governmentEndDate).getFullYear() : ""})`}
                  size="small"
                  onClick={() => selectGov(s.governmentName)}
                  sx={{
                    height: 22,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    ...(selectedGovName === s.governmentName
                      ? { bgcolor: colors.primary, color: "white" }
                      : {
                          bgcolor: "transparent",
                          border: `1px solid ${s.isCoalition ? "#3B82F6" : "#F97316"}`,
                          color: s.isCoalition ? "#2563EB" : "#EA580C",
                        }),
                  }}
                />
              ))}
            </Box>
          )}
          {/* Metrics row — context-aware (reflects selected gov or overall) */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                textAlign: "center",
              }}
            >
              <Typography
                sx={{ fontSize: "1.25rem", fontWeight: 700, color: themedColors.textPrimary }}
              >
                {displayParticipationRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                {tComposition("details.votes.participation")}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                textAlign: "center",
              }}
            >
              <Typography
                sx={{ fontSize: "1.25rem", fontWeight: 700, color: themedColors.textPrimary }}
              >
                {displayStats.total}
              </Typography>
              <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                {tComposition("details.votes.totalVotes")}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                textAlign: "center",
              }}
            >
              <VoteMarginBar
                yes={displayStats.yes}
                no={displayStats.no}
                empty={displayStats.empty}
                absent={displayStats.absent}
                height={6}
                sx={{ mb: 0.5, mt: 0.5 }}
              />
              <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                {tComposition("details.votes.voteBreakdown", {
                  yes: displayStats.yes,
                  no: displayStats.no,
                  empty: displayStats.empty,
                })}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
            {filteredVotes.slice(0, displayCount).map((v) => (
              <Box
                key={`${v.id}-${v.vote}`}
                sx={{
                  py: 1,
                  borderBottom: `1px solid ${themedColors.dataBorder}`,
                  "&:last-child": { borderBottom: "none" },
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: themedColors.textPrimary }}
                  >
                    {v.title || v.section_title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: themedColors.textSecondary }}
                  >
                    {v.start_time
                      ? new Date(v.start_time).toLocaleDateString("fi-FI")
                      : "-"}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.5,
                      mt: 0.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      size="small"
                      sx={{
                        textTransform: "none",
                        minWidth: 0,
                        px: 1,
                        fontSize: "0.68rem",
                      }}
                      onClick={() => openVotingDetails(v)}
                    >
                      {tCommon("detailsToggle", { context: "show" })}
                    </Button>
                    <Button
                      size="small"
                      sx={{
                        textTransform: "none",
                        minWidth: 0,
                        px: 1,
                        fontSize: "0.68rem",
                      }}
                      endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                      onClick={() => openVoting(v.id, v.start_time)}
                    >
                      {tCommon("openView")}
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-end", flexShrink: 0 }}>
                  <Chip
                    label={v.vote}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor:
                        v.vote === "Jaa"
                          ? "#22C55E20"
                          : v.vote === "Ei"
                            ? "#EF444420"
                            : v.vote === "Poissa"
                              ? `${colors.neutral}20`
                              : "#F59E0B20",
                      color:
                        v.vote === "Jaa"
                          ? "#16A34A"
                          : v.vote === "Ei"
                            ? "#DC2626"
                            : v.vote === "Poissa"
                              ? colors.neutral
                              : "#D97706",
                    }}
                  />
                  {v.government_name !== null && (
                    <Chip
                      label={v.is_coalition ? tComposition("details.votes.coalition") : tComposition("details.votes.opposition")}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor: v.is_coalition ? "#3B82F620" : "#F9731620",
                        color: v.is_coalition ? "#2563EB" : "#EA580C",
                      }}
                    />
                  )}
                </Box>
              </Box>
            ))}
            {filteredVotes.length > displayCount && (
              <Box sx={{ pt: 1.5, textAlign: "center" }}>
                <Button
                  size="small"
                  onClick={() => setDisplayCount((n) => n + DISPLAY_LIMIT)}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                >
                  {tComposition("details.votes.showMore", { shown: displayCount, total: filteredVotes.length })}
                </Button>
              </Box>
            )}
          </Box>
        </>
      )}

      {totalVotes === 0 && (
        <Typography
          variant="body2"
          sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
        >
          {tComposition("details.votes.noData")}
        </Typography>
      )}

      <Drawer
        anchor="right"
        open={Boolean(selectedVoting)}
        onClose={closeVotingDetails}
        sx={{ zIndex: theme.zIndex.modal + 2 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 560 },
            bgcolor: themedColors.backgroundSubtle,
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderBottom: `1px solid ${themedColors.dataBorder}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ color: themedColors.textPrimary }}
                >
                  {tComposition("details.votes.drawer.title")}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textSecondary }}
                >
                  {selectedVoting
                    ? selectedVoting.start_time
                      ? new Date(selectedVoting.start_time).toLocaleDateString(
                          "fi-FI",
                        )
                      : "-"
                    : "-"}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={closeVotingDetails}
                aria-label={tComposition("details.votes.drawer.closeAria")}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {selectedVoting && (
              <>
                <Typography
                  variant="body2"
                  sx={{ color: themedColors.textSecondary, mt: 1 }}
                >
                  {selectedVoting.title || selectedVoting.section_title}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.75,
                    mt: 1,
                    alignItems: "center",
                  }}
                >
                  <Chip
                    size="small"
                    label={tComposition("details.votes.drawer.voteLine", {
                      value: selectedVoting.vote,
                    })}
                    sx={{ height: 20, fontSize: "0.65rem" }}
                  />
                  <Chip
                    size="small"
                    label={tComposition("details.votes.drawer.groupLine", {
                      value: selectedVoting.group_abbreviation,
                    })}
                    sx={{ height: 20, fontSize: "0.65rem" }}
                  />
                  {selectedVoting.government_name !== null && (
                    <Chip
                      size="small"
                      label={selectedVoting.is_coalition ? tComposition("details.votes.coalition") : tComposition("details.votes.opposition")}
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        bgcolor: selectedVoting.is_coalition ? "#3B82F620" : "#F9731620",
                        color: selectedVoting.is_coalition ? "#2563EB" : "#EA580C",
                      }}
                    />
                  )}
                </Box>
                <Button
                  onClick={() =>
                    openVoting(selectedVoting.id, selectedVoting.start_time)
                  }
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    mt: 1.25,
                    textTransform: "none",
                    px: 1.25,
                    py: 0.5,
                    minWidth: 0,
                    alignSelf: "flex-start",
                  }}
                >
                  {tComposition("details.votes.drawer.openFullVoting")}
                </Button>
              </>
            )}
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              p: { xs: 2, sm: 2.5 },
            }}
          >
            {selectedVotingLoading && (
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}
              >
                <CircularProgress size={20} />
                <Typography
                  variant="body2"
                  sx={{ color: themedColors.textSecondary }}
                >
                  {tCommon("loadingVotingDetails")}
                </Typography>
              </Box>
            )}

            {selectedVoting &&
              selectedVotingFailed &&
              !selectedVotingLoading && (
                <Box sx={{ py: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: themedColors.textTertiary }}
                  >
                    {tComposition("details.votes.drawer.detailsLoadError")}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() =>
                      void fetchVotingDetails(selectedVoting.id, true)
                    }
                    sx={{
                      mt: 0.75,
                      px: 1,
                      py: 0,
                      minWidth: 0,
                      textTransform: "none",
                      fontSize: "0.72rem",
                    }}
                  >
                    {tCommon("retry")}
                  </Button>
                </Box>
              )}

            {selectedVotingDetails && !selectedVotingLoading && (
              <Box>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1.5,
                    border: `1px solid ${themedColors.dataBorder}`,
                    bgcolor: themedColors.backgroundPaper,
                    mb: 1.25,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight={700}
                    sx={{ color: themedColors.textPrimary, mb: 0.75 }}
                  >
                    {tComposition("details.votes.drawer.summaryTitle")}
                  </Typography>
                  <VoteMarginBar
                    yes={selectedVotingDetails.voting.n_yes}
                    no={selectedVotingDetails.voting.n_no}
                    empty={selectedVotingDetails.voting.n_abstain}
                    absent={selectedVotingDetails.voting.n_absent}
                    height={8}
                    sx={{ mb: 0.8 }}
                  />
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label={tCommon("yesCount", {
                        count: selectedVotingDetails.voting.n_yes,
                      })}
                      sx={{ height: 20 }}
                    />
                    <Chip
                      size="small"
                      label={tCommon("noCount", {
                        count: selectedVotingDetails.voting.n_no,
                      })}
                      sx={{ height: 20 }}
                    />
                    <Chip
                      size="small"
                      label={tCommon("emptyCount", {
                        count: selectedVotingDetails.voting.n_abstain,
                      })}
                      sx={{ height: 20 }}
                    />
                    <Chip
                      size="small"
                      label={tCommon("absentCount", {
                        count: selectedVotingDetails.voting.n_absent,
                      })}
                      sx={{ height: 20 }}
                    />
                  </Box>
                  {selectedVotingDetails.governmentOpposition && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: themedColors.textSecondary,
                        mt: 0.75,
                        display: "block",
                      }}
                    >
                      {tComposition(
                        "details.votes.drawer.governmentOppositionSummary",
                        {
                          governmentYes:
                            selectedVotingDetails.governmentOpposition
                              .government_yes,
                          governmentNo:
                            selectedVotingDetails.governmentOpposition
                              .government_no,
                          oppositionYes:
                            selectedVotingDetails.governmentOpposition
                              .opposition_yes,
                          oppositionNo:
                            selectedVotingDetails.governmentOpposition
                              .opposition_no,
                        },
                      )}
                    </Typography>
                  )}
                  {selectedVotingDetails.relatedVotings.length > 0 && (
                    <Box sx={{ mt: 0.9 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: themedColors.textSecondary }}
                      >
                        {tComposition(
                          "details.votes.drawer.relatedVotingsTitle",
                        )}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          flexWrap: "wrap",
                          mt: 0.5,
                        }}
                      >
                        {selectedVotingDetails.relatedVotings
                          .slice(0, 6)
                          .map((related) => (
                            <Button
                              key={related.id}
                              size="small"
                              onClick={() =>
                                openVoting(
                                  related.id,
                                  selectedVoting?.start_time,
                                )
                              }
                              sx={{
                                textTransform: "none",
                                minWidth: 0,
                                px: 1,
                                py: 0.25,
                                fontSize: "0.68rem",
                              }}
                            >
                              #{related.id} ({related.n_yes}/{related.n_no})
                            </Button>
                          ))}
                      </Box>
                    </Box>
                  )}
                </Box>

                <VotingResultsTable
                  partyBreakdown={selectedVotingDetails.partyBreakdown}
                  memberVotes={selectedVotingDetails.memberVotes}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

// ──────────────────────────── Tab: Puheenvuorot ────────────────────────────

const SpeechesTab: React.FC<{ personId: number }> = ({ personId }) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tComposition } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const [speeches, setSpeeches] = React.useState<SpeechType[] | null>(null);
  const [speechesTotal, setSpeechesTotal] = React.useState<number | null>(null);
  const [selectedSpeech, setSelectedSpeech] = React.useState<SpeechType | null>(
    null,
  );
  const [sectionConversations, setSectionConversations] = React.useState<
    Record<string, SectionConversationType>
  >({});
  const [sectionDetailsByKey, setSectionDetailsByKey] = React.useState<
    Record<string, SectionDetailsType>
  >({});
  const [failedSectionDetailsKeys, setFailedSectionDetailsKeys] =
    React.useState<Record<string, true>>({});
  const [failedContextSections, setFailedContextSections] = React.useState<
    Record<string, true>
  >({});
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [loadingContextSection, setLoadingContextSection] = React.useState<
    string | null
  >(null);
  const [loadingSectionDetailsKey, setLoadingSectionDetailsKey] =
    React.useState<string | null>(null);
  const contextLoadRequestRef = React.useRef(0);
  const sectionDetailsRequestRef = React.useRef(0);
  const selectedSpeechRef = React.useRef<HTMLDivElement | null>(null);
  const [activeSpeechId, setActiveSpeechId] = React.useState<number | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    setLoading(true);
    setLoadError(null);
    setSelectedSpeech(null);
    setActiveSpeechId(null);
    setSectionConversations({});
    setSectionDetailsByKey({});
    setFailedSectionDetailsKeys({});
    setFailedContextSections({});
    setContextError(null);
    setLoadingContextSection(null);
    setLoadingSectionDetailsKey(null);
    fetchPersonSpeeches(personId, 50)
      .then((data) => {
        if (ignore) return;
        setSpeeches(data.speeches);
        setSpeechesTotal(data.total);
      })
      .catch(() => {
        if (ignore) return;
        setLoadError(tComposition("details.speeches.loadError"));
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [personId, tComposition]);

  const loadMoreSpeeches = () => {
    if (!speeches || loadingMore) return;
    setLoadingMore(true);
    fetchPersonSpeeches(personId, 50, speeches.length)
      .then((data) => {
        setSpeeches((prev) => [...(prev ?? []), ...data.speeches]);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const selectedSectionKey = selectedSpeech?.section_key || null;
  const selectedConversation = selectedSectionKey
    ? sectionConversations[selectedSectionKey]
    : null;
  const selectedSectionDetails = selectedSectionKey
    ? sectionDetailsByKey[selectedSectionKey]
    : null;
  const selectedSpeechIndex = selectedConversation
    ? selectedConversation.speeches.findIndex(
        (item) => item.id === activeSpeechId,
      )
    : -1;
  const selectedSpeechPosition =
    selectedSpeechIndex >= 0 ? selectedSpeechIndex + 1 : 0;
  const activeConversationSpeech =
    selectedSpeechIndex >= 0 && selectedConversation
      ? selectedConversation.speeches[selectedSpeechIndex]
      : null;
  const activeSpeechStartTime =
    activeConversationSpeech?.start_time || selectedSpeech?.start_time || null;
  const activeSpeechEndTime =
    activeConversationSpeech?.end_time || selectedSpeech?.end_time || null;
  const activeSpeechType =
    activeConversationSpeech?.speech_type ||
    selectedSpeech?.speech_type ||
    null;
  const activeSpeechParty =
    activeConversationSpeech?.party_abbreviation ||
    selectedSpeech?.party ||
    null;
  const sectionContextTitle =
    selectedSectionDetails?.minutes_item_title ||
    selectedSectionDetails?.title ||
    selectedSpeech?.section_title ||
    null;
  const sectionContextContent =
    selectedSectionDetails?.minutes_content_text ||
    selectedSectionDetails?.resolution ||
    selectedSectionDetails?.note ||
    null;

  React.useEffect(() => {
    if (!selectedSectionKey) return;
    const selectedSpeechId = selectedSpeech?.id;
    const existingConversation = sectionConversations[selectedSectionKey];
    const existingContainsSelectedSpeech =
      selectedSpeechId !== undefined
        ? existingConversation?.speeches.some(
            (speech) => speech.id === selectedSpeechId,
          ) || false
        : true;
    if (
      existingConversation &&
      (!existingConversation.truncated || existingContainsSelectedSpeech)
    )
      return;
    if (failedContextSections[selectedSectionKey]) return;
    if (loadingContextSection === selectedSectionKey) return;

    const requestId = contextLoadRequestRef.current + 1;
    contextLoadRequestRef.current = requestId;
    setContextError(null);
    setLoadingContextSection(selectedSectionKey);
    fetchSectionConversation(selectedSectionKey, selectedSpeechId)
      .then((data) => {
        if (contextLoadRequestRef.current !== requestId) return;
        setSectionConversations((prev) => ({
          ...prev,
          [selectedSectionKey]: data,
        }));
        if (
          selectedSpeechId !== undefined &&
          !data.speeches.some((speech) => speech.id === selectedSpeechId)
        ) {
          setFailedContextSections((prev) => ({
            ...prev,
            [selectedSectionKey]: true,
          }));
          setContextError(
            tComposition("details.speeches.missingSpeechInThread"),
          );
        }
      })
      .catch(() => {
        if (contextLoadRequestRef.current !== requestId) return;
        setFailedContextSections((prev) => ({
          ...prev,
          [selectedSectionKey]: true,
        }));
        setContextError(tComposition("details.speeches.contextLoadError"));
      })
      .finally(() => {
        if (contextLoadRequestRef.current !== requestId) return;
        setLoadingContextSection((current) =>
          current === selectedSectionKey ? null : current,
        );
      });
  }, [
    selectedSectionKey,
    selectedSpeech?.id,
    sectionConversations,
    failedContextSections,
    loadingContextSection,
    tComposition,
  ]);

  React.useEffect(() => {
    if (!selectedSectionKey) return;
    if (selectedSectionDetails) return;
    if (failedSectionDetailsKeys[selectedSectionKey]) return;
    if (loadingSectionDetailsKey === selectedSectionKey) return;

    const requestId = sectionDetailsRequestRef.current + 1;
    sectionDetailsRequestRef.current = requestId;
    setLoadingSectionDetailsKey(selectedSectionKey);
    fetchSectionDetails(selectedSectionKey)
      .then((data) => {
        if (sectionDetailsRequestRef.current !== requestId) return;
        setSectionDetailsByKey((prev) => ({
          ...prev,
          [selectedSectionKey]: data,
        }));
      })
      .catch(() => {
        if (sectionDetailsRequestRef.current !== requestId) return;
        setFailedSectionDetailsKeys((prev) => ({
          ...prev,
          [selectedSectionKey]: true,
        }));
      })
      .finally(() => {
        if (sectionDetailsRequestRef.current !== requestId) return;
        setLoadingSectionDetailsKey((current) =>
          current === selectedSectionKey ? null : current,
        );
      });
  }, [
    selectedSectionKey,
    selectedSectionDetails,
    failedSectionDetailsKeys,
    loadingSectionDetailsKey,
  ]);

  React.useEffect(() => {
    if (!selectedSpeechRef.current) return;
    selectedSpeechRef.current.scrollIntoView({ block: "center" });
  }, [activeSpeechId, selectedConversation?.speeches.length]);

  const openSpeechConversation = (speech: SpeechType) => {
    setSelectedSpeech(speech);
    setActiveSpeechId(speech.id);
    if (!speech.section_key) {
      setContextError(tComposition("details.speeches.missingSectionKey"));
      return;
    }
    setContextError(null);
  };

  const closeSpeechConversation = () => {
    setSelectedSpeech(null);
    setActiveSpeechId(null);
    setContextError(null);
    setLoadingContextSection(null);
    setLoadingSectionDetailsKey(null);
  };

  const selectSpeechInConversation = (speechId: number) => {
    setActiveSpeechId(speechId);
    setContextError(null);
  };

  const retryContextLoad = () => {
    if (!selectedSectionKey) return;
    setContextError(null);
    setFailedContextSections((prev) => {
      const { [selectedSectionKey]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const formatSpeechDate = (value: string | null) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("fi-FI");
  };

  const formatSpeechTime = (start: string | null, end: string | null) => {
    if (!start) return "-";
    const startLabel = new Date(start).toLocaleTimeString("fi-FI", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!end) return startLabel;
    const endLabel = new Date(end).toLocaleTimeString("fi-FI", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${startLabel} - ${endLabel}`;
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  if (loadError) {
    return (
      <Typography
        variant="body2"
        sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
      >
        {loadError}
      </Typography>
    );
  }

  const totalWords =
    speeches?.reduce((sum, s) => sum + (s.word_count || 0), 0) || 0;

  return (
    <Box>
      {/* Metrics */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {speechesTotal ?? 0}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {tComposition("details.speeches.count")}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {totalWords > 1000
              ? `${(totalWords / 1000).toFixed(1)}k`
              : totalWords}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {tComposition("details.speeches.totalWords")}
          </Typography>
        </Box>
      </Box>

      {/* Speech list */}
      {speeches && speeches.length > 0 ? (
        <Box sx={{ maxHeight: 500, overflowY: "auto" }}>
          {speeches.map((s) => (
            <Box
              key={s.id}
              sx={{
                py: 1.5,
                borderBottom: `1px solid ${themedColors.dataBorder}`,
                "&:last-child": { borderBottom: "none" },
                borderRadius: 1,
                px: 1,
                cursor: "pointer",
                "&:hover": {
                  bgcolor: themedColors.backgroundPaper,
                },
              }}
              onClick={() => openSpeechConversation(s)}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 0.5,
                }}
              >
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Typography
                    variant="caption"
                    fontWeight="600"
                    sx={{ color: themedColors.textSecondary }}
                  >
                    {formatSpeechDate(s.start_time)}
                  </Typography>
                  {s.speech_type && (
                    <Chip
                      label={s.speech_type}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        bgcolor: `${colors.primaryLight}15`,
                        color: colors.primaryLight,
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textTertiary }}
                >
                  {s.word_count} {tComposition("details.speeches.words")}
                </Typography>
              </Box>
              {s.content && (
                <Typography
                  variant="body2"
                  sx={{
                    color: themedColors.textPrimary,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.5,
                  }}
                >
                  {s.content}
                </Typography>
              )}
              {s.document && (
                <Typography
                  variant="caption"
                  sx={{
                    color: themedColors.textTertiary,
                    mt: 0.25,
                    display: "block",
                  }}
                >
                  {s.document}
                </Typography>
              )}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 0.75,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textTertiary }}
                >
                  {s.section_identifier ||
                    s.section_title ||
                    tComposition("details.speeches.noSectionTitle")}
                </Typography>
                <Button
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    openSpeechConversation(s);
                  }}
                  sx={{
                    minWidth: 0,
                    px: 1,
                    py: 0,
                    fontSize: "0.68rem",
                    textTransform: "none",
                  }}
                >
                  {tComposition("details.speeches.showConversation")}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography
          variant="body2"
          sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
        >
          {tComposition("details.speeches.noData")}
        </Typography>
      )}

      {speeches &&
        speechesTotal !== null &&
        speeches.length < speechesTotal && (
          <Box sx={{ textAlign: "center", mt: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={loadMoreSpeeches}
              disabled={loadingMore}
              startIcon={
                loadingMore ? <CircularProgress size={14} /> : undefined
              }
            >
              {tComposition("details.speeches.loadMore", {
                loaded: speeches.length,
                total: speechesTotal,
              })}
            </Button>
          </Box>
        )}

      <Drawer
        anchor="right"
        open={Boolean(selectedSpeech)}
        onClose={closeSpeechConversation}
        sx={{ zIndex: theme.zIndex.modal + 2 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 560 },
            bgcolor: themedColors.backgroundSubtle,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderBottom: `1px solid ${themedColors.dataBorder}`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ color: themedColors.textPrimary }}
                >
                  {tComposition("details.speeches.drawer.title")}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textSecondary }}
                >
                  {selectedSpeech
                    ? formatSpeechDate(activeSpeechStartTime)
                    : "-"}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={closeSpeechConversation}
                aria-label={tComposition("details.speeches.drawer.closeAria")}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {selectedSpeech && (
              <>
                <Typography
                  variant="body2"
                  sx={{ color: themedColors.textSecondary, mt: 1 }}
                >
                  {selectedSpeech.document ||
                    tComposition("details.speeches.drawer.missingDocument")}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.75,
                    mt: 1,
                    alignItems: "center",
                  }}
                >
                  {activeSpeechParty && (
                    <Chip
                      size="small"
                      label={activeSpeechParty?.toUpperCase()}
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                      }}
                    />
                  )}
                  <Chip
                    size="small"
                    label={formatSpeechTime(
                      activeSpeechStartTime,
                      activeSpeechEndTime,
                    )}
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                    }}
                  />
                  {activeSpeechType && (
                    <Chip
                      size="small"
                      label={activeSpeechType}
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                      }}
                    />
                  )}
                </Box>
                {selectedSectionKey &&
                  loadingSectionDetailsKey === selectedSectionKey &&
                  !selectedSectionDetails && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: themedColors.textTertiary,
                        mt: 1,
                        display: "block",
                      }}
                    >
                      {tComposition(
                        "details.speeches.drawer.loadingSectionContent",
                      )}
                    </Typography>
                  )}
                {sectionContextContent && (
                  <Box
                    sx={{
                      mt: 1.25,
                      p: 1.25,
                      borderRadius: 1.5,
                      border: `1px solid ${themedColors.dataBorder}`,
                      bgcolor: themedColors.backgroundPaper,
                      maxHeight: { xs: "22vh", sm: "18vh" },
                      overflowY: "auto",
                    }}
                  >
                    {sectionContextTitle && (
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{
                          color: themedColors.textSecondary,
                          display: "block",
                          mb: 0.5,
                        }}
                      >
                        {sectionContextTitle}
                      </Typography>
                    )}
                    <RichTextRenderer
                      document={sectionContextContent}
                      fallbackText={sectionContextContent}
                      paragraphVariant="body2"
                      compact
                      sx={{
                        whiteSpace: "pre-line",
                        "& .MuiTypography-root": {
                          color: themedColors.textPrimary,
                          lineHeight: 1.45,
                        },
                      }}
                    />
                  </Box>
                )}
                {selectedSpeech.section_key && (
                  <Button
                    href={refs.section(
                      selectedSpeech.section_key,
                      selectedSpeech.start_time,
                      selectedSpeech.session_key,
                    )}
                    endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      mt: 1.25,
                      textTransform: "none",
                      px: 1.25,
                      py: 0.5,
                      minWidth: 0,
                      alignSelf: "flex-start",
                    }}
                  >
                    {tComposition("details.speeches.drawer.openSection")}
                  </Button>
                )}
              </>
            )}
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              p: { xs: 2, sm: 2.5 },
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ color: themedColors.textPrimary, mb: 1 }}
            >
              {tComposition("details.speeches.drawer.conversationHeading")}
            </Typography>
            {selectedSectionKey &&
              loadingContextSection === selectedSectionKey && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={26} />
                </Box>
              )}

            {contextError && (
              <Box sx={{ py: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ color: themedColors.textTertiary }}
                >
                  {contextError}
                </Typography>
                {selectedSectionKey &&
                  failedContextSections[selectedSectionKey] && (
                    <Button
                      size="small"
                      onClick={retryContextLoad}
                      sx={{
                        mt: 0.75,
                        px: 1,
                        py: 0,
                        minWidth: 0,
                        textTransform: "none",
                        fontSize: "0.72rem",
                      }}
                    >
                      {tCommon("retry")}
                    </Button>
                  )}
              </Box>
            )}

            {selectedConversation && (
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textSecondary }}
                >
                  {tComposition("details.speeches.drawer.conversationSummary", {
                    current: selectedSpeechPosition,
                    total: selectedConversation.total,
                  })}
                </Typography>
                {selectedConversation.truncated && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: themedColors.textTertiary,
                      display: "block",
                      mt: 0.5,
                    }}
                  >
                    {tComposition("details.speeches.drawer.truncatedNotice", {
                      shown: selectedConversation.speeches.length,
                      total: selectedConversation.total,
                    })}
                  </Typography>
                )}
                <Box sx={{ mt: 1.5 }}>
                  {selectedConversation.speeches.map((speech) => {
                    const isSelected = speech.id === activeSpeechId;
                    const isSelectedPersonSpeech =
                      speech.person_id === personId;
                    return (
                      <Box
                        key={speech.id}
                        ref={isSelected ? selectedSpeechRef : null}
                        onClick={() => selectSpeechInConversation(speech.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectSpeechInConversation(speech.id);
                          }
                        }}
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          mb: 1.25,
                          cursor: "pointer",
                          border: `1px solid ${
                            isSelected
                              ? colors.primaryLight
                              : isSelectedPersonSpeech
                                ? colors.success
                                : themedColors.dataBorder
                          }`,
                          bgcolor: isSelected
                            ? `${colors.primaryLight}10`
                            : isSelectedPersonSpeech
                              ? `${colors.success}12`
                              : themedColors.backgroundPaper,
                          "&:hover": {
                            borderColor: isSelectedPersonSpeech
                              ? colors.success
                              : colors.primaryLight,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 1,
                            alignItems: "center",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: themedColors.textPrimary }}
                          >
                            {speech.first_name} {speech.last_name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: themedColors.textSecondary }}
                          >
                            {formatSpeechTime(
                              speech.start_time,
                              speech.end_time,
                            )}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                            mb: 0.75,
                          }}
                        >
                          {speech.party_abbreviation && (
                            <Chip
                              size="small"
                              label={speech.party_abbreviation.toUpperCase()}
                              sx={{ height: 18, fontSize: "0.62rem" }}
                            />
                          )}
                          {speech.speech_type && (
                            <Chip
                              size="small"
                              label={speech.speech_type}
                              sx={{ height: 18, fontSize: "0.62rem" }}
                            />
                          )}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            color: themedColors.textPrimary,
                            lineHeight: 1.5,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {speech.content ||
                            tComposition("details.speeches.drawer.noContent")}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

// ─────────────────────────── Tab: Kysymykset ─────────────────────────────

const QuestionsTab: React.FC<{ personId: number }> = ({ personId }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const [questions, setQuestions] = React.useState<PersonQuestionType[] | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetchPersonQuestions(personId)
      .then((data) => {
        if (ignore) return;
        setQuestions(data);
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [personId]);

  const groupedQuestions = React.useMemo(
    () => ({
      interpellation:
        questions?.filter((q) => q.question_kind === "interpellation") || [],
      oral_question:
        questions?.filter((q) => q.question_kind === "oral_question") || [],
      written_question:
        questions?.filter((q) => q.question_kind === "written_question") || [],
    }),
    [questions],
  );

  const roleLabelByKey: Record<PersonQuestionType["relation_role"], string> = {
    asker: t("details.questions.role.asker"),
    first_signer: t("details.questions.role.firstSigner"),
    signer: t("details.questions.role.signer"),
  };

  const totalQuestions = questions?.length || 0;
  const interpellationsCount = groupedQuestions.interpellation.length;
  const oralQuestionsCount = groupedQuestions.oral_question.length;
  const writtenQuestionsCount = groupedQuestions.written_question.length;

  const renderQuestionList = (
    items: PersonQuestionType[],
    emptyText: string,
  ) => {
    if (items.length === 0) {
      return (
        <Typography
          variant="body2"
          sx={{
            color: themedColors.textTertiary,
            py: 1.5,
          }}
        >
          {emptyText}
        </Typography>
      );
    }

    return (
      <Box>
        {items.map((item) => (
          <Box
            key={`${item.question_kind}-${item.id}`}
            sx={{
              py: 1.25,
              borderBottom: `1px solid ${themedColors.dataBorder}`,
              "&:last-child": { borderBottom: "none" },
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              alignItems: "flex-start",
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body2"
                sx={{ color: themedColors.textPrimary }}
              >
                {item.title || item.parliament_identifier}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: themedColors.textSecondary, display: "block" }}
              >
                {item.parliament_identifier}
                {item.submission_date
                  ? ` - ${displayDate(item.submission_date)}`
                  : ""}
              </Typography>
            </Box>
            <Chip
              label={roleLabelByKey[item.relation_role]}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                flexShrink: 0,
                bgcolor:
                  item.relation_role === "asker"
                    ? `${colors.primaryLight}20`
                    : item.relation_role === "first_signer"
                      ? `${colors.success}20`
                      : `${colors.neutral}20`,
                color:
                  item.relation_role === "asker"
                    ? colors.primaryLight
                    : item.relation_role === "first_signer"
                      ? colors.success
                      : colors.neutral,
              }}
            />
          </Box>
        ))}
      </Box>
    );
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {totalQuestions}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {t("details.questions.total", {
              count: totalQuestions,
            })}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {interpellationsCount}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {t("details.questions.interpellations", {
              count: interpellationsCount,
            })}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {oralQuestionsCount}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {t("details.questions.oralQuestions", {
              count: oralQuestionsCount,
            })}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {writtenQuestionsCount}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {t("details.questions.writtenQuestions", {
              count: writtenQuestionsCount,
            })}
          </Typography>
        </Box>
      </Box>

      <SectionLabel
        icon={
          <AccountBalanceIcon
            sx={{ color: colors.primaryLight, fontSize: 20 }}
          />
        }
        label={t("details.questions.interpellationsSection", {
          count: interpellationsCount,
        })}
      />
      {renderQuestionList(
        groupedQuestions.interpellation,
        t("details.questions.noInterpellations"),
      )}

      <SectionLabel
        icon={<MicIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />}
        label={t("details.questions.oralQuestionsSection", {
          count: oralQuestionsCount,
        })}
      />
      {renderQuestionList(
        groupedQuestions.oral_question,
        t("details.questions.noOralQuestions"),
      )}

      <SectionLabel
        icon={<EmailIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />}
        label={t("details.questions.writtenQuestionsSection", {
          count: writtenQuestionsCount,
        })}
      />
      {renderQuestionList(
        groupedQuestions.written_question,
        t("details.questions.noWrittenQuestions"),
      )}
    </Box>
  );
};

// ──────────────────────── Tab: Luottamustehtavat ──────────────────────────

const PositionsTab: React.FC<{
  personId: number;
  trustPositions: DatabaseTables.TrustPosition[];
  governmentMemberships: DatabaseTables.GovernmentMembership[];
}> = ({ personId, trustPositions, governmentMemberships }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const [committees, setCommittees] = React.useState<CommitteeType[] | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchPersonCommittees(personId).then((data) => {
      setCommittees(data);
      setLoading(false);
    });
  }, [personId]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  return (
    <Box>
      {/* Committees */}
      {committees && committees.length > 0 && (
        <>
          <SectionLabel
            icon={
              <GroupsIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />
            }
            label={t("details.positions.committeesTitle", {
              count: committees.length,
            })}
          />
          <List dense sx={{ p: 0, mb: 2 }}>
            {committees.map((c) => (
              <ListItem key={c.id} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  disableTypography
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ color: themedColors.textPrimary }}
                      >
                        {c.committee_name}
                      </Typography>
                      {c.role && (
                        <Chip
                          label={c.role}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.65rem",
                            bgcolor: `${colors.primaryLight}15`,
                            color: colors.primaryLight,
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {displayDate(c.start_date, t("details.ongoing"))} -{" "}
                      {displayDate(c.end_date, t("details.ongoing"))}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Government Memberships */}
      {governmentMemberships && governmentMemberships.length > 0 && (
        <>
          <SectionLabel
            icon={
              <AccountBalanceIcon
                sx={{ color: colors.primaryLight, fontSize: 20 }}
              />
            }
            label={t("details.positions.governmentPositionsTitle", {
              count: governmentMemberships.length,
            })}
          />
          <List dense sx={{ p: 0, mb: 2 }}>
            {governmentMemberships.map((gm, i) => (
              <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  disableTypography
                  primary={
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ color: themedColors.textPrimary }}
                      >
                        {gm.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: themedColors.textSecondary }}
                      >
                        {gm.government}
                        {gm.ministry && ` - ${gm.ministry}`}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {displayDate(gm.start_date, t("details.ongoing"))} -{" "}
                      {displayDate(gm.end_date, t("details.ongoing"))}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Trust Positions */}
      {trustPositions && trustPositions.length > 0 && (
        <>
          <SectionLabel
            icon={
              <WorkIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />
            }
            label={t("details.positions.otherPositionsTitle", {
              count: trustPositions.length,
            })}
          />
          <List dense sx={{ p: 0 }}>
            {trustPositions.map((tp, i) => (
              <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  disableTypography
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{ color: themedColors.textPrimary }}
                    >
                      {tp.name}
                      {tp.position_type && (
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: themedColors.textSecondary, ml: 1 }}
                        >
                          ({tp.position_type})
                        </Typography>
                      )}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {tp.period}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {(!committees || committees.length === 0) &&
        (!governmentMemberships || governmentMemberships.length === 0) &&
        (!trustPositions || trustPositions.length === 0) && (
          <Typography
            variant="body2"
            sx={{
              color: themedColors.textTertiary,
              textAlign: "center",
              py: 4,
            }}
          >
            {t("details.positions.noData")}
          </Typography>
        )}
    </Box>
  );
};

// ──────────────────────────── Main Component ────────────────────────────

export const RepresentativeDetails: React.FC<{
  open: boolean;
  onClose: () => void;
  selectedRepresentative: DatabaseQueries.GetParliamentComposition | null;
  selectedDate: string;
}> = ({ open, onClose, selectedRepresentative, selectedDate }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [tabIndex, setTabIndex] = React.useState(0);

  const [details, setDetails] =
    React.useState<Awaited<ReturnType<typeof fetchPersonDetails>>>();

  React.useEffect(() => {
    if (selectedRepresentative) {
      setDetails(undefined);
      setTabIndex(0);
      fetchPersonDetails(selectedRepresentative.person_id).then(setDetails);
    } else {
      setDetails(undefined);
    }
  }, [selectedRepresentative]);

  if (!selectedRepresentative) return null;

  const currentParty =
    details?.groupMemberships?.[0]?.group_name || t("details.unknownParty");
  const currentDistrict =
    details?.districts?.[0]?.district_name || t("details.unknownDistrict");

  const selectedDateObj = new Date(selectedDate);
  const deathDateObj = selectedRepresentative.death_date
    ? new Date(selectedRepresentative.death_date)
    : null;
  const wasAliveOnSelectedDate =
    !deathDateObj || selectedDateObj <= deathDateObj;
  const effectiveDate = wasAliveOnSelectedDate
    ? selectedDate
    : selectedRepresentative.death_date!;
  const age = selectedRepresentative.birth_date
    ? calculateAge(selectedRepresentative.birth_date, effectiveDate)
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          maxHeight: isMobile ? "100vh" : "90vh",
        },
      }}
    >
      {details?.representativeDetails === undefined ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Header - clean, no gradient */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              bgcolor: colors.primary,
              borderRadius: isMobile ? 0 : "12px 12px 0 0",
            }}
          >
            <Box sx={{ position: "relative", p: { xs: 2, sm: 2.5 } }}>
              <IconButton
                onClick={onClose}
                sx={{
                  position: "absolute",
                  top: { xs: 8, sm: 12 },
                  right: { xs: 8, sm: 12 },
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.1)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                }}
              >
                <CloseIcon />
              </IconButton>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1.5, sm: 2 },
                  pr: { xs: 4, sm: 0 },
                }}
              >
                <Avatar
                  sx={{
                    width: { xs: 48, sm: 56 },
                    height: { xs: 48, sm: 56 },
                    background: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontSize: { xs: 18, sm: 22 },
                    fontWeight: 700,
                    border: "2px solid rgba(255,255,255,0.2)",
                    flexShrink: 0,
                  }}
                >
                  {selectedRepresentative.first_name[0]}
                  {selectedRepresentative.last_name[0]}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    fontWeight="700"
                    sx={{ color: "white", lineHeight: 1.3 }}
                  >
                    {selectedRepresentative.first_name}{" "}
                    {selectedRepresentative.last_name}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexWrap: "wrap",
                      alignItems: "center",
                      mt: 0.5,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {currentParty}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      |
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {currentDistrict}
                    </Typography>
                    {age && (
                      <>
                        <Typography
                          variant="body2"
                          sx={{ color: "rgba(255,255,255,0.5)" }}
                        >
                          |
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "rgba(255,255,255,0.85)" }}
                        >
                          {age} {t("details.years")}
                        </Typography>
                      </>
                    )}
                    <Chip
                      label={
                        selectedRepresentative.is_in_government === 1
                          ? t("details.header.government")
                          : t("details.header.opposition")
                      }
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        bgcolor:
                          selectedRepresentative.is_in_government === 1
                            ? "rgba(76, 175, 80, 0.25)"
                            : "rgba(255, 152, 0, 0.25)",
                        color: "white",
                        border:
                          selectedRepresentative.is_in_government === 1
                            ? "1px solid rgba(76, 175, 80, 0.5)"
                            : "1px solid rgba(255, 152, 0, 0.5)",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 40,
                px: 1,
                "& .MuiTab-root": {
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  minHeight: 40,
                  textTransform: "none",
                  py: 0,
                  "&.Mui-selected": { color: "white" },
                },
                "& .MuiTabs-indicator": {
                  bgcolor: "white",
                  height: 2,
                },
              }}
            >
              <Tab
                label={t("details.tabs.overview")}
                icon={<PersonIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                label={t("details.tabs.votes")}
                icon={<HowToVoteIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                label={t("details.tabs.speeches")}
                icon={<MicIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                label={t("details.tabs.questions")}
                icon={<QuizIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                label={t("details.tabs.positions")}
                icon={<WorkIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <DialogContent
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: themedColors.backgroundSubtle,
              overflowY: "auto",
            }}
          >
            {tabIndex === 0 && details && <OverviewTab details={details} />}
            {tabIndex === 1 && (
              <VotesTab personId={selectedRepresentative.person_id} />
            )}
            {tabIndex === 2 && (
              <SpeechesTab personId={selectedRepresentative.person_id} />
            )}
            {tabIndex === 3 && (
              <QuestionsTab personId={selectedRepresentative.person_id} />
            )}
            {tabIndex === 4 && details && (
              <PositionsTab
                personId={selectedRepresentative.person_id}
                trustPositions={details.trustPositions || []}
                governmentMemberships={details.governmentMemberships || []}
              />
            )}
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};
