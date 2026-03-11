import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BalanceIcon from "@mui/icons-material/Balance";
import EventIcon from "@mui/icons-material/Event";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import InsightsIcon from "@mui/icons-material/Insights";
import MicIcon from "@mui/icons-material/Mic";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TimelineIcon from "@mui/icons-material/Timeline";
import {
  Box,
  Button,
  Chip,
  Grid,
  Link,
  Typography,
} from "@mui/material";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import {
  colors,
  commonStyles,
  serifFontFamily,
  spacing,
} from "#client/theme";
import { DataCard, VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { formatDateLongFi, formatDateTimeCompactFi } from "#client/utils/date-time";
import type {
  HomeCloseVote,
  HomeCoalitionVote,
  HomeOverview,
  HomeRecentActivityItem,
  HomeSession,
  HomeSpeechActivityItem,
} from "./types";

type HomeTranslation = ReturnType<typeof useScopedTranslation<"home">>["t"];
type SessionsTranslation = ReturnType<
  typeof useScopedTranslation<"sessions">
>["t"];

const heroGradient =
  "linear-gradient(135deg, rgba(19,33,62,0.97) 0%, rgba(27,42,74,0.96) 56%, rgba(74,111,165,0.94) 100%)";

export const HomeHero = ({
  overview,
  tHome,
}: {
  overview: HomeOverview;
  tHome: HomeTranslation;
}) => {
  const themedColors = useThemedColors();
  const latestSession = overview.latestDay.sessions[0] ?? null;

  const quickLinks = [
    { href: latestSession ? refs.session(latestSession.key, latestSession.date) : "/istunnot", label: tHome("jumpLatestSession") },
    { href: "/aanestykset", label: tHome("jumpVotes") },
    { href: "/puolueet", label: tHome("jumpParties") },
    { href: "/analytiikka", label: tHome("jumpAnalytics") },
    { href: "/muutokset", label: tHome("jumpChanges") },
  ];

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        color: "#fff",
        background: heroGradient,
        boxShadow: "0 24px 48px rgba(19, 33, 62, 0.22)",
        border: "1px solid rgba(255,255,255,0.14)",
        mb: spacing.md,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(560px 260px at 10% 0%, rgba(232,145,58,0.18), transparent 70%), radial-gradient(540px 280px at 100% 0%, rgba(255,255,255,0.12), transparent 72%)",
          pointerEvents: "none",
        }}
      />
      <Grid container sx={{ position: "relative" }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ p: { xs: 2.25, md: 3.5 } }}>
            <Typography
              sx={{
                fontSize: "0.78rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#fff",
                opacity: 0.72,
                mb: 1,
              }}
            >
              {tHome("eyebrow")}
            </Typography>
            <Typography
              sx={{
                fontFamily: serifFontFamily,
                fontSize: { xs: "2rem", md: "2.7rem" },
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
                color: "#fff",
                mb: 1.25,
                maxWidth: "12ch",
              }}
            >
              {tHome("heroTitle")}
            </Typography>
            <Typography
              sx={{
                maxWidth: 760,
                color: "#fff",
                opacity: 0.82,
                fontSize: { xs: "0.95rem", md: "1.02rem" },
                lineHeight: 1.6,
              }}
            >
              {tHome("heroDescription")}
            </Typography>

            <Box
              sx={{
                mt: 2.25,
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1,
              }}
            >
              <HeroMetric
                label={tHome("heroAsOf")}
                value={formatDateLongFi(overview.scope.asOfDate)}
              />
              <HeroMetric
                label={tHome("heroLatestSession")}
                value={
                  overview.scope.latestCompletedSessionDate
                    ? formatDateLongFi(overview.scope.latestCompletedSessionDate)
                    : tHome("noData")
                }
              />
              <HeroMetric
                label={tHome("heroGovernment")}
                value={overview.scope.governmentName || tHome("allGovernments")}
              />
              <HeroMetric
                label={tHome("heroParties")}
                value={String(overview.composition.partyCount)}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2.5 }}>
              {quickLinks.map((link) => (
                <Button
                  key={link.href}
                  href={link.href}
                  variant="outlined"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.26)",
                    background: "rgba(255,255,255,0.06)",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.44)",
                      background: "rgba(255,255,255,0.11)",
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Box
            sx={{
              height: "100%",
              p: { xs: 2.25, md: 3 },
              borderLeft: { xs: "none", lg: "1px solid rgba(255,255,255,0.12)" },
              borderTop: { xs: "1px solid rgba(255,255,255,0.12)", lg: "none" },
              background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            }}
          >
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: "0.72rem",
                opacity: 0.74,
                mb: 1.25,
              }}
            >
              {tHome("freshnessTitle")}
            </Typography>
            <FreshnessLine
              label={tHome("freshnessDb")}
              value={overview.freshness.lastMigrationTimestamp}
            />
            <FreshnessLine
              label={tHome("freshnessScraper")}
              value={overview.freshness.lastScraperRunAt}
            />
            <FreshnessLine
              label={tHome("freshnessMigrator")}
              value={overview.freshness.lastMigratorRunAt}
            />
            {latestSession && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.74rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#fff",
                    opacity: 0.68,
                    mb: 0.5,
                  }}
                >
                  {tHome("spotlightTitle")}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {latestSession.key}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "0.82rem",
                  }}
                >
                  {latestSession.agenda_title || latestSession.description || tHome("spotlightFallback")}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1.25 }}>
                  <Chip
                    icon={<EventIcon sx={{ fontSize: "14px !important" }} />}
                    label={tHome("sectionCount", {
                      count: latestSession.section_count,
                    })}
                    size="small"
                    sx={{
                      color: "#fff",
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      "& .MuiChip-icon": {
                        color: "inherit",
                      },
                    }}
                  />
                  <Chip
                    icon={<HowToVoteIcon sx={{ fontSize: "14px !important" }} />}
                    label={tHome("votingCount", {
                      count: latestSession.voting_count,
                    })}
                    size="small"
                    sx={{
                      color: "#fff",
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      "& .MuiChip-icon": {
                        color: "inherit",
                      },
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

const HeroMetric = ({ label, value }: { label: string; value: string }) => (
  <Box
    sx={{
      p: 1.25,
      borderRadius: 2,
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.12)",
      minHeight: 72,
    }}
  >
    <Typography
      sx={{
        color: "#fff",
        opacity: 0.68,
        fontSize: "0.7rem",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontWeight: 700,
        fontSize: "0.95rem",
        lineHeight: 1.3,
        color: "#fff",
      }}
    >
      {value}
    </Typography>
  </Box>
);

const FreshnessLine = ({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) => (
  <Box sx={{ mb: 1.1 }}>
    <Typography sx={{ fontSize: "0.72rem", color: "#fff", opacity: 0.62 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: "0.84rem", color: "#fff" }}>
      {value ? formatDateTimeCompactFi(value) : "-"}
    </Typography>
  </Box>
);

export const HomeMetricStrip = ({
  overview,
  tHome,
}: {
  overview: HomeOverview;
  tHome: HomeTranslation;
}) => {
  const metrics = [
    {
      icon: <GroupsIcon fontSize="small" />,
      label: tHome("totalMPs"),
      value: overview.composition.totalMembers,
      tone: colors.primaryLight,
    },
    {
      icon: <AccountBalanceIcon fontSize="small" />,
      label: tHome("government"),
      value: overview.composition.governmentMembers,
      tone: colors.success,
    },
    {
      icon: <BalanceIcon fontSize="small" />,
      label: tHome("opposition"),
      value: overview.composition.oppositionMembers,
      tone: colors.warning,
    },
    {
      icon: <TimelineIcon fontSize="small" />,
      label: tHome("metricRecentActivity"),
      value: overview.signals.recentActivity.length,
      tone: colors.info,
    },
    {
      icon: <HowToVoteIcon fontSize="small" />,
      label: tHome("metricCloseVotes"),
      value: overview.signals.closeVotes.length,
      tone: colors.error,
    },
    {
      icon: <NotificationsActiveIcon fontSize="small" />,
      label: tHome("metricPartyCount"),
      value: overview.composition.partyCount,
      tone: colors.accent,
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))",
          xl: "repeat(6, minmax(0, 1fr))",
        },
        gap: 1.25,
        mb: spacing.md,
      }}
    >
      {metrics.map((metric) => (
        <DataCard key={metric.label} sx={{ p: 1.5, height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: `${metric.tone}14`,
                color: metric.tone,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {metric.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}>
                {metric.label}
              </Typography>
              <Typography sx={{ fontSize: "1.35rem", fontWeight: 700, lineHeight: 1.2 }}>
                {metric.value}
              </Typography>
            </Box>
          </Box>
        </DataCard>
      ))}
    </Box>
  );
};

