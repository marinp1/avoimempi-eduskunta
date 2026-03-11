import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsIcon from "@mui/icons-material/Groups";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import TodayIcon from "@mui/icons-material/Today";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type HallituskausiPeriod,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { spacing } from "#client/theme";
import {
  DataCard,
  EmptyState,
  MetricCard,
  PageHeader,
} from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { formatDateFi } from "#client/utils/date-time";
import { apiFetch } from "#client/utils/fetch";

type Government = ApiRouteItem<`/api/hallitukset`>;
type GovernmentMember = ApiRouteItem<`/api/hallitukset/:id/members`>;
type ActiveGovernmentResponse = ApiRouteResponse<`/api/hallitukset/active`>;
type FeaturedMinisterKey =
  | "primeMinister"
  | "financeMinister"
  | "interiorMinister";

const MS_PER_DAY = 86_400_000;

const todayIso = () => new Date().toISOString().split("T")[0];

const formatDateRange = (startDate: string, endDate: string | null) =>
  `${formatDateFi(startDate)} - ${formatDateFi(endDate, "...")}`;

const formatOptionalDateRange = (
  startDate: string | null,
  endDate: string | null,
) => {
  const startLabel = formatDateFi(startDate, "...");
  const endLabel = formatDateFi(endDate, "...");
  return `${startLabel} - ${endLabel}`;
};

const formatDurationFi = (startDate: string, endDate?: string | null) => {
  const start = new Date(startDate);
  const end = new Date(endDate ?? todayIso());
  const diffDays = Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1,
  );

  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);

  if (years > 0) {
    if (months > 0) return `${years} v ${months} kk`;
    return `${years} v`;
  }
  if (months > 0) return `${months} kk`;
  return `${diffDays} pv`;
};

const getMemberDisplayName = (member: GovernmentMember) => {
  if (member.first_name && member.last_name) {
    return `${member.first_name} ${member.last_name}`;
  }
  return member.name ?? "Tuntematon";
};

const groupMembersByMinistry = (members: GovernmentMember[]) => {
  const map = new Map<string, GovernmentMember[]>();
  for (const member of members) {
    const ministry = member.ministry || "Muu tehtävä";
    const current = map.get(ministry) ?? [];
    current.push(member);
    map.set(ministry, current);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "fi"));
};

const normalizeRoleName = (value: string | null | undefined) =>
  (value ?? "").trim().toLocaleLowerCase("fi-FI");

const isMemberActiveOnDate = (member: GovernmentMember, date: string) => {
  const startDate = member.start_date ?? "";
  return (
    startDate !== "" &&
    startDate <= date &&
    (member.end_date === null || member.end_date >= date)
  );
};

const getFeaturedMinisterKey = (
  member: GovernmentMember,
): FeaturedMinisterKey | null => {
  switch (normalizeRoleName(member.name)) {
    case "pääministeri":
      return "primeMinister";
    case "valtiovarainministeri":
      return "financeMinister";
    case "sisäministeri":
      return "interiorMinister";
    default:
      return null;
  }
};

const compareMembersByRecency = (a: GovernmentMember, b: GovernmentMember) => {
  const endA = a.end_date ?? "9999-99-99";
  const endB = b.end_date ?? "9999-99-99";
  if (endA !== endB) return endB.localeCompare(endA);
  const startA = a.start_date ?? "";
  const startB = b.start_date ?? "";
  if (startA !== startB) return startB.localeCompare(startA);
  return getMemberDisplayName(a).localeCompare(getMemberDisplayName(b), "fi");
};

const compareMembersByRole = (a: GovernmentMember, b: GovernmentMember) => {
  const roleCompare = (a.name ?? "").localeCompare(b.name ?? "", "fi");
  if (roleCompare !== 0) return roleCompare;
  return getMemberDisplayName(a).localeCompare(getMemberDisplayName(b), "fi");
};

