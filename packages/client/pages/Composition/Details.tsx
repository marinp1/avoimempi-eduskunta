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
import SearchIcon from "@mui/icons-material/Search";
import WorkIcon from "@mui/icons-material/Work";
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
import React from "react";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { SourceText } from "#client/components/SourceText";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import theme, { borderRadius, colors } from "#client/theme";
import { MetricCard, VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { isSafeExternalUrl } from "#client/utils/eduskunta-links";
import { apiFetch } from "#client/utils/fetch";
import { warnInDevelopment } from "#client/utils/request-errors";

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

const detailMetricCardSx = {
  borderRadius: {
    xs: `${borderRadius.md * 8}px`,
    sm: `${borderRadius.md * 8}px`,
  },
} as const;

type GovernmentPeriod = {
  government_name: string;
  government_start_date: string;
  government_end_date: string | null;
  is_coalition: 0 | 1;
};

type GovernmentVoteStat = {
  governmentName: string;
  governmentStartDate: string;
  governmentEndDate: string | null;
  isCoalition: boolean;
  yes: number;
  no: number;
  abstain: number;
  absent: number;
  total: number;
};

type RepresentativeAnalysisScope = {
  selectedGovernmentName: string | null;
  selectedGovernmentPeriod: GovernmentPeriod | null;
};

type VoteSortValue = "newest" | "oldest";
type SpeechSortValue = "newest" | "oldest" | "longest";
type InitiativeSortValue = "newest" | "oldest";

const visuallyHiddenSx = {
  position: "absolute",
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

const fetchPersonDetails = async (personId: number, signal?: AbortSignal) => {
  const jsonOrThrow = async <T,>(
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

export type RepresentativeSelection = {
  personId: number;
  summary?: {
    firstName?: string;
    lastName?: string;
    partyName?: string | null;
    isInGovernment?: 0 | 1 | null;
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
  signal?: AbortSignal,
) => {
  const res = await apiFetch(
    `/api/person/${personId}/speeches?limit=${limit}&offset=${offset}`,
    { signal },
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
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
  signal?: AbortSignal,
) => {
  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  signal?.addEventListener("abort", abortRequest, { once: true });
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    SECTION_SPEECH_REQUEST_TIMEOUT_MS,
  );
  const res = await apiFetch(
    `/api/sections/${encodeURIComponent(sectionKey)}/speeches?limit=${limit}&offset=${offset}`,
    { signal: controller.signal },
  ).finally(() => {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortRequest);
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

const fetchSectionDetails = async (
  sectionKey: string,
  signal?: AbortSignal,
) => {
  const res = await apiFetch(
    `/api/sections/${encodeURIComponent(sectionKey)}`,
    {
      signal,
    },
  );
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

const fetchSectionConversation = async (
  sectionKey: string,
  targetSpeechId?: number,
  signal?: AbortSignal,
): Promise<SectionConversationType> => {
  const startedAt = Date.now();
  let page = 1;
  let totalPages = 1;
  let offset = 0;
  let total = 0;
  const speeches: SectionSpeechType[] = [];
  let targetSpeechIncluded = targetSpeechId === undefined;

  while (
    !signal?.aborted &&
    page <= totalPages &&
    page <= SECTION_SPEECH_TARGET_SEEK_MAX_PAGES &&
    Date.now() - startedAt < SECTION_SPEECH_TOTAL_FETCH_TIMEOUT_MS
  ) {
    const data = await fetchSectionSpeechesPage(
      sectionKey,
      SECTION_SPEECH_PAGE_SIZE,
      offset,
      signal,
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

const DAY_MS = 86_400_000;

const TIMELINE_BAR_H = 42;
const TIMELINE_MIN_SEGMENT_W = 72;
const TIMELINE_MIN_WIDTH = 520;

const formatGovernmentYearRange = (
  startDate: string,
  endDate: string | null,
) => {
  const startYear = new Date(startDate).getFullYear();
  const endYear = endDate ? new Date(endDate).getFullYear() : "";
  return `${startYear}–${endYear}`;
};

const formatGovernmentShortName = (governmentName: string) =>
  governmentName.replace(/\s+hallitus$/i, "").trim();

const truncateGovernmentName = (governmentName: string, maxLength = 18) => {
  const shortName = formatGovernmentShortName(governmentName);
  if (shortName.length <= maxLength) return shortName;
  return `${shortName.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const GovernmentTimelineFilter: React.FC<{
  governments: GovernmentPeriod[];
  selectedGovName: string | null;
  onSelect: (governmentName: string | null) => void;
}> = ({ governments, selectedGovName, onSelect }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const orderedGovernments = React.useMemo(
    () =>
      [...governments].sort(
        (a, b) =>
          new Date(a.government_start_date).getTime() -
          new Date(b.government_start_date).getTime(),
      ),
    [governments],
  );

  if (orderedGovernments.length === 0) return null;

  const nowMs = Date.now();
  const startMs = new Date(
    orderedGovernments[0].government_start_date,
  ).getTime();
  const endMs = orderedGovernments.reduce((latest, gov) => {
    return Math.max(
      latest,
      new Date(gov.government_end_date ?? nowMs).getTime(),
    );
  }, startMs + DAY_MS);
  const totalSpan = Math.max(endMs - startMs, DAY_MS);
  const selectedGovernment =
    orderedGovernments.find((gov) => gov.government_name === selectedGovName) ??
    null;

  const minSegmentW = isMobile ? 48 : TIMELINE_MIN_SEGMENT_W;
  const minTimelineWidth = Math.max(
    isMobile ? TIMELINE_MIN_WIDTH - 80 : TIMELINE_MIN_WIDTH,
    orderedGovernments.length * minSegmentW,
  );

  const toDuration = (gov: GovernmentPeriod) =>
    Math.max(
      DAY_MS,
      new Date(gov.government_end_date ?? nowMs).getTime() -
        new Date(gov.government_start_date).getTime(),
    );

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px solid ${themedColors.dataBorder}`,
        bgcolor: themedColors.backgroundSubtle,
        p: 1.25,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
          mb: 1,
        }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary, display: "block" }}
          >
            {t("details.analysis.governmentPeriodLabel")}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
          >
            {selectedGovernment
              ? selectedGovernment.government_name
              : t("details.votes.allGovernments")}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={
            selectedGovernment
              ? formatGovernmentYearRange(
                  selectedGovernment.government_start_date,
                  selectedGovernment.government_end_date,
                )
              : t("details.analysis.scopeAll")
          }
          sx={{
            height: 24,
            fontWeight: 700,
            bgcolor: themedColors.backgroundPaper,
            color: selectedGovernment
              ? colors.primaryLight
              : themedColors.textSecondary,
            border: `1px solid ${
              selectedGovernment
                ? `${colors.primaryLight}30`
                : themedColors.dataBorder
            }`,
          }}
        />
      </Box>

      <Box
        sx={{
          overflowX: "auto",
          pb: 0.5,
          scrollbarWidth: "thin",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "stretch",
            gap: 0.5,
            minWidth: minTimelineWidth + 120,
            p: 0.5,
            borderRadius: 1.75,
            border: `1px solid ${themedColors.dataBorder}`,
            bgcolor: themedColors.backgroundSubtle,
          }}
        >
          <ButtonBase
            component="button"
            onClick={() => onSelect(null)}
            aria-pressed={selectedGovName === null}
            aria-label={t("details.votes.allGovernments")}
            sx={{
              height: TIMELINE_BAR_H,
              minWidth: 112,
              px: 1.4,
              fontSize: "0.75rem",
              fontWeight: 700,
              flexShrink: 0,
              borderRadius: 1.25,
              border: `1px solid ${
                selectedGovName === null
                  ? `${colors.primaryLight}30`
                  : "transparent"
              }`,
              bgcolor:
                selectedGovName === null
                  ? themedColors.backgroundPaper
                  : "transparent",
              color:
                selectedGovName === null
                  ? themedColors.textPrimary
                  : themedColors.textSecondary,
              boxShadow:
                selectedGovName === null
                  ? "0 1px 2px rgba(15, 23, 42, 0.08)"
                  : "none",
              whiteSpace: "nowrap",
              "&:hover": {
                bgcolor: themedColors.backgroundPaper,
                color: themedColors.textPrimary,
              },
              "&:focus-visible": {
                outline: `2px solid ${colors.primary}`,
                outlineOffset: 2,
              },
            }}
          >
            {t("details.votes.allGovernments")}
          </ButtonBase>

          <Box
            sx={{
              display: "flex",
              alignItems: "stretch",
              flexShrink: 0,
              minWidth: minTimelineWidth,
              height: TIMELINE_BAR_H,
              gap: 0.5,
            }}
          >
            {orderedGovernments.map((gov) => {
              const duration = toDuration(gov);
              const isSelected = selectedGovName === gov.government_name;
              const widthPct = Math.max((duration / totalSpan) * 100, 8);
              const compactName = truncateGovernmentName(
                gov.government_name,
                isMobile || widthPct < 14 ? 10 : 18,
              );

              return (
                <ButtonBase
                  key={gov.government_name}
                  component="button"
                  title={`${gov.government_name} · ${formatGovernmentYearRange(
                    gov.government_start_date,
                    gov.government_end_date,
                  )}`}
                  aria-label={`${gov.government_name} ${formatGovernmentYearRange(
                    gov.government_start_date,
                    gov.government_end_date,
                  )}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(gov.government_name)}
                  sx={{
                    flexGrow: duration,
                    flexBasis: 0,
                    minWidth: minSegmentW,
                    position: "relative",
                    px: widthPct < 14 ? 0.75 : 1.1,
                    py: 0.75,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    transition:
                      "background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease",
                    borderRadius: 1.25,
                    border: `1px solid ${
                      isSelected ? `${colors.primaryLight}30` : "transparent"
                    }`,
                    bgcolor: isSelected
                      ? themedColors.backgroundPaper
                      : "transparent",
                    color: isSelected
                      ? themedColors.textPrimary
                      : themedColors.textSecondary,
                    opacity: selectedGovName === null || isSelected ? 1 : 0.84,
                    boxShadow: isSelected
                      ? "0 1px 2px rgba(15, 23, 42, 0.08)"
                      : "none",
                    "&:hover": {
                      opacity: 1,
                      bgcolor: themedColors.backgroundPaper,
                      color: themedColors.textPrimary,
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${colors.primary}`,
                      outlineOffset: -2,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.15,
                      overflow: "hidden",
                      px: 0.25,
                      width: "100%",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        letterSpacing: "0.01em",
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatGovernmentYearRange(
                        gov.government_start_date,
                        gov.government_end_date,
                      )}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: widthPct < 14 ? "0.58rem" : "0.64rem",
                        fontWeight: 700,
                        lineHeight: 1,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {compactName}
                    </Typography>
                  </Box>
                  {isSelected ? (
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 2,
                        borderRadius: 1,
                        border: `1px solid rgba(255,255,255,0.72)`,
                        pointerEvents: "none",
                      }}
                    />
                  ) : null}
                </ButtonBase>
              );
            })}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          mt: 1,
          display: "flex",
          gap: 0.75,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {selectedGovernment ? (
          <>
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary }}
            >
              {selectedGovernment.government_name} ·{" "}
              {formatGovernmentYearRange(
                selectedGovernment.government_start_date,
                selectedGovernment.government_end_date,
              )}
            </Typography>
            <Chip
              size="small"
              label={
                selectedGovernment.is_coalition
                  ? t("details.votes.coalition")
                  : t("details.votes.opposition")
              }
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: selectedGovernment.is_coalition
                  ? `${themedColors.coalitionColor}15`
                  : `${themedColors.oppositionColor}15`,
                color: selectedGovernment.is_coalition
                  ? themedColors.coalitionColor
                  : themedColors.oppositionColor,
              }}
            />
          </>
        ) : (
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {t("details.analysis.selectGovernmentHint")}
          </Typography>
        )}
      </Box>
    </Box>
  );
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

const isWithinGovernmentPeriod = (
  value: string | null | undefined,
  period: GovernmentPeriod | null,
) => {
  if (!period || !value) return true;
  const itemMs = new Date(value).getTime();
  const startMs = new Date(period.government_start_date).getTime();
  const endMs = new Date(
    period.government_end_date ?? new Date().toISOString(),
  ).getTime();
  return itemMs >= startMs && itemMs <= endMs;
};

const getTenureRange = (
  memberships:
    | Awaited<ReturnType<typeof fetchPersonDetails>>["groupMemberships"]
    | undefined,
) => {
  if (!memberships || memberships.length === 0) return null;
  const ordered = [...memberships].sort((a, b) =>
    a.start_date < b.start_date ? -1 : 1,
  );
  return {
    start: ordered[0]?.start_date ?? null,
    end: ordered[ordered.length - 1]?.end_date ?? null,
  };
};

const getYearsBetween = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(
    0,
    Math.floor((end.getTime() - start.getTime()) / DAY_MS / 365.25),
  );
};

const tabA11yProps = (index: number) => ({
  id: `representative-tab-${index}`,
  "aria-controls": `representative-tabpanel-${index}`,
});

const ResultCountAnnouncer: React.FC<{ message: string }> = ({ message }) => (
  <Box aria-live="polite" role="status" sx={visuallyHiddenSx}>
    {message}
  </Box>
);

const AnalysisTabPanel: React.FC<{
  children: React.ReactNode;
  value: number;
  index: number;
}> = ({ children, value, index }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    id={`representative-tabpanel-${index}`}
    aria-labelledby={`representative-tab-${index}`}
    tabIndex={0}
  >
    {value === index ? children : null}
  </Box>
);

const AnalysisScopeToolbar: React.FC<{
  selectedDate: string;
  scope: RepresentativeAnalysisScope;
  governments: GovernmentPeriod[];
  onSelectGovernment: (governmentName: string | null) => void;
}> = ({ selectedDate, scope, governments, onSelectGovernment }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();

  return (
    <Box
      sx={{
        p: 1.5,
        mb: 2,
        borderRadius: 2,
        border: `1px solid ${themedColors.dataBorder}`,
        bgcolor: themedColors.backgroundPaper,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0.75,
          alignItems: "center",
          mb: governments.length > 0 ? 1.5 : 0,
        }}
      >
        <Chip
          size="small"
          label={t("details.analysis.selectedDate", {
            value: displayDate(selectedDate),
          })}
          sx={{ height: 24, fontWeight: 600 }}
        />
        <Chip
          size="small"
          label={
            scope.selectedGovernmentPeriod
              ? t("details.analysis.scopeSpecific", {
                  value: scope.selectedGovernmentPeriod.government_name,
                })
              : t("details.analysis.scopeAll")
          }
          sx={{
            height: 24,
            fontWeight: 600,
            bgcolor: scope.selectedGovernmentPeriod
              ? `${colors.primaryLight}16`
              : undefined,
            color: scope.selectedGovernmentPeriod
              ? colors.primaryLight
              : undefined,
          }}
        />
        {scope.selectedGovernmentPeriod ? (
          <Button
            size="small"
            onClick={() => onSelectGovernment(null)}
            sx={{ textTransform: "none", minWidth: 0, px: 1 }}
          >
            {t("details.analysis.clearScope")}
          </Button>
        ) : null}
      </Box>
      <Typography
        variant="caption"
        sx={{ color: themedColors.textSecondary, display: "block", mb: 1 }}
      >
        {t("details.analysis.scopeHint")}
      </Typography>
      {governments.length > 0 ? (
        <GovernmentTimelineFilter
          governments={governments}
          selectedGovName={scope.selectedGovernmentName}
          onSelect={onSelectGovernment}
        />
      ) : null}
    </Box>
  );
};

// ──────────────────────────── Tab: Yleistiedot ────────────────────────────

const OverviewTab: React.FC<{
  details: Awaited<ReturnType<typeof fetchPersonDetails>>;
  selectedDate: string;
}> = ({ details, selectedDate }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const tenureRange = getTenureRange(details.groupMemberships);
  const activeDate =
    details.representativeDetails?.death_date &&
    selectedDate > details.representativeDetails.death_date
      ? details.representativeDetails.death_date
      : selectedDate;
  const age =
    details.representativeDetails?.birth_date && activeDate
      ? calculateAge(details.representativeDetails.birth_date, activeDate)
      : null;
  const overviewMetrics = [
    {
      label: t("details.overview.metrics.tenure"),
      value:
        tenureRange?.start && activeDate
          ? `${getYearsBetween(tenureRange.start, activeDate)} ${t("details.years")}`
          : "-",
      caption:
        tenureRange?.start &&
        displayDate(tenureRange.start, t("details.ongoing")),
    },
    {
      label: t("details.overview.metrics.memberships"),
      value: details.groupMemberships?.length ?? 0,
    },
    {
      label: t("details.overview.metrics.districts"),
      value: details.districts?.length ?? 0,
    },
    {
      label: t("details.overview.metrics.governments"),
      value: details.governmentMemberships?.length ?? 0,
    },
  ];
  const orderedDistricts = [...(details.districts ?? [])].sort((a, b) =>
    (b.start_date ?? "").localeCompare(a.start_date ?? ""),
  );
  const orderedMemberships = [...(details.groupMemberships ?? [])].sort(
    (a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""),
  );
  const orderedGovernments = [...(details.governmentMemberships ?? [])].sort(
    (a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""),
  );

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" },
          gap: 1.5,
          mb: 2.5,
        }}
      >
        {overviewMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            caption={metric.caption}
            sx={detailMetricCardSx}
          />
        ))}
      </Box>

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
        {age !== null && (
          <InfoRow
            label={t("details.overview.currentAge")}
            value={`${age} ${t("details.years")}`}
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
      {orderedDistricts.length > 0 && (
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
            {orderedDistricts.map((district) => (
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
      {orderedMemberships.length > 0 && (
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
            {orderedMemberships.map((membership, i) => {
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
      {orderedGovernments.length > 0 && (
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
            {orderedGovernments.map((membership, i) => (
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
                        {displayDate(membership.end_date, t("details.ongoing"))}
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

const VotesTab: React.FC<{
  personId: number;
  scope: RepresentativeAnalysisScope;
}> = ({ personId, scope }) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tComposition } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [votes, setVotes] = React.useState<VotesByPersonType[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedVoting, setSelectedVoting] =
    React.useState<VotesByPersonType | null>(null);
  const [query, setQuery] = React.useState("");
  const [voteFilter, setVoteFilter] = React.useState<
    "all" | "Jaa" | "Ei" | "Tyhjää" | "Poissa"
  >("all");
  const [sort, setSort] = React.useState<VoteSortValue>("newest");
  const [votingDetailsById, setVotingDetailsById] = React.useState<
    Record<number, VotingInlineDetails>
  >({});
  const [loadingVotingDetails, setLoadingVotingDetails] = React.useState<
    Set<number>
  >(new Set());
  const [failedVotingDetails, setFailedVotingDetails] = React.useState<
    Set<number>
  >(new Set());
  const DISPLAY_LIMIT = 200;
  const [displayCount, setDisplayCount] = React.useState(DISPLAY_LIMIT);

  React.useEffect(() => {
    setDisplayCount(DISPLAY_LIMIT);
    setSelectedVoting(null);
  }, [scope.selectedGovernmentName, query, voteFilter, sort]);

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

  React.useEffect(() => {
    if (
      selectedVoting &&
      scope.selectedGovernmentName &&
      selectedVoting.government_name !== scope.selectedGovernmentName
    ) {
      setSelectedVoting(null);
    }
  }, [scope.selectedGovernmentName, selectedVoting]);

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

  const governmentStats = React.useMemo(() => {
    if (!votes) return [];
    const map = new Map<string, GovernmentVoteStat>();
    for (const v of votes) {
      if (!v.government_name) continue;
      const key = v.government_name;
      if (!map.has(key)) {
        map.set(key, {
          governmentName: v.government_name,
          governmentStartDate: v.government_start_date!,
          governmentEndDate: v.government_end_date,
          isCoalition: v.is_coalition === 1,
          yes: 0,
          no: 0,
          abstain: 0,
          absent: 0,
          total: 0,
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
      (a, b) =>
        new Date(b.governmentStartDate).getTime() -
        new Date(a.governmentStartDate).getTime(),
    );
  }, [votes]);

  const filteredVotes = React.useMemo(() => {
    let result = votes ?? [];
    if (scope.selectedGovernmentName) {
      result = result.filter(
        (v) => v.government_name === scope.selectedGovernmentName,
      );
    }
    if (query.trim()) {
      const normalized = query.trim().toLowerCase();
      result = result.filter((v) =>
        `${v.title ?? ""} ${v.section_title ?? ""}`
          .toLowerCase()
          .includes(normalized),
      );
    }
    if (voteFilter !== "all") {
      result = result.filter((v) => v.vote === voteFilter);
    }
    return [...result].sort((a, b) => {
      const aTime = new Date(a.start_time ?? 0).getTime();
      const bTime = new Date(b.start_time ?? 0).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [votes, scope.selectedGovernmentName, query, voteFilter, sort]);

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

  const selectedGovStats = scope.selectedGovernmentName
    ? (governmentStats.find(
        (s) => s.governmentName === scope.selectedGovernmentName,
      ) ?? null)
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
      ? (
          ((displayStats.total - displayStats.absent) / displayStats.total) *
          100
        ).toFixed(1)
      : "0";
  const activeVotingDetails = selectedVoting
    ? votingDetailsById[selectedVoting.id]
    : null;
  const activeVotingLoading = selectedVoting
    ? loadingVotingDetails.has(selectedVoting.id)
    : false;
  const activeVotingFailed = selectedVoting
    ? failedVotingDetails.has(selectedVoting.id)
    : false;
  const voteResultMessage = tComposition("details.analysis.resultCount", {
    shown: filteredVotes.length,
    total: totalVotes,
  });

  const renderVotingDetails = (variant: "inline" | "drawer") => {
    if (!selectedVoting) return null;

    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderBottom:
              variant === "drawer"
                ? `1px solid ${themedColors.dataBorder}`
                : undefined,
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
                {selectedVoting.start_time
                  ? new Date(selectedVoting.start_time).toLocaleDateString(
                      "fi-FI",
                    )
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
            {selectedVoting.government_name !== null ? (
              <Chip
                size="small"
                label={
                  selectedVoting.is_coalition
                    ? tComposition("details.votes.coalition")
                    : tComposition("details.votes.opposition")
                }
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  bgcolor: selectedVoting.is_coalition
                    ? "#3B82F620"
                    : "#F9731620",
                  color: selectedVoting.is_coalition ? "#2563EB" : "#EA580C",
                }}
              />
            ) : null}
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
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            p: { xs: 2, sm: 2.5 },
          }}
        >
          {activeVotingLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
              <CircularProgress size={20} />
              <Typography
                variant="body2"
                sx={{ color: themedColors.textSecondary }}
              >
                {tCommon("loadingVotingDetails")}
              </Typography>
            </Box>
          ) : null}

          {activeVotingFailed && !activeVotingLoading ? (
            <Box sx={{ py: 2 }}>
              <Typography
                variant="body2"
                sx={{ color: themedColors.textTertiary }}
              >
                {tComposition("details.votes.drawer.detailsLoadError")}
              </Typography>
              <Button
                size="small"
                onClick={() => void fetchVotingDetails(selectedVoting.id, true)}
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
          ) : null}

          {activeVotingDetails ? (
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
                  yes={activeVotingDetails.voting.n_yes}
                  no={activeVotingDetails.voting.n_no}
                  empty={activeVotingDetails.voting.n_abstain}
                  absent={activeVotingDetails.voting.n_absent}
                  height={8}
                  sx={{ mb: 0.8 }}
                />
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  <Chip
                    size="small"
                    label={tCommon("yesCount", {
                      count: activeVotingDetails.voting.n_yes,
                    })}
                    sx={{ height: 20 }}
                  />
                  <Chip
                    size="small"
                    label={tCommon("noCount", {
                      count: activeVotingDetails.voting.n_no,
                    })}
                    sx={{ height: 20 }}
                  />
                  <Chip
                    size="small"
                    label={tCommon("emptyCount", {
                      count: activeVotingDetails.voting.n_abstain,
                    })}
                    sx={{ height: 20 }}
                  />
                  <Chip
                    size="small"
                    label={tCommon("absentCount", {
                      count: activeVotingDetails.voting.n_absent,
                    })}
                    sx={{ height: 20 }}
                  />
                </Box>
                {activeVotingDetails.governmentOpposition ? (
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
                          activeVotingDetails.governmentOpposition
                            .government_yes,
                        governmentNo:
                          activeVotingDetails.governmentOpposition
                            .government_no,
                        oppositionYes:
                          activeVotingDetails.governmentOpposition
                            .opposition_yes,
                        oppositionNo:
                          activeVotingDetails.governmentOpposition
                            .opposition_no,
                      },
                    )}
                  </Typography>
                ) : null}
                {activeVotingDetails.relatedVotings.length > 0 ? (
                  <Box sx={{ mt: 0.9 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {tComposition("details.votes.drawer.relatedVotingsTitle")}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        flexWrap: "wrap",
                        mt: 0.5,
                      }}
                    >
                      {activeVotingDetails.relatedVotings
                        .slice(0, 6)
                        .map((related) => (
                          <Button
                            key={related.id}
                            size="small"
                            onClick={() =>
                              openVoting(
                                related.id,
                                selectedVoting.start_time ?? undefined,
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
                ) : null}
              </Box>

              <VotingResultsTable
                partyBreakdown={activeVotingDetails.partyBreakdown}
                memberVotes={activeVotingDetails.memberVotes}
              />
            </Box>
          ) : null}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <ResultCountAnnouncer message={voteResultMessage} />
      <SectionLabel
        icon={
          <HowToVoteIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />
        }
        label={tComposition("details.votes.recentVotes")}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <MetricCard
          label={tComposition("details.votes.participation")}
          value={`${displayParticipationRate}%`}
          caption={tCommon("voteRatio", {
            cast: displayStats.total - displayStats.absent,
            total: displayStats.total,
          })}
          sx={detailMetricCardSx}
        />
        <MetricCard
          label={tComposition("details.votes.totalVotes")}
          value={displayStats.total}
          caption={
            scope.selectedGovernmentName
              ? scope.selectedGovernmentName
              : tComposition("details.analysis.scopeAll")
          }
          sx={detailMetricCardSx}
        />
        <Box
          sx={{
            p: 1.5,
            gridColumn: { xs: "1 / -1", sm: "auto" },
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            bgcolor: themedColors.backgroundPaper,
          }}
        >
          <VoteMarginBar
            yes={displayStats.yes}
            no={displayStats.no}
            empty={displayStats.empty}
            absent={displayStats.absent}
            height={6}
            sx={{ mb: 0.75, mt: 0.5 }}
          />
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {tComposition("details.votes.voteBreakdown", {
              yes: displayStats.yes,
              no: displayStats.no,
              empty: displayStats.empty,
            })}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 160px 160px" },
          gap: 1.25,
          mb: 1.5,
        }}
      >
        <TextField
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tComposition("details.analysis.searchVotes")}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small">
          <InputLabel id="votes-vote-filter-label">
            {tComposition("details.analysis.voteFilter")}
          </InputLabel>
          <Select
            labelId="votes-vote-filter-label"
            value={voteFilter}
            label={tComposition("details.analysis.voteFilter")}
            onChange={(event) =>
              setVoteFilter(
                event.target.value as
                  | "all"
                  | "Jaa"
                  | "Ei"
                  | "Tyhjää"
                  | "Poissa",
              )
            }
          >
            <MenuItem value="all">
              {tComposition("details.filters.all")}
            </MenuItem>
            <MenuItem value="Jaa">Jaa</MenuItem>
            <MenuItem value="Ei">Ei</MenuItem>
            <MenuItem value="Tyhjää">Tyhjää</MenuItem>
            <MenuItem value="Poissa">Poissa</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="votes-sort-label">
            {tComposition("details.analysis.sort")}
          </InputLabel>
          <Select
            labelId="votes-sort-label"
            value={sort}
            label={tComposition("details.analysis.sort")}
            onChange={(event) => setSort(event.target.value as VoteSortValue)}
          >
            <MenuItem value="newest">
              {tComposition("details.analysis.sortNewest")}
            </MenuItem>
            <MenuItem value="oldest">
              {tComposition("details.analysis.sortOldest")}
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography
        variant="caption"
        sx={{ color: themedColors.textSecondary, display: "block", mb: 1 }}
      >
        {voteResultMessage}
      </Typography>

      {votes && votes.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              !isMobile && selectedVoting
                ? "minmax(0, 1.2fr) minmax(320px, 0.8fr)"
                : "1fr",
            gap: 1.5,
            alignItems: "start",
          }}
        >
          <Box
            sx={{
              maxHeight: 520,
              overflowY: "auto",
              borderRadius: 2,
              border: `1px solid ${themedColors.dataBorder}`,
              bgcolor: themedColors.backgroundPaper,
            }}
          >
            {filteredVotes.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  color: themedColors.textTertiary,
                  textAlign: "center",
                  py: 4,
                  px: 2,
                }}
              >
                {tComposition("details.analysis.noFilteredResults")}
              </Typography>
            ) : (
              filteredVotes.slice(0, displayCount).map((v) => (
                <Box
                  key={`${v.id}-${v.vote}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openVotingDetails(v)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openVotingDetails(v);
                    }
                  }}
                  sx={{
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 1,
                    p: 1.5,
                    borderBottom: `1px solid ${themedColors.dataBorder}`,
                    bgcolor:
                      selectedVoting?.id === v.id
                        ? `${colors.primaryLight}10`
                        : "transparent",
                    "&:last-of-type": { borderBottom: "none" },
                    "&:focus-visible": {
                      outline: `2px solid ${colors.primaryLight}`,
                      outlineOffset: -2,
                    },
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
                      sx={{
                        color: themedColors.textSecondary,
                        display: "block",
                        mt: 0.25,
                      }}
                    >
                      {v.start_time
                        ? new Date(v.start_time).toLocaleDateString("fi-FI")
                        : "-"}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        mt: 0.75,
                        flexWrap: "wrap",
                      }}
                    >
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
                      {v.government_name !== null ? (
                        <Chip
                          label={
                            v.is_coalition
                              ? tComposition("details.votes.coalition")
                              : tComposition("details.votes.opposition")
                          }
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            bgcolor: v.is_coalition ? "#3B82F620" : "#F9731620",
                            color: v.is_coalition ? "#2563EB" : "#EA580C",
                          }}
                        />
                      ) : null}
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        mt: 0.75,
                        flexWrap: "wrap",
                      }}
                    >
                      <Button
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          openVoting(v.id, v.start_time);
                        }}
                        endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                        sx={{
                          textTransform: "none",
                          minWidth: 0,
                          px: 1,
                          fontSize: "0.68rem",
                        }}
                      >
                        {tCommon("openView")}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
            {filteredVotes.length > displayCount ? (
              <Box sx={{ pt: 1.5, textAlign: "center", p: 1.5 }}>
                <Button
                  size="small"
                  onClick={() => setDisplayCount((n) => n + DISPLAY_LIMIT)}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                >
                  {tComposition("details.votes.showMore", {
                    shown: displayCount,
                    total: filteredVotes.length,
                  })}
                </Button>
              </Box>
            ) : null}
          </Box>

          {!isMobile && selectedVoting ? (
            <Box
              sx={{
                minHeight: 520,
                maxHeight: 520,
                overflow: "hidden",
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                bgcolor: themedColors.backgroundPaper,
              }}
            >
              {renderVotingDetails("inline")}
            </Box>
          ) : null}
        </Box>
      ) : null}

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
        open={isMobile && Boolean(selectedVoting)}
        onClose={closeVotingDetails}
        sx={{ zIndex: theme.zIndex.modal + 2 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 560 },
            bgcolor: themedColors.backgroundSubtle,
          },
        }}
      >
        {renderVotingDetails("drawer")}
      </Drawer>
    </Box>
  );
};

// ──────────────────────────── Tab: Puheenvuorot ────────────────────────────

const SpeechesTab: React.FC<{
  personId: number;
  scope: RepresentativeAnalysisScope;
}> = ({ personId, scope }) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tComposition } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [speeches, setSpeeches] = React.useState<SpeechType[] | null>(null);
  const [speechesTotal, setSpeechesTotal] = React.useState<number | null>(null);
  const [selectedSpeech, setSelectedSpeech] = React.useState<SpeechType | null>(
    null,
  );
  const [query, setQuery] = React.useState("");
  const [speechTypeFilter, setSpeechTypeFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<SpeechSortValue>("newest");
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
  const [loadMoreError, setLoadMoreError] = React.useState<string | null>(null);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [sectionDetailsError, setSectionDetailsError] = React.useState<
    string | null
  >(null);
  const [loadingContextSection, setLoadingContextSection] = React.useState<
    string | null
  >(null);
  const [loadingSectionDetailsKey, setLoadingSectionDetailsKey] =
    React.useState<string | null>(null);
  const contextLoadRequestRef = React.useRef(0);
  const sectionDetailsRequestRef = React.useRef(0);
  const selectedSpeechRef = React.useRef<HTMLButtonElement | null>(null);
  const [activeSpeechId, setActiveSpeechId] = React.useState<number | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setLoadMoreError(null);
    setSelectedSpeech(null);
    setActiveSpeechId(null);
    setSectionConversations({});
    setSectionDetailsByKey({});
    setFailedSectionDetailsKeys({});
    setFailedContextSections({});
    setContextError(null);
    setSectionDetailsError(null);
    setLoadingContextSection(null);
    setLoadingSectionDetailsKey(null);
    fetchPersonSpeeches(personId, 50, 0, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setSpeeches(data.speeches);
        setSpeechesTotal(data.total);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment(`Failed to fetch speeches for ${personId}`, err);
        setLoadError(tComposition("details.speeches.loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [personId, tComposition]);

  const loadMoreSpeeches = () => {
    if (!speeches || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    fetchPersonSpeeches(personId, 50, speeches.length)
      .then((data) => {
        setSpeeches((prev) => [...(prev ?? []), ...data.speeches]);
      })
      .catch((err) => {
        warnInDevelopment(`Failed to load more speeches for ${personId}`, err);
        setLoadMoreError(tComposition("details.speeches.loadMoreError"));
      })
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
    const controller = new AbortController();
    contextLoadRequestRef.current = requestId;
    setContextError(null);
    setLoadingContextSection(selectedSectionKey);
    fetchSectionConversation(
      selectedSectionKey,
      selectedSpeechId,
      controller.signal,
    )
      .then((data) => {
        if (
          controller.signal.aborted ||
          contextLoadRequestRef.current !== requestId
        )
          return;
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
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment(
          `Failed to fetch section conversation for ${selectedSectionKey}`,
          err,
        );
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
    return () => controller.abort();
  }, [
    selectedSectionKey,
    selectedSpeech?.id,
    sectionConversations,
    failedContextSections,
    // loadingContextSection intentionally omitted: it is set inside this effect,
    // including it causes a cleanup→abort→reset loop (max update depth exceeded).
    // Request deduplication is handled by contextLoadRequestRef instead.
    tComposition,
  ]);

  React.useEffect(() => {
    if (!selectedSectionKey) return;
    if (selectedSectionDetails) return;
    if (failedSectionDetailsKeys[selectedSectionKey]) return;
    if (loadingSectionDetailsKey === selectedSectionKey) return;

    const requestId = sectionDetailsRequestRef.current + 1;
    const controller = new AbortController();
    sectionDetailsRequestRef.current = requestId;
    setSectionDetailsError(null);
    setLoadingSectionDetailsKey(selectedSectionKey);
    fetchSectionDetails(selectedSectionKey, controller.signal)
      .then((data) => {
        if (
          controller.signal.aborted ||
          sectionDetailsRequestRef.current !== requestId
        )
          return;
        setSectionDetailsByKey((prev) => ({
          ...prev,
          [selectedSectionKey]: data,
        }));
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment(
          `Failed to fetch section details for ${selectedSectionKey}`,
          err,
        );
        if (sectionDetailsRequestRef.current !== requestId) return;
        setFailedSectionDetailsKeys((prev) => ({
          ...prev,
          [selectedSectionKey]: true,
        }));
        setSectionDetailsError(
          tComposition("details.speeches.sectionDetailsLoadError"),
        );
      })
      .finally(() => {
        if (sectionDetailsRequestRef.current !== requestId) return;
        setLoadingSectionDetailsKey((current) =>
          current === selectedSectionKey ? null : current,
        );
      });
    return () => controller.abort();
  }, [
    selectedSectionKey,
    selectedSectionDetails,
    failedSectionDetailsKeys,
    // loadingSectionDetailsKey intentionally omitted: same reason as above —
    // it is set inside this effect and causes an infinite cleanup loop.
    tComposition,
  ]);

  React.useEffect(() => {
    if (!selectedSpeechRef.current) return;
    selectedSpeechRef.current.scrollIntoView({ block: "center" });
  }, [activeSpeechId, selectedConversation?.speeches.length]);

  React.useEffect(() => {
    if (
      selectedSpeech &&
      !isWithinGovernmentPeriod(
        selectedSpeech.start_time,
        scope.selectedGovernmentPeriod,
      )
    ) {
      setSelectedSpeech(null);
      setActiveSpeechId(null);
    }
  }, [scope.selectedGovernmentPeriod, selectedSpeech]);

  const openSpeechConversation = (speech: SpeechType) => {
    setSelectedSpeech(speech);
    setActiveSpeechId(speech.id);
    setSectionDetailsError(null);
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
    setSectionDetailsError(null);
    setLoadMoreError(null);
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

  const totalWords =
    speeches?.reduce((sum, s) => sum + (s.word_count || 0), 0) || 0;
  const availableSpeechTypes = React.useMemo(
    () =>
      Array.from(
        new Set(
          (speeches ?? [])
            .map((speech) => speech.speech_type)
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [speeches],
  );
  const filteredSpeeches = React.useMemo(() => {
    let result = speeches ?? [];
    if (scope.selectedGovernmentPeriod) {
      result = result.filter((speech) =>
        isWithinGovernmentPeriod(
          speech.start_time,
          scope.selectedGovernmentPeriod,
        ),
      );
    }
    if (query.trim()) {
      const normalized = query.trim().toLowerCase();
      result = result.filter((speech) =>
        `${speech.content ?? ""} ${speech.section_title ?? ""} ${speech.document ?? ""}`
          .toLowerCase()
          .includes(normalized),
      );
    }
    if (speechTypeFilter !== "all") {
      result = result.filter(
        (speech) => speech.speech_type === speechTypeFilter,
      );
    }
    return [...result].sort((a, b) => {
      if (sort === "longest") {
        return (b.word_count ?? 0) - (a.word_count ?? 0);
      }
      const aTime = new Date(a.start_time ?? 0).getTime();
      const bTime = new Date(b.start_time ?? 0).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [speeches, scope.selectedGovernmentPeriod, query, speechTypeFilter, sort]);
  const filteredWords =
    filteredSpeeches.reduce(
      (sum, speech) => sum + (speech.word_count ?? 0),
      0,
    ) || 0;
  const speechResultMessage = tComposition("details.analysis.resultCount", {
    shown: filteredSpeeches.length,
    total: speechesTotal ?? speeches?.length ?? 0,
  });

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

  const renderSpeechDetails = (variant: "inline" | "drawer") => {
    if (!selectedSpeech) return null;

    return (
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
            borderBottom:
              variant === "drawer"
                ? `1px solid ${themedColors.dataBorder}`
                : undefined,
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
                {formatSpeechDate(activeSpeechStartTime)}
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
            {activeSpeechParty ? (
              <Chip
                size="small"
                label={activeSpeechParty.toUpperCase()}
                sx={{ height: 20, fontSize: "0.65rem" }}
              />
            ) : null}
            <Chip
              size="small"
              label={formatSpeechTime(
                activeSpeechStartTime,
                activeSpeechEndTime,
              )}
              sx={{ height: 20, fontSize: "0.65rem" }}
            />
            {activeSpeechType ? (
              <Chip
                size="small"
                label={activeSpeechType}
                sx={{ height: 20, fontSize: "0.65rem" }}
              />
            ) : null}
          </Box>
          {selectedSectionKey &&
          loadingSectionDetailsKey === selectedSectionKey &&
          !selectedSectionDetails ? (
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                mt: 1,
                display: "block",
              }}
            >
              {tComposition("details.speeches.drawer.loadingSectionContent")}
            </Typography>
          ) : null}
          {sectionDetailsError ? (
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                mt: 1,
                display: "block",
              }}
            >
              {sectionDetailsError}
            </Typography>
          ) : null}
          {sectionContextContent ? (
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
              {sectionContextTitle ? (
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
              ) : null}
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
          ) : null}
          {selectedSpeech.section_key ? (
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
          ) : null}
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
          loadingContextSection === selectedSectionKey ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={26} />
            </Box>
          ) : null}

          {contextError ? (
            <Box sx={{ py: 2 }}>
              <Typography
                variant="body2"
                sx={{ color: themedColors.textTertiary }}
              >
                {contextError}
              </Typography>
              {selectedSectionKey &&
              failedContextSections[selectedSectionKey] ? (
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
              ) : null}
            </Box>
          ) : null}

          {selectedConversation ? (
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
              {selectedConversation.truncated ? (
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
              ) : null}
              <Box sx={{ mt: 1.5 }}>
                {selectedConversation.speeches.map((speech) => {
                  const isSelected = speech.id === activeSpeechId;
                  const isSelectedPersonSpeech = speech.person_id === personId;

                  return (
                    <ButtonBase
                      key={speech.id}
                      ref={isSelected ? selectedSpeechRef : null}
                      component="button"
                      onClick={() => selectSpeechInConversation(speech.id)}
                      sx={{
                        width: "100%",
                        textAlign: "left",
                        p: 1.25,
                        borderRadius: 1.5,
                        mb: 1.25,
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
                          {formatSpeechTime(speech.start_time, speech.end_time)}
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
                        {speech.party_abbreviation ? (
                          <Chip
                            size="small"
                            label={speech.party_abbreviation.toUpperCase()}
                            sx={{ height: 18, fontSize: "0.62rem" }}
                          />
                        ) : null}
                        {speech.speech_type ? (
                          <Chip
                            size="small"
                            label={speech.speech_type}
                            sx={{ height: 18, fontSize: "0.62rem" }}
                          />
                        ) : null}
                      </Box>
                      <SourceText
                        variant="body2"
                        sx={{
                          color: themedColors.textPrimary,
                          lineHeight: 1.5,
                          whiteSpace: "pre-line",
                        }}
                      >
                        {speech.content ||
                          tComposition("details.speeches.drawer.noContent")}
                      </SourceText>
                    </ButtonBase>
                  );
                })}
              </Box>
            </Box>
          ) : null}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      <ResultCountAnnouncer message={speechResultMessage} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(3, 1fr)" },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <MetricCard
          label={tComposition("details.speeches.count")}
          value={filteredSpeeches.length}
          caption={`${speechesTotal ?? 0} ${tComposition("details.analysis.availableTotal")}`}
          sx={detailMetricCardSx}
        />
        <MetricCard
          label={tComposition("details.speeches.totalWords")}
          value={
            filteredWords > 1000
              ? `${(filteredWords / 1000).toFixed(1)}k`
              : filteredWords
          }
          caption={
            totalWords !== filteredWords
              ? `${totalWords} ${tComposition("details.analysis.scopeAll")}`
              : undefined
          }
          sx={detailMetricCardSx}
        />
        <MetricCard
          label={tComposition("details.analysis.scope")}
          value={
            scope.selectedGovernmentPeriod
              ? scope.selectedGovernmentPeriod.government_name
              : tComposition("details.analysis.scopeAll")
          }
          sx={detailMetricCardSx}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 160px 160px" },
          gap: 1.25,
          mb: 1,
        }}
      >
        <TextField
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tComposition("details.analysis.searchSpeeches")}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small">
          <InputLabel id="speech-type-filter-label">
            {tComposition("details.analysis.typeFilter")}
          </InputLabel>
          <Select
            labelId="speech-type-filter-label"
            value={speechTypeFilter}
            label={tComposition("details.analysis.typeFilter")}
            onChange={(event) => setSpeechTypeFilter(event.target.value)}
          >
            <MenuItem value="all">
              {tComposition("details.filters.all")}
            </MenuItem>
            {availableSpeechTypes.map((speechType) => (
              <MenuItem key={speechType} value={speechType}>
                {speechType}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="speech-sort-label">
            {tComposition("details.analysis.sort")}
          </InputLabel>
          <Select
            labelId="speech-sort-label"
            value={sort}
            label={tComposition("details.analysis.sort")}
            onChange={(event) => setSort(event.target.value as SpeechSortValue)}
          >
            <MenuItem value="newest">
              {tComposition("details.analysis.sortNewest")}
            </MenuItem>
            <MenuItem value="oldest">
              {tComposition("details.analysis.sortOldest")}
            </MenuItem>
            <MenuItem value="longest">
              {tComposition("details.analysis.sortLongest")}
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Typography
        variant="caption"
        sx={{ color: themedColors.textSecondary, display: "block", mb: 1 }}
      >
        {speechResultMessage}
      </Typography>

      {speeches && speeches.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              !isMobile && selectedSpeech
                ? "minmax(0, 1.2fr) minmax(320px, 0.8fr)"
                : "1fr",
            gap: 1.5,
            alignItems: "start",
          }}
        >
          <Box
            sx={{
              maxHeight: 520,
              overflowY: "auto",
              borderRadius: 2,
              border: `1px solid ${themedColors.dataBorder}`,
              bgcolor: themedColors.backgroundPaper,
            }}
          >
            {filteredSpeeches.length === 0 ? (
              <Typography
                variant="body2"
                sx={{
                  color: themedColors.textTertiary,
                  textAlign: "center",
                  py: 4,
                  px: 2,
                }}
              >
                {tComposition("details.analysis.noFilteredResults")}
              </Typography>
            ) : (
              filteredSpeeches.map((s) => (
                <ButtonBase
                  key={s.id}
                  component="button"
                  onClick={() => openSpeechConversation(s)}
                  sx={{
                    width: "100%",
                    textAlign: "left",
                    px: 1.5,
                    py: 1.5,
                    borderBottom: `1px solid ${themedColors.dataBorder}`,
                    bgcolor:
                      selectedSpeech?.id === s.id
                        ? `${colors.primaryLight}10`
                        : "transparent",
                    "&:last-of-type": { borderBottom: "none" },
                    "&:focus-visible": {
                      outline: `2px solid ${colors.primaryLight}`,
                      outlineOffset: -2,
                    },
                  }}
                >
                  <Box sx={{ width: "100%" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight="600"
                          sx={{ color: themedColors.textSecondary }}
                        >
                          {formatSpeechDate(s.start_time)}
                        </Typography>
                        {s.speech_type ? (
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
                        ) : null}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{ color: themedColors.textTertiary }}
                      >
                        {s.word_count} {tComposition("details.speeches.words")}
                      </Typography>
                    </Box>
                    {s.content ? (
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
                    ) : null}
                    {s.document ? (
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
                    ) : null}
                    <Typography
                      variant="caption"
                      sx={{
                        color: themedColors.textTertiary,
                        display: "block",
                        mt: 0.75,
                      }}
                    >
                      {s.section_identifier ||
                        s.section_title ||
                        tComposition("details.speeches.noSectionTitle")}
                    </Typography>
                  </Box>
                </ButtonBase>
              ))
            )}
          </Box>

          {!isMobile && selectedSpeech ? (
            <Box
              sx={{
                minHeight: 520,
                maxHeight: 520,
                overflow: "hidden",
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                bgcolor: themedColors.backgroundPaper,
              }}
            >
              {renderSpeechDetails("inline")}
            </Box>
          ) : null}
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
            {loadMoreError ? (
              <Typography
                variant="caption"
                sx={{
                  color: themedColors.textTertiary,
                  mt: 0.75,
                  display: "block",
                }}
              >
                {loadMoreError}
              </Typography>
            ) : null}
          </Box>
        )}

      <Drawer
        anchor="right"
        open={isMobile && Boolean(selectedSpeech)}
        onClose={closeSpeechConversation}
        sx={{ zIndex: theme.zIndex.modal + 2 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 560 },
            bgcolor: themedColors.backgroundSubtle,
          },
        }}
      >
        {renderSpeechDetails("drawer")}
      </Drawer>
    </Box>
  );
};

// ─────────────────────────── Tab: Kysymykset ─────────────────────────────

const QuestionsTab: React.FC<{
  personId: number;
  scope: RepresentativeAnalysisScope;
}> = ({ personId, scope }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const [questions, setQuestions] = React.useState<PersonQuestionType[] | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<
    "all" | "interpellation" | "oral_question" | "written_question"
  >("all");
  const [roleFilter, setRoleFilter] = React.useState<
    "all" | PersonQuestionType["relation_role"]
  >("all");
  const [sort, setSort] = React.useState<InitiativeSortValue>("newest");

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
  const filteredQuestions = React.useMemo(() => {
    let result = questions ?? [];
    if (scope.selectedGovernmentPeriod) {
      result = result.filter((item) =>
        isWithinGovernmentPeriod(
          item.submission_date,
          scope.selectedGovernmentPeriod,
        ),
      );
    }
    if (query.trim()) {
      const normalized = query.trim().toLowerCase();
      result = result.filter((item) =>
        `${item.title ?? ""} ${item.parliament_identifier ?? ""}`
          .toLowerCase()
          .includes(normalized),
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((item) => item.question_kind === typeFilter);
    }
    if (roleFilter !== "all") {
      result = result.filter((item) => item.relation_role === roleFilter);
    }
    return [...result].sort((a, b) => {
      const aTime = new Date(a.submission_date ?? 0).getTime();
      const bTime = new Date(b.submission_date ?? 0).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [
    questions,
    scope.selectedGovernmentPeriod,
    query,
    typeFilter,
    roleFilter,
    sort,
  ]);
  const resultMessage = t("details.analysis.resultCount", {
    shown: filteredQuestions.length,
    total: totalQuestions,
  });

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  return (
    <Box>
      <ResultCountAnnouncer message={resultMessage} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <MetricCard
          label={t("details.questions.total", { count: totalQuestions })}
          value={filteredQuestions.length}
          sx={detailMetricCardSx}
        />
        <MetricCard
          label={t("details.questions.interpellations", {
            count: interpellationsCount,
          })}
          value={interpellationsCount}
          sx={detailMetricCardSx}
        />
        <MetricCard
          label={t("details.questions.oralQuestions", {
            count: oralQuestionsCount,
          })}
          value={oralQuestionsCount}
          sx={detailMetricCardSx}
        />
        <MetricCard
          label={t("details.questions.writtenQuestions", {
            count: writtenQuestionsCount,
          })}
          value={writtenQuestionsCount}
          sx={detailMetricCardSx}
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(4, minmax(0, 1fr))" },
          gap: 1.25,
          mb: 1.25,
        }}
      >
        <TextField
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("details.analysis.searchInitiatives")}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small">
          <InputLabel id="initiative-type-filter-label">
            {t("details.analysis.typeFilter")}
          </InputLabel>
          <Select
            labelId="initiative-type-filter-label"
            value={typeFilter}
            label={t("details.analysis.typeFilter")}
            onChange={(event) =>
              setTypeFilter(
                event.target.value as
                  | "all"
                  | "interpellation"
                  | "oral_question"
                  | "written_question",
              )
            }
          >
            <MenuItem value="all">{t("details.filters.all")}</MenuItem>
            <MenuItem value="interpellation">
              {t("details.questions.interpellations", { count: 2 })}
            </MenuItem>
            <MenuItem value="oral_question">
              {t("details.questions.oralQuestions", { count: 2 })}
            </MenuItem>
            <MenuItem value="written_question">
              {t("details.questions.writtenQuestions", { count: 2 })}
            </MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="initiative-role-filter-label">
            {t("details.analysis.roleFilter")}
          </InputLabel>
          <Select
            labelId="initiative-role-filter-label"
            value={roleFilter}
            label={t("details.analysis.roleFilter")}
            onChange={(event) =>
              setRoleFilter(
                event.target.value as
                  | "all"
                  | PersonQuestionType["relation_role"],
              )
            }
          >
            <MenuItem value="all">{t("details.filters.all")}</MenuItem>
            <MenuItem value="asker">{roleLabelByKey.asker}</MenuItem>
            <MenuItem value="first_signer">
              {roleLabelByKey.first_signer}
            </MenuItem>
            <MenuItem value="signer">{roleLabelByKey.signer}</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel id="initiative-sort-label">
            {t("details.analysis.sort")}
          </InputLabel>
          <Select
            labelId="initiative-sort-label"
            value={sort}
            label={t("details.analysis.sort")}
            onChange={(event) =>
              setSort(event.target.value as InitiativeSortValue)
            }
          >
            <MenuItem value="newest">
              {t("details.analysis.sortNewest")}
            </MenuItem>
            <MenuItem value="oldest">
              {t("details.analysis.sortOldest")}
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.25 }}>
        <Chip
          label={t("details.questions.interpellationsSection", {
            count: interpellationsCount,
          })}
          size="small"
        />
        <Chip
          label={t("details.questions.oralQuestionsSection", {
            count: oralQuestionsCount,
          })}
          size="small"
        />
        <Chip
          label={t("details.questions.writtenQuestionsSection", {
            count: writtenQuestionsCount,
          })}
          size="small"
        />
      </Box>

      <Typography
        variant="caption"
        sx={{ color: themedColors.textSecondary, display: "block", mb: 1 }}
      >
        {resultMessage}
      </Typography>

      <Box
        sx={{
          borderRadius: 2,
          border: `1px solid ${themedColors.dataBorder}`,
          bgcolor: themedColors.backgroundPaper,
          overflow: "hidden",
        }}
      >
        {filteredQuestions.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: themedColors.textTertiary,
              py: 4,
              px: 2,
              textAlign: "center",
            }}
          >
            {t("details.analysis.noFilteredResults")}
          </Typography>
        ) : (
          filteredQuestions.map((item) => (
            <Box
              key={`${item.question_kind}-${item.id}`}
              sx={{
                py: 1.25,
                px: 1.5,
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
                  sx={{
                    color: themedColors.textSecondary,
                    display: "block",
                    mt: 0.25,
                  }}
                >
                  {item.parliament_identifier}
                  {item.submission_date
                    ? ` - ${displayDate(item.submission_date)}`
                    : ""}
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.75 }}
                >
                  <Chip
                    size="small"
                    label={
                      item.question_kind === "interpellation"
                        ? t("details.questions.interpellations", { count: 1 })
                        : item.question_kind === "oral_question"
                          ? t("details.questions.oralQuestions", { count: 1 })
                          : t("details.questions.writtenQuestions", {
                              count: 1,
                            })
                    }
                    sx={{ height: 20, fontSize: "0.65rem" }}
                  />
                  <Chip
                    label={roleLabelByKey[item.relation_role]}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
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
              </Box>
            </Box>
          ))
        )}
      </Box>
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

const RepresentativeDetailsBody: React.FC<{
  selectedRepresentative: RepresentativeSelection;
  selectedDate: string;
}> = ({ selectedRepresentative, selectedDate }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [tabIndex, setTabIndex] = React.useState(0);
  const [selectedGovName, setSelectedGovName] = React.useState<string | null>(
    null,
  );
  const [governmentPeriods, setGovernmentPeriods] = React.useState<
    GovernmentPeriod[]
  >([]);
  const [detailsLoadError, setDetailsLoadError] = React.useState<string | null>(
    null,
  );
  const [governmentPeriodsError, setGovernmentPeriodsError] = React.useState<
    string | null
  >(null);

  const [details, setDetails] =
    React.useState<Awaited<ReturnType<typeof fetchPersonDetails>>>();

  React.useEffect(() => {
    const controller = new AbortController();
    setDetails(undefined);
    setDetailsLoadError(null);
    setTabIndex(0);
    setSelectedGovName(null);
    setGovernmentPeriods([]);
    setGovernmentPeriodsError(null);
    fetchPersonDetails(selectedRepresentative.personId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setDetails(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment(
          `Failed to fetch representative details for ${selectedRepresentative.personId}`,
          err,
        );
        setDetailsLoadError(t("details.profileLoadError"));
      });
    apiFetch(
      `/api/person/${selectedRepresentative.personId}/government-periods`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setGovernmentPeriods(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment(
          `Failed to fetch government periods for ${selectedRepresentative.personId}`,
          err,
        );
        setGovernmentPeriodsError(t("details.governmentPeriodsLoadError"));
      });
    return () => controller.abort();
  }, [selectedRepresentative, t]);

  if (details?.representativeDetails === undefined) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
          px: 3,
        }}
      >
        {detailsLoadError ? (
          <Alert severity="error" sx={{ maxWidth: 420 }}>
            {detailsLoadError}
          </Alert>
        ) : (
          <CircularProgress />
        )}
      </Box>
    );
  }

  const membershipForDate = [...(details?.groupMemberships ?? [])]
    .reverse()
    .find(
      (membership) =>
        membership.start_date <= selectedDate &&
        (!membership.end_date || membership.end_date >= selectedDate),
    );
  const latestMembership = details?.groupMemberships?.at(-1);
  const currentParty =
    membershipForDate?.group_name ??
    latestMembership?.group_name ??
    selectedRepresentative.summary?.partyName ??
    t("details.unknownParty");
  const currentDistrict =
    details?.districts?.[0]?.district_name || t("details.unknownDistrict");
  const representativeDetails = details?.representativeDetails;
  const representativeFirstName =
    representativeDetails?.first_name ??
    selectedRepresentative.summary?.firstName ??
    "";
  const representativeLastName =
    representativeDetails?.last_name ??
    selectedRepresentative.summary?.lastName ??
    "";
  const governmentStatus =
    selectedRepresentative.summary?.isInGovernment ?? null;

  const selectedDateObj = new Date(selectedDate);
  const deathDateObj = representativeDetails?.death_date
    ? new Date(representativeDetails.death_date)
    : null;
  const wasAliveOnSelectedDate =
    !deathDateObj || selectedDateObj <= deathDateObj;
  const effectiveDate = wasAliveOnSelectedDate
    ? selectedDate
    : (representativeDetails?.death_date ?? selectedDate);
  const age = representativeDetails?.birth_date
    ? calculateAge(representativeDetails.birth_date, effectiveDate)
    : null;
  const selectedGovernmentPeriod =
    governmentPeriods.find(
      (period) => period.government_name === selectedGovName,
    ) ?? null;
  const analysisScope: RepresentativeAnalysisScope = {
    selectedGovernmentName: selectedGovName,
    selectedGovernmentPeriod,
  };
  const tenureRange = getTenureRange(details?.groupMemberships);
  const quickSummary = [
    {
      label: t("details.headerSummary.tenure"),
      value:
        tenureRange?.start && effectiveDate
          ? `${getYearsBetween(tenureRange.start, effectiveDate)} ${t("details.years")}`
          : "-",
    },
    {
      label: t("details.headerSummary.memberships"),
      value: details?.groupMemberships?.length ?? 0,
    },
    {
      label: t("details.headerSummary.roles"),
      value:
        (details?.trustPositions?.length ?? 0) +
        (details?.governmentMemberships?.length ?? 0),
    },
  ];

  return (
    <>
      {/* Sticky header — bleeds through the drawer's padding to go edge-to-edge */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: colors.primary,
          mx: -2.5,
          mt: -2.5,
          px: 2.5,
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1.5, sm: 2 },
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
              {representativeFirstName[0] ?? "?"}
              {representativeLastName[0] ?? ""}
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                fontWeight="700"
                sx={{ color: "white", lineHeight: 1.3 }}
              >
                {representativeFirstName} {representativeLastName}
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
                {governmentStatus !== null && (
                  <Chip
                    icon={<AccountBalanceIcon sx={{ fontSize: 14 }} />}
                    label={
                      governmentStatus === 1
                        ? t("details.header.government")
                        : t("details.header.opposition")
                    }
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor:
                        governmentStatus === 1
                          ? "rgba(76, 175, 80, 0.25)"
                          : "rgba(255, 152, 0, 0.25)",
                      color: "white",
                      border:
                        governmentStatus === 1
                          ? "1px solid rgba(76, 175, 80, 0.5)"
                          : "1px solid rgba(255, 152, 0, 0.5)",
                    }}
                  />
                )}
                <Chip
                  label={t("details.analysis.selectedDate", {
                    value: displayDate(selectedDate),
                  })}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: "rgba(255,255,255,0.1)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {!isMobile ? (
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              pb: 1.5,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 1,
            }}
          >
            {quickSummary.map((item) => (
              <Box
                key={item.label}
                sx={{
                  p: 1.1,
                  borderRadius: 1.5,
                  bgcolor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {item.label}
                </Typography>
                <Typography
                  sx={{
                    color: "white",
                    fontWeight: 700,
                    lineHeight: 1.2,
                    mt: 0.25,
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}

        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label={t("details.analysis.sectionsAria")}
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
            {...tabA11yProps(0)}
          />
          <Tab
            label={t("details.tabs.votes")}
            icon={<HowToVoteIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            {...tabA11yProps(1)}
          />
          <Tab
            label={t("details.tabs.speeches")}
            icon={<MicIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            {...tabA11yProps(2)}
          />
          <Tab
            label={t("details.tabs.initiatives")}
            icon={<QuizIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            {...tabA11yProps(3)}
          />
          <Tab
            label={t("details.tabs.positions")}
            icon={<WorkIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            {...tabA11yProps(4)}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: themedColors.backgroundSubtle,
        }}
      >
        {governmentPeriodsError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {governmentPeriodsError}
          </Alert>
        ) : null}
        <AnalysisScopeToolbar
          selectedDate={selectedDate}
          scope={analysisScope}
          governments={governmentPeriods}
          onSelectGovernment={setSelectedGovName}
        />

        <AnalysisTabPanel value={tabIndex} index={0}>
          {details ? (
            <OverviewTab details={details} selectedDate={selectedDate} />
          ) : null}
        </AnalysisTabPanel>
        <AnalysisTabPanel value={tabIndex} index={1}>
          <VotesTab
            personId={selectedRepresentative.personId}
            scope={analysisScope}
          />
        </AnalysisTabPanel>
        <AnalysisTabPanel value={tabIndex} index={2}>
          <SpeechesTab
            personId={selectedRepresentative.personId}
            scope={analysisScope}
          />
        </AnalysisTabPanel>
        <AnalysisTabPanel value={tabIndex} index={3}>
          <QuestionsTab
            personId={selectedRepresentative.personId}
            scope={analysisScope}
          />
        </AnalysisTabPanel>
        <AnalysisTabPanel value={tabIndex} index={4}>
          {details ? (
            <PositionsTab
              personId={selectedRepresentative.personId}
              trustPositions={details.trustPositions || []}
              governmentMemberships={details.governmentMemberships || []}
            />
          ) : null}
        </AnalysisTabPanel>
      </Box>
    </>
  );
};

export const RepresentativeDetails: React.FC<{
  onClose: () => void;
  selectedRepresentative: RepresentativeSelection | null;
  selectedDate: string;
}> = ({ onClose, selectedRepresentative, selectedDate }) => {
  const { openRootDrawer, closeDrawer } = useOverlayDrawer();
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!selectedRepresentative) {
      closeDrawer();
      return;
    }
    const firstName = selectedRepresentative.summary?.firstName ?? "";
    const lastName = selectedRepresentative.summary?.lastName ?? "";
    const subtitle =
      [firstName, lastName].filter(Boolean).join(" ") || undefined;
    openRootDrawer({
      drawerKey: `representative:${selectedRepresentative.personId}`,
      title: "Edustaja",
      subtitle,
      content: (
        <RepresentativeDetailsBody
          selectedRepresentative={selectedRepresentative}
          selectedDate={selectedDate}
        />
      ),
      onClose: () => onCloseRef.current(),
    });
  }, [selectedRepresentative, selectedDate, openRootDrawer, closeDrawer]);

  return null;
};