export const CompositionPanel = ({
  overview,
  tHome,
}: {
  overview: HomeOverview;
  tHome: HomeTranslation;
}) => {
  const governmentWidth =
    overview.composition.totalMembers > 0
      ? (overview.composition.governmentMembers / overview.composition.totalMembers) *
        100
      : 0;

  return (
    <DataCard sx={{ p: 0, overflow: "hidden", height: "100%" }}>
      <PanelHeader
        eyebrow={tHome("compositionEyebrow")}
        title={tHome("compositionTitle")}
        description={tHome("compositionDescription")}
        actionHref="/puolueet"
        actionLabel={tHome("openParties")}
      />
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            background:
              "linear-gradient(180deg, rgba(27,42,74,0.03) 0%, rgba(27,42,74,0.08) 100%)",
            border: `1px solid ${colors.dataBorder}`,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box>
              <Typography sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}>
                {tHome("government")}
              </Typography>
              <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, color: colors.success }}>
                {overview.composition.governmentMembers}
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
              <Typography sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}>
                {tHome("opposition")}
              </Typography>
              <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, color: colors.warning }}>
                {overview.composition.oppositionMembers}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              mt: 1.25,
              height: 16,
              borderRadius: 99,
              overflow: "hidden",
              display: "flex",
              background: `${colors.warning}18`,
            }}
          >
            <Box
              sx={{
                width: `${governmentWidth}%`,
                background: `linear-gradient(90deg, ${colors.success} 0%, ${colors.successLight} 100%)`,
              }}
            />
            <Box sx={{ flex: 1, background: `linear-gradient(90deg, ${colors.warningLight} 0%, ${colors.warning} 100%)` }} />
          </Box>
        </Box>

        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          {overview.composition.parties.map((party) => (
            <Box
              key={party.party_code}
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 1,
                alignItems: "center",
                p: 1.25,
                borderRadius: 2,
                border: `1px solid ${colors.dataBorder}`,
                background: colors.backgroundSubtle,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                  <Link
                    href={`/puolueet?party=${encodeURIComponent(party.party_code)}`}
                    underline="hover"
                    sx={{
                      fontWeight: 700,
                      color: colors.textPrimary,
                      fontSize: "0.9rem",
                    }}
                  >
                    {party.party_name}
                  </Link>
                  <Chip
                    label={
                      party.is_in_government === 1
                        ? tHome("governmentChip")
                        : tHome("oppositionChip")
                    }
                    size="small"
                    sx={{
                      ...commonStyles.compactChipXs,
                      color:
                        party.is_in_government === 1
                          ? colors.success
                          : colors.warning,
                      background:
                        party.is_in_government === 1
                          ? `${colors.success}14`
                          : `${colors.warning}14`,
                    }}
                  />
                </Box>
                <Typography sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary, mt: 0.3 }}>
                  {tHome("participationRate", {
                    value: Math.round(party.participation_rate ?? 0),
                  })}
                </Typography>
              </Box>
              <Chip
                label={tHome("seatCount", { count: party.member_count })}
                size="small"
                sx={{
                  fontWeight: 700,
                  color: "#fff",
                  background: colors.primaryLight,
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    </DataCard>
  );
};

export const ProceedingsShell = ({
  tHome,
  latestDate,
  children,
}: {
  tHome: HomeTranslation;
  latestDate: string | null;
  children: React.ReactNode;
}) => (
  <DataCard sx={{ p: 0, overflow: "hidden" }}>
    <PanelHeader
      eyebrow={tHome("proceedingsEyebrow")}
      title={tHome("proceedingsTitle")}
      description={
        latestDate
          ? tHome("proceedingsDescription", {
              date: formatDateLongFi(latestDate),
            })
          : tHome("proceedingsDescriptionEmpty")
      }
      actionHref="/istunnot"
      actionLabel={tHome("openSessions")}
    />
    {children}
  </DataCard>
);

export const SessionSummaryCard = ({
  session,
  tHome,
  tSessions,
}: {
  session: HomeSession;
  tHome: HomeTranslation;
  tSessions: SessionsTranslation;
}) => (
  <Box
    sx={{
      p: 2,
      borderBottom: `1px solid ${colors.dataBorder}`,
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(243,245,247,0.85) 100%)",
    }}
  >
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: colors.textPrimary }}>
            {session.key}
          </Typography>
          <Chip
            size="small"
            label={tHome("sessionCountShort", { count: session.section_count })}
            sx={{
              ...commonStyles.compactChipSm,
              color: colors.primaryLight,
              background: `${colors.primaryLight}12`,
            }}
          />
          {session.voting_count > 0 && (
            <Chip
              size="small"
              icon={<HowToVoteIcon sx={{ fontSize: "14px !important" }} />}
              label={tHome("votingCount", { count: session.voting_count })}
              sx={{
                ...commonStyles.compactChipSm,
                color: colors.success,
                background: `${colors.success}12`,
              }}
            />
          )}
          {(session.notices?.length || 0) > 0 && (
            <Chip
              size="small"
              icon={<NotificationsActiveIcon sx={{ fontSize: "14px !important" }} />}
              label={tHome("noticeCount", {
                count: session.notices?.length ?? 0,
              })}
              sx={{
                ...commonStyles.compactChipSm,
                color: colors.warning,
                background: `${colors.warning}12`,
              }}
            />
          )}
        </Box>
        {(session.agenda_title || session.description) && (
          <Typography sx={{ mt: 0.75, color: colors.textSecondary, fontSize: "0.85rem" }}>
            {session.agenda_title || session.description}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Button
          href={refs.session(session.key, session.date)}
          size="small"
          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          sx={{ ...commonStyles.compactActionButton, textTransform: "none" }}
        >
          {tHome("openSessions")}
        </Button>
      </Box>
    </Box>
    {session.agenda_state && (
      <Typography sx={{ mt: 1, ...commonStyles.compactTextLg, color: colors.textTertiary }}>
        {tSessions("agendaStateLine", { value: session.agenda_state })}
      </Typography>
    )}
  </Box>
);

export const SignalsPanel = ({
  overview,
  tHome,
}: {
  overview: HomeOverview;
  tHome: HomeTranslation;
}) => {
  const emptyLabel = tHome("signalsEmpty");

  return (
    <Grid container spacing={2}>
    <Grid size={{ xs: 12, md: 6 }}>
      <SignalCard
        eyebrow={tHome("signalsRecentEyebrow")}
        title={tHome("signalsRecentTitle")}
        description={tHome("signalsRecentDescription")}
        actionHref="/istunnot"
        actionLabel={tHome("openSessions")}
      >
        {overview.signals.recentActivity.length > 0 ? overview.signals.recentActivity.map((item) => (
          <RecentActivityRow key={`${item.session_key}-${item.date}`} item={item} />
        )) : <EmptySignalState label={emptyLabel} />}
      </SignalCard>
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <SignalCard
        eyebrow={tHome("signalsCloseVoteEyebrow")}
        title={tHome("signalsCloseVoteTitle")}
        description={tHome("signalsCloseVoteDescription")}
        actionHref="/analytiikka?insight=closeVotes"
        actionLabel={tHome("openAnalytics")}
      >
        {overview.signals.closeVotes.length > 0 ? overview.signals.closeVotes.map((vote) => (
          <CloseVoteRow key={vote.id} vote={vote} />
        )) : <EmptySignalState label={emptyLabel} />}
      </SignalCard>
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <SignalCard
        eyebrow={tHome("signalsSpeechEyebrow")}
        title={tHome("signalsSpeechTitle")}
        description={tHome("signalsSpeechDescription")}
        actionHref="/analytiikka?insight=speechActivity"
        actionLabel={tHome("openAnalytics")}
      >
        {overview.signals.speechActivity.length > 0 ? overview.signals.speechActivity.map((item) => (
          <SpeechActivityRow key={item.person_id} item={item} />
        )) : <EmptySignalState label={emptyLabel} />}
      </SignalCard>
    </Grid>
    <Grid size={{ xs: 12, md: 6 }}>
      <SignalCard
        eyebrow={tHome("signalsCoalitionEyebrow")}
        title={tHome("signalsCoalitionTitle")}
        description={tHome("signalsCoalitionDescription")}
        actionHref="/analytiikka?insight=coalitionOpposition"
        actionLabel={tHome("openAnalytics")}
      >
        {overview.signals.coalitionOpposition.length > 0 ? overview.signals.coalitionOpposition.map((item) => (
          <CoalitionRow key={item.voting_id} item={item} />
        )) : <EmptySignalState label={emptyLabel} />}
      </SignalCard>
    </Grid>
    </Grid>
  );
};

const PanelHeader = ({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) => (
  <Box
    sx={{
      p: 2,
      borderBottom: `1px solid ${colors.dataBorder}`,
      display: "flex",
      justifyContent: "space-between",
      gap: 2,
      alignItems: "flex-start",
      flexWrap: "wrap",
      background: "rgba(255,255,255,0.84)",
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: "0.72rem",
          color: colors.primaryLight,
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          fontWeight: 700,
          mb: 0.4,
        }}
      >
        {eyebrow}
      </Typography>
      <Typography sx={{ fontSize: "1.08rem", fontWeight: 700, color: colors.textPrimary }}>
        {title}
      </Typography>
      <Typography sx={{ color: colors.textSecondary, mt: 0.45, maxWidth: 720 }}>
        {description}
      </Typography>
    </Box>
    {actionHref && actionLabel ? (
      <Button
        href={actionHref}
        size="small"
        endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
        sx={{
          ...commonStyles.compactOutlinedPrimaryButton,
          whiteSpace: "nowrap",
        }}
      >
        {actionLabel}
      </Button>
    ) : null}
  </Box>
);

const SignalCard = ({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  children: React.ReactNode;
}) => (
  <DataCard sx={{ p: 0, overflow: "hidden", height: "100%" }}>
    <PanelHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actionHref={actionHref}
      actionLabel={actionLabel}
    />
    <Box sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
      {children}
    </Box>
  </DataCard>
);

const EmptySignalState = ({ label }: { label: string }) => (
  <Typography
    sx={{
      p: 1.25,
      color: colors.textTertiary,
      fontSize: "0.82rem",
    }}
  >
    {label}
  </Typography>
);

const RowShell = ({
  icon,
  title,
  subtitle,
  href,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  footer?: React.ReactNode;
}) => (
  <Box
    sx={{
      p: 1.25,
      borderRadius: 2,
      border: `1px solid ${colors.dataBorder}`,
      background: colors.backgroundSubtle,
    }}
  >
    <Box sx={{ display: "flex", gap: 1.1 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: `${colors.primaryLight}12`,
          color: colors.primaryLight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, color: colors.textPrimary, fontSize: "0.84rem" }}>
            {title}
          </Typography>
          <Button
            href={href}
            size="small"
            sx={{ ...commonStyles.compactActionButton, textTransform: "none" }}
          >
            Avaa
          </Button>
        </Box>
        <Typography sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary, mt: 0.3 }}>
          {subtitle}
        </Typography>
        {footer && <Box sx={{ mt: 0.85 }}>{footer}</Box>}
      </Box>
    </Box>
  </Box>
);