const segmentGovernmentMembers = (
  members: GovernmentMember[],
  selectedDate: string,
) => {
  const featuredCurrent = new Map<FeaturedMinisterKey, GovernmentMember>();
  const otherCurrent: GovernmentMember[] = [];
  const previous: GovernmentMember[] = [];

  for (const member of members) {
    if (isMemberActiveOnDate(member, selectedDate)) {
      const featuredKey = getFeaturedMinisterKey(member);
      if (!featuredKey) {
        otherCurrent.push(member);
        continue;
      }

      const existing = featuredCurrent.get(featuredKey);
      if (!existing || compareMembersByRecency(member, existing) < 0) {
        featuredCurrent.set(featuredKey, member);
      }
      continue;
    }

    if (member.end_date && member.end_date < selectedDate) {
      previous.push(member);
    }
  }

  const orderedFeaturedKeys: FeaturedMinisterKey[] = [
    "primeMinister",
    "financeMinister",
    "interiorMinister",
  ];

  return {
    featuredCurrent: orderedFeaturedKeys.flatMap((key) => {
      const member = featuredCurrent.get(key);
      return member ? [{ key, member }] : [];
    }),
    otherCurrent: otherCurrent.sort(compareMembersByRole),
    previous: previous.sort(compareMembersByRecency),
  };
};

const featuredRoleColors: Record<FeaturedMinisterKey, string> = {
  primeMinister: "#1B2A4A",
  financeMinister: "#0F766E",
  interiorMinister: "#C2410C",
};