const RecentActivityRow = ({ item }: { item: HomeRecentActivityItem }) => (
  <RowShell
    icon={<EventIcon sx={{ fontSize: 16 }} />}
    title={`${item.session_key} · ${formatDateLongFi(item.date)}`}
    subtitle={item.description || item.session_type}
    href={refs.session(item.session_key, item.date)}
    footer={
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        <Chip
          size="small"
          label={`${item.section_count} kohtaa`}
          sx={{ ...commonStyles.compactChipXs }}
        />
        <Chip
          size="small"
          label={`${item.voting_count} äänestystä`}
          sx={{ ...commonStyles.compactChipXs }}
        />
        <Chip
          size="small"
          label={`${item.close_vote_count} tiukkaa`}
          sx={{ ...commonStyles.compactChipXs }}
        />
      </Box>
    }
  />
);

const CloseVoteRow = ({ vote }: { vote: HomeCloseVote }) => (
  <RowShell
    icon={<HowToVoteIcon sx={{ fontSize: 16 }} />}
    title={vote.title}
    subtitle={`${vote.section_title} · marginaali ${vote.margin}`}
    href={refs.voting(vote.id, vote.session_key, vote.start_time)}
    footer={
      <VoteMarginBar
        yes={vote.n_yes}
        no={vote.n_no}
        empty={vote.n_abstain}
        absent={vote.n_absent}
        height={10}
      />
    }
  />
);