const TimelineSelector: React.FC<{
  hallituskaudet: HallituskausiPeriod[];
  date: string;
  onDateChange: (date: string) => void;
}> = ({ hallituskaudet, date, onDateChange }) => {
  const { t } = useScopedTranslation("hallitukset");
  const tc = useThemedColors();

  const sorted = [...hallituskaudet].sort((a, b) =>
    a.startDate < b.startDate ? -1 : 1,
  );
  const rangeStart = sorted[0]?.startDate ?? "2000-01-01";
  const rangeEnd = todayIso();

  const startMs = new Date(rangeStart).getTime();
  const endMs = new Date(rangeEnd).getTime();
  const span = endMs - startMs;

  if (span <= 0 || sorted.length === 0) return null;

  const toMs = (value: string) => new Date(value).getTime();
  const toDate = (value: number) => new Date(value).toISOString().split("T")[0];
  const toPct = (value: string) =>
    Math.max(0, Math.min(100, ((toMs(value) - startMs) / span) * 100));

  const currentMs = Math.max(startMs, Math.min(endMs, toMs(date)));

  type Segment =
    | {
        kind: "period";
        period: HallituskausiPeriod;
        duration: number;
        idx: number;
      }
    | { kind: "gap"; duration: number };

  const segments: Segment[] = [];
  let cursor = startMs;
  for (let i = 0; i < sorted.length; i++) {
    const period = sorted[i];
    const periodStart = Math.max(toMs(period.startDate), startMs);
    const periodEnd = Math.min(toMs(period.endDate ?? rangeEnd), endMs);
    if (periodStart > cursor) {
      segments.push({ kind: "gap", duration: periodStart - cursor });
    }
    if (periodEnd > Math.max(periodStart, cursor)) {
      const start = Math.max(periodStart, cursor);
      segments.push({
        kind: "period",
        period,
        duration: periodEnd - start,
        idx: i,
      });
      cursor = periodEnd;
    }
  }
  if (cursor < endMs) {
    segments.push({ kind: "gap", duration: endMs - cursor });
  }

  const startYear = new Date(rangeStart).getFullYear();
  const endYear = new Date(rangeEnd).getFullYear();
  const yearStep =
    endYear - startYear <= 8 ? 1 : endYear - startYear <= 16 ? 2 : 4;
  const yearTicks: number[] = [];
  for (let year = startYear + 1; year <= endYear; year++) {
    if ((year - startYear) % yearStep === 0) {
      const pct = toPct(`${year}-01-01`);
      if (pct > 2 && pct < 98) yearTicks.push(year);
    }
  }

  return (
    <DataCard sx={{ p: { xs: 2, md: 2.5 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { xs: "flex-start", sm: "center" }, mb: 2 }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: tc.textPrimary }}
          >
            {t("browseByDate")}
          </Typography>
          <Typography variant="body2" sx={{ color: tc.textSecondary, mt: 0.5 }}>
            {t("selectedDateLabel", { value: formatDateFi(date) })}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onDateChange(todayIso())}
          sx={{ textTransform: "none" }}
        >
          {t("returnToCurrentGovernment")}
        </Button>
      </Stack>

      <Box
        sx={{
          display: "flex",
          height: 30,
          borderRadius: 1,
          overflow: "hidden",
          border: `1px solid ${tc.dataBorder}`,
        }}
      >
        {segments.map((segment, index) => {
          if (segment.kind === "gap") {
            return (
              <Box
                key={`gap-${index}`}
                sx={{ flexGrow: segment.duration, flexBasis: 0, flexShrink: 1 }}
              />
            );
          }

          const { period, duration, idx } = segment;
          const isActive =
            toMs(date) >= toMs(period.startDate) &&
            toMs(date) <= toMs(period.endDate ?? rangeEnd);
          return (
            <Box
              key={period.id}
              title={period.label}
              onClick={() => onDateChange(period.startDate)}
              sx={{
                flexGrow: duration,
                flexBasis: 0,
                flexShrink: 1,
                bgcolor: isActive
                  ? `${tc.primary}22`
                  : idx % 2 === 0
                    ? `${tc.primary}0F`
                    : `${tc.primary}08`,
                color: isActive ? tc.primary : tc.textSecondary,
                display: "flex",
                alignItems: "center",
                px: 0.75,
                cursor: "pointer",
                transition: "background-color 0.15s ease",
                "&:hover": { bgcolor: `${tc.primary}18` },
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: isActive ? 700 : 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {period.name}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ px: 0.75, mt: 1 }}>
        <Slider
          value={currentMs}
          min={startMs}
          max={endMs}
          step={MS_PER_DAY}
          onChange={(_, value) => onDateChange(toDate(value as number))}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => formatDateFi(toDate(value))}
          sx={{
            py: "6px !important",
            color: tc.primary,
            "& .MuiSlider-thumb": {
              width: 14,
              height: 14,
            },
            "& .MuiSlider-rail": {
              bgcolor: tc.dataBorder,
              opacity: 1,
              height: 4,
            },
            "& .MuiSlider-track": {
              border: "none",
              height: 4,
              bgcolor: `${tc.primary}55`,
            },
          }}
        />
      </Box>

      <Box sx={{ position: "relative", height: 16 }}>
        {yearTicks.map((year) => (
          <Typography
            key={year}
            sx={{
              position: "absolute",
              left: `${toPct(`${year}-01-01`)}%`,
              transform: "translateX(-50%)",
              fontSize: "0.65rem",
              color: tc.textTertiary,
            }}
          >
            {year}
          </Typography>
        ))}
      </Box>
    </DataCard>
  );
};

const GovernmentHero: React.FC<{
  government: ActiveGovernmentResponse["government"];
  onShowMinisters: () => void;
  onBrowseArchive: () => void;
}> = ({ government, onShowMinisters, onBrowseArchive }) => {
  const { t } = useScopedTranslation("hallitukset");
  const tc = useThemedColors();

  if (!government) return null;

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        p: { xs: 2.25, md: 3.5 },
        color: "white",
        background: `
          radial-gradient(1200px 340px at -10% -20%, rgba(255,255,255,0.16), transparent 55%),
          radial-gradient(520px 260px at 100% 0%, rgba(232,145,58,0.26), transparent 60%),
          linear-gradient(125deg, ${tc.primary} 0%, #223965 58%, #34558A 100%)
        `,
        boxShadow: "0 14px 36px rgba(15, 27, 51, 0.22)",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
        >
          <Chip
            label={
              government.is_current ? t("current") : t("selectedGovernment")
            }
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: 700,
              border: "1px solid rgba(255,255,255,0.28)",
            }}
          />
        </Stack>

        <Box>
          <Typography
            variant="h3"
            sx={{
              fontSize: { xs: "1.75rem", md: "2.5rem" },
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {government.name}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "rgba(255,255,255,0.94)", mt: 1.25, maxWidth: 760 }}
          >
            {t("startedOn", { value: formatDateFi(government.start_date) })}
            {" • "}
            {formatDateRange(government.start_date, government.end_date)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {government.parties.map((party) => (
            <Chip
              key={party}
              label={party}
              sx={{
                bgcolor: "rgba(255,255,255,0.18)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.22)",
                fontWeight: 600,
              }}
            />
          ))}
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          <Button
            variant="contained"
            onClick={onShowMinisters}
            sx={{
              alignSelf: "flex-start",
              textTransform: "none",
              bgcolor: "white",
              color: tc.primary,
              fontWeight: 700,
              "&:hover": { bgcolor: "rgba(255,255,255,0.92)" },
            }}
          >
            {t("showMinisters")}
          </Button>
          <Button
            variant="outlined"
            onClick={onBrowseArchive}
            sx={{
              alignSelf: "flex-start",
              textTransform: "none",
              color: "white",
              borderColor: "rgba(255,255,255,0.32)",
              "&:hover": {
                borderColor: "rgba(255,255,255,0.46)",
                bgcolor: "rgba(255,255,255,0.08)",
              },
            }}
          >
            {t("browseHistory")}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

const GovernmentSummaryCards: React.FC<{
  government: NonNullable<ActiveGovernmentResponse["government"]>;
  totalGovernments: number;
}> = ({ government, totalGovernments }) => {
  const { t } = useScopedTranslation("hallitukset");

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          xl: "repeat(4, minmax(0, 1fr))",
        },
        gap: spacing.sm,
      }}
    >
      <MetricCard
        label={t("members")}
        value={government.member_count}
        icon={<PersonIcon fontSize="small" />}
      />
      <MetricCard
        label={t("governmentPartiesCount")}
        value={government.parties.length}
        icon={<GroupsIcon fontSize="small" />}
      />
      <MetricCard
        label={t("durationToDate")}
        value={formatDurationFi(government.start_date, government.end_date)}
        icon={<CalendarTodayIcon fontSize="small" />}
      />
      <MetricCard
        label={t("totalGovernments")}
        value={totalGovernments}
        icon={<AccountBalanceIcon fontSize="small" />}
      />
    </Box>
  );
};

const GovernmentMinistersSection: React.FC<{
  members: GovernmentMember[];
  selectedDate: string;
}> = ({ members, selectedDate }) => {
  const { t } = useScopedTranslation("hallitukset");
  const tc = useThemedColors();

  const segmented = useMemo(
    () => segmentGovernmentMembers(members, selectedDate),
    [members, selectedDate],
  );

  if (
    segmented.featuredCurrent.length === 0 &&
    segmented.otherCurrent.length === 0 &&
    segmented.previous.length === 0
  ) {
    return (
      <Box>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: tc.textPrimary }}
          >
            {t("currentMinistersTitle")}
          </Typography>
        </Stack>

        <EmptyState
          title={t("noMembers")}
          description={t("ministersUnavailableDescription")}
          icon={<PersonIcon fontSize="inherit" />}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: tc.textPrimary }}
        >
          {t("currentMinistersTitle")}
        </Typography>
      </Stack>

      <Stack spacing={spacing.sm}>
        {segmented.featuredCurrent.length > 0 && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: tc.textPrimary, mb: 1.25 }}
            >
              {t("featuredMinistersTitle")}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(3, minmax(0, 1fr))",
                },
                gap: spacing.sm,
              }}
            >
              {segmented.featuredCurrent.map(({ key, member }) => (
                <DataCard
                  key={member.id}
                  sx={{
                    p: 2.25,
                    borderColor: `${featuredRoleColors[key]}30`,
                    borderTop: `4px solid ${featuredRoleColors[key]}`,
                    boxShadow: "0 6px 18px rgba(15, 27, 51, 0.08)",
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Chip
                        label={t(key)}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          bgcolor: `${featuredRoleColors[key]}14`,
                          color: featuredRoleColors[key],
                        }}
                      />
                      {member.party && (
                        <Chip
                          label={member.party}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            bgcolor: tc.backgroundSubtle,
                            color: tc.textPrimary,
                            border: `1px solid ${tc.dataBorder}`,
                          }}
                        />
                      )}
                    </Stack>

                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 800, color: tc.textPrimary }}
                      >
                        {getMemberDisplayName(member)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: tc.textSecondary, mt: 0.5 }}
                      >
                        {member.name}
                      </Typography>
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{ color: tc.textSecondary, fontSize: "0.78rem" }}
                    >
                      {formatOptionalDateRange(
                        member.start_date,
                        member.end_date,
                      )}
                    </Typography>
                  </Stack>
                </DataCard>
              ))}
            </Box>
          </Box>
        )}

        {segmented.otherCurrent.length > 0 && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: tc.textPrimary, mb: 1.25 }}
            >
              {t("otherCurrentMinistersTitle")}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(3, minmax(0, 1fr))",
                },
                gap: spacing.sm,
              }}
            >
              {segmented.otherCurrent.map((member) => (
                <Paper
                  key={member.id}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${tc.dataBorder}`,
                    bgcolor: tc.backgroundPaper,
                  }}
                >
                  <Stack spacing={1}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: tc.textPrimary }}
                    >
                      {member.name ?? t("unknownMinisterRole")}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 600, color: tc.textPrimary }}
                    >
                      {getMemberDisplayName(member)}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {member.party && (
                        <Chip
                          label={member.party}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            bgcolor: `${tc.primary}12`,
                            color: tc.primary,
                          }}
                        />
                      )}
                      {member.ministry && member.ministry !== "Ministeri" && (
                        <Chip
                          label={member.ministry}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.7rem",
                            bgcolor: tc.backgroundSubtle,
                            color: tc.textSecondary,
                          }}
                        />
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {segmented.previous.length > 0 && (
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: tc.textPrimary, mb: 1.25 }}
            >
              {t("previousMinistersTitle")}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
                gap: spacing.sm,
              }}
            >
              {segmented.previous.map((member) => (
                <Paper
                  key={member.id}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${tc.dataBorder}`,
                    bgcolor: tc.backgroundSubtle,
                  }}
                >
                  <Stack spacing={0.75}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: tc.textPrimary }}
                      >
                        {member.name ?? t("unknownMinisterRole")}
                      </Typography>
                      {member.party && (
                        <Chip
                          label={member.party}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            bgcolor: `${tc.primary}12`,
                            color: tc.primary,
                          }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: 600, color: tc.textPrimary }}
                    >
                      {getMemberDisplayName(member)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: tc.textSecondary, fontSize: "0.78rem" }}
                    >
                      {formatOptionalDateRange(
                        member.start_date,
                        member.end_date,
                      )}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