const SpeechActivityRow = ({ item }: { item: HomeSpeechActivityItem }) => (
  <RowShell
    icon={<MicIcon sx={{ fontSize: 16 }} />}
    title={`${item.first_name} ${item.last_name}`}
    subtitle={`${item.party || "-"} · ${item.speech_count} puheenvuoroa`}
    href={refs.member(item.person_id, item.last_speech)}
    footer={
      <Typography sx={{ ...commonStyles.compactTextLg, color: colors.textTertiary }}>
        {item.total_words.toLocaleString("fi-FI")} sanaa yhteensä
      </Typography>
    }
  />
);

const CoalitionRow = ({ item }: { item: HomeCoalitionVote }) => (
  <RowShell
    icon={<InsightsIcon sx={{ fontSize: 16 }} />}
    title={item.title}
    subtitle={item.section_title}
    href={refs.voting(item.voting_id, undefined, item.start_time)}
    footer={
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.5 }}>
        <Chip
          size="small"
          label={`Hallitus ${item.coalition_yes}-${item.coalition_no}`}
          sx={{ ...commonStyles.compactChipXs, justifyContent: "flex-start" }}
        />
        <Chip
          size="small"
          label={`Oppositio ${item.opposition_yes}-${item.opposition_no}`}
          sx={{ ...commonStyles.compactChipXs, justifyContent: "flex-start" }}
        />
      </Box>
    }
  />
);