const GovernmentArchiveItem: React.FC<{
  government: Government;
  isActive: boolean;
  initialMembers?: GovernmentMember[] | null;
}> = ({ government, isActive, initialMembers }) => {
  const { t } = useScopedTranslation("hallitukset");
  const tc = useThemedColors();
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<GovernmentMember[] | null>(
    initialMembers ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMembers) setMembers(initialMembers);
  }, [initialMembers]);

  useEffect(() => {
    if (!expanded || members !== null) return;

    setLoading(true);
    setError(null);
    apiFetch(`/api/hallitukset/${government.id}/members`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setMembers(data))
      .catch(() => setError(t("membersLoadError")))
      .finally(() => setLoading(false));
  }, [expanded, government.id, members, t]);

  const grouped = useMemo(
    () => groupMembersByMinistry(members ?? []),
    [members],
  );

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        border: `1px solid ${isActive ? tc.primary : tc.dataBorder}`,
        boxShadow: isActive ? `0 10px 22px ${tc.primary}18` : "none",
      }}
    >
      <Accordion
        expanded={expanded}
        onChange={(_, value) => setExpanded(value)}
        disableGutters
        elevation={0}
        sx={{ "&::before": { display: "none" } }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: isActive ? `${tc.primary}08` : tc.backgroundPaper,
            borderBottom: isActive ? `1px solid ${tc.primary}18` : undefined,
            "& .MuiAccordionSummary-content": { my: 0 },
          }}
        >
          <Stack spacing={1} sx={{ width: "100%" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{
                justifyContent: "space-between",
                alignItems: { sm: "center" },
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, color: tc.textPrimary }}
                >
                  {government.name}
                </Typography>
                {isActive && (
                  <Chip
                    label={t("selectedGovernment")}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor: `${tc.primary}18`,
                      color: tc.primary,
                    }}
                  />
                )}
              </Stack>
              <Typography variant="body2" sx={{ color: tc.textSecondary }}>
                {formatDateRange(government.start_date, government.end_date)}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {government.parties.map((party) => (
                <Chip
                  key={party}
                  label={party}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.72rem",
                    bgcolor: `${tc.primary}10`,
                    color: tc.primary,
                  }}
                />
              ))}
              <Chip
                label={t("ministerCount", { count: government.member_count })}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.72rem",
                  bgcolor: tc.backgroundSubtle,
                  color: tc.textSecondary,
                }}
              />
            </Stack>
          </Stack>
        </AccordionSummary>

        <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} sx={{ color: tc.primary }} />
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {!loading && !error && (
            <Stack spacing={1.5}>
              {grouped.length === 0 ? (
                <Typography variant="body2" sx={{ color: tc.textSecondary }}>
                  {t("noMembers")}
                </Typography>
              ) : (
                grouped.map(([ministry, ministryMembers]) => (
                  <Box key={ministry}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: tc.textPrimary, mb: 0.75 }}
                    >
                      {ministry}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {ministryMembers.map((member) => (
                        <Chip
                          key={member.id}
                          label={
                            member.party
                              ? `${getMemberDisplayName(member)} (${member.party})`
                              : getMemberDisplayName(member)
                          }
                          sx={{
                            justifyContent: "flex-start",
                            bgcolor: tc.backgroundSubtle,
                            color: tc.textPrimary,
                            border: `1px solid ${tc.dataBorder}`,
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default () => {
  const { t } = useScopedTranslation("hallitukset");
  const tc = useThemedColors();
  const { hallituskaudet } = useHallituskausi();

  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [governments, setGovernments] = useState<Government[]>([]);
  const [activePayload, setActivePayload] =
    useState<ActiveGovernmentResponse | null>(null);
  const [loadingGovernments, setLoadingGovernments] = useState(true);
  const [loadingActiveGovernment, setLoadingActiveGovernment] = useState(true);
  const [governmentsError, setGovernmentsError] = useState<string | null>(null);
  const [activeGovernmentError, setActiveGovernmentError] = useState<
    string | null
  >(null);

  const ministersRef = useRef<HTMLDivElement | null>(null);
  const archiveRef = useRef<HTMLDivElement | null>(null);

  const currentDate = todayIso();
  const isToday = selectedDate === currentDate;

  useEffect(() => {
    setLoadingGovernments(true);
    setGovernmentsError(null);
    apiFetch("/api/hallitukset")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setGovernments(data))
      .catch(() => setGovernmentsError(t("loadError")))
      .finally(() => setLoadingGovernments(false));
  }, [t]);

  useEffect(() => {
    setLoadingActiveGovernment(true);
    setActiveGovernmentError(null);
    const route =
      `/api/hallitukset/active?date=${encodeURIComponent(selectedDate)}` as const;

    apiFetch(route)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setActivePayload(data))
      .catch(() => setActiveGovernmentError(t("activeLoadError")))
      .finally(() => setLoadingActiveGovernment(false));
  }, [selectedDate, t]);

  const activeGovernment = activePayload?.government ?? null;
  const activeMembers = activePayload?.members ?? [];

  return (
    <Box>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Stack spacing={spacing.md}>
        {!isToday && (
          <Alert
            severity="info"
            icon={<HistoryIcon />}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setSelectedDate(currentDate)}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                {t("returnToCurrentGovernment")}
              </Button>
            }
            sx={{
              border: `1px solid ${tc.dataBorder}`,
              bgcolor: `${tc.info}08`,
            }}
          >
            {t("viewingHistoricalDate", { value: formatDateFi(selectedDate) })}
          </Alert>
        )}

        {loadingActiveGovernment ? (
          <DataCard sx={{ p: { xs: 3, md: 4 } }}>
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: tc.primary }} />
            </Box>
          </DataCard>
        ) : activeGovernmentError ? (
          <Alert severity="error">{activeGovernmentError}</Alert>
        ) : activeGovernment ? (
          <>
            <GovernmentHero
              government={activeGovernment}
              onShowMinisters={() =>
                ministersRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              onBrowseArchive={() =>
                archiveRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            />

            <GovernmentSummaryCards
              government={activeGovernment}
              totalGovernments={governments.length}
            />

            <Box ref={ministersRef}>
              <GovernmentMinistersSection
                members={activeMembers}
                selectedDate={selectedDate}
              />
            </Box>
          </>
        ) : (
          <EmptyState
            title={t("noGovernmentForDate")}
            description={t("noGovernmentForDateDescription")}
            icon={<TodayIcon fontSize="inherit" />}
          />
        )}

        <Box ref={archiveRef}>
          <Stack spacing={2}>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: tc.textPrimary, mb: 0.5 }}
              >
                {t("governmentArchiveTitle")}
              </Typography>
            </Box>

            <TimelineSelector
              hallituskaudet={hallituskaudet}
              date={selectedDate}
              onDateChange={setSelectedDate}
            />

            {loadingGovernments ? (
              <DataCard sx={{ p: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress sx={{ color: tc.primary }} />
                </Box>
              </DataCard>
            ) : governmentsError ? (
              <Alert severity="error">{governmentsError}</Alert>
            ) : (
              <Stack spacing={1.5}>
                {governments.map((government) => (
                  <GovernmentArchiveItem
                    key={government.id}
                    government={government}
                    isActive={government.id === activeGovernment?.id}
                    initialMembers={
                      government.id === activeGovernment?.id
                        ? activeMembers
                        : null
                    }
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};
