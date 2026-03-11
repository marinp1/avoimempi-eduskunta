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
import {
  Box,
  Button,
  Chip,
  Grid,
  Link,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { memo } from "react";
import type { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import { borderRadius, colors, commonStyles, spacing } from "#client/theme";
import { DataCard, PanelHeader, VoteMarginBar } from "#client/theme/components";
import {
  formatDateLongFi,
  formatDateTimeCompactFi,
} from "#client/utils/date-time";
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
const heroOuterRadius = `${borderRadius.heroOuter * 8}px`;
const heroInnerRadius = `${borderRadius.heroInner * 8}px`;

const HomeHeroComponent = ({
  overview,
  tHome,
}: {
  overview: HomeOverview;
  tHome: HomeTranslation;
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const latestSession = overview.latestDay.sessions[0] ?? null;
  const tightestVote = overview.signals.closeVotes[0] ?? null;
  const speechLeader = overview.signals.speechActivity[0] ?? null;
  const governmentWidth =
    overview.composition.totalMembers > 0
      ? (overview.composition.governmentMembers /
          overview.composition.totalMembers) *
        100
      : 0;

  const quickLinks = [
    {
      href: latestSession
        ? refs.session(latestSession.key, latestSession.date)
        : "/istunnot",
      label: tHome("jumpLatestSession"),
    },
    { href: "/aanestykset", label: tHome("jumpVotes") },
    { href: "/puolueet", label: tHome("jumpParties") },
    { href: "/analytiikka", label: tHome("jumpAnalytics") },
  ];
  const scopeItems = [
    overview.scope.governmentName || tHome("allGovernments"),
    `${tHome("heroAsOf")}: ${formatDateLongFi(overview.scope.asOfDate)}`,
    overview.scope.latestCompletedSessionDate
      ? `${tHome("heroLatestSession")}: ${formatDateLongFi(
          overview.scope.latestCompletedSessionDate,
        )}`
      : null,
  ].filter((item): item is string => Boolean(item));
  const summaryStats = [
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
      icon: <NotificationsActiveIcon fontSize="small" />,
      label: tHome("metricPartyCount"),
      value: overview.composition.partyCount,
      tone: colors.accent,
    },
  ];

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        color: "#fff",
        background: {
          xs: "linear-gradient(160deg, #13213E 0%, #1B2A4A 100%)",
          md: `linear-gradient(135deg, rgba(13,24,48,0.98) 0%, rgba(20,34,61,0.98) 44%, rgba(37,59,98,0.96) 100%), ${heroGradient}`,
        },
        boxShadow: {
          xs: "none",
          md: "0 28px 56px rgba(19, 33, 62, 0.22)",
        },
        border: "1px solid rgba(255,255,255,0.14)",
        mb: { xs: 0, md: spacing.md },
        borderRadius: { xs: 0, md: heroOuterRadius },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: { xs: 144, md: 220 },
          height: 4,
          borderBottomRightRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(74,111,165,0.94) 58%, rgba(232,145,58,0.95) 100%)",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: { xs: "none", md: "block" },
          background:
            "radial-gradient(560px 260px at 10% 0%, rgba(232,145,58,0.18), transparent 70%), radial-gradient(540px 280px at 100% 0%, rgba(255,255,255,0.14), transparent 72%), linear-gradient(135deg, rgba(255,255,255,0.04), transparent 48%)",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: { xs: 10, md: 12 },
          display: { xs: "none", md: "block" },
          borderRadius: heroInnerRadius,
          border: "1px solid rgba(255,255,255,0.08)",
          pointerEvents: "none",
        }}
      />

      <Grid
        container
        sx={{ position: "relative" }}
        columnSpacing={{ xs: 0, lg: 2 }}
        rowSpacing={{ xs: 2, lg: 0 }}
      >
        <Grid size={{ xs: 12, lg: 7 }}>
          <Box
            sx={{
              p: { xs: 2.25, md: 3.25 },
              display: "grid",
              gap: 2,
            }}
          >
            <Box sx={{ display: "grid", gap: 1.25 }}>
              <Typography
                sx={{
                  fontSize: { xs: "2rem", md: "2.65rem" },
                  lineHeight: 0.98,
                  letterSpacing: "-0.05em",
                  color: "#fff",
                  maxWidth: "10ch",
                }}
              >
                {tHome("heroTitle")}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {scopeItems.map((item) => (
                  <Chip key={item} size="small" label={item} sx={heroScopeChipSx} />
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                p: { xs: 1.5, md: 1.75 },
                borderRadius: heroInnerRadius,
                border: "1px solid rgba(255,255,255,0.14)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.05))",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
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
                      fontSize: { xs: "1rem", md: "1.08rem" },
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {latestSession?.key || tHome("heroNoSessionTitle")}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: "rgba(255,255,255,0.82)",
                      fontSize: "0.87rem",
                      lineHeight: 1.55,
                      maxWidth: 680,
                    }}
                  >
                    {latestSession
                      ? latestSession.agenda_title ||
                        latestSession.description ||
                        tHome("spotlightFallback")
                      : tHome("heroNoSessionDescription")}
                  </Typography>
                </Box>
                {latestSession && (
                  <Button
                    href={refs.session(latestSession.key, latestSession.date)}
                    size="small"
                    endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      ...commonStyles.compactActionButton,
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.08)",
                      textTransform: "none",
                      alignSelf: "flex-start",
                      "&:hover": {
                        borderColor: "rgba(255,255,255,0.3)",
                        background: "rgba(255,255,255,0.14)",
                      },
                    }}
                  >
                    {tHome("openSessions")}
                  </Button>
                )}
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    sm: "repeat(3, minmax(0, max-content))",
                  },
                  gap: 0.75,
                  mt: 1.25,
                }}
              >
                <Chip
                  icon={<EventIcon sx={{ fontSize: "14px !important" }} />}
                  label={tHome("sectionCount", {
                    count: latestSession?.section_count ?? 0,
                  })}
                  size="small"
                  sx={heroDetailChipSx}
                />
                <Chip
                  icon={<HowToVoteIcon sx={{ fontSize: "14px !important" }} />}
                  label={tHome("votingCount", {
                    count: latestSession?.voting_count ?? 0,
                  })}
                  size="small"
                  sx={heroDetailChipSx}
                />
                {latestSession?.agenda_state && (
                  <Chip
                    size="small"
                    label={latestSession.agenda_state}
                    sx={heroDetailChipSx}
                  />
                )}
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {quickLinks.map((link) => (
                <Button
                  key={link.href}
                  href={link.href}
                  variant={isMobile ? "text" : "outlined"}
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.22)",
                    background: isMobile
                      ? "transparent"
                      : "rgba(255,255,255,0.06)",
                    textTransform: "none",
                    px: isMobile ? 0 : 1.4,
                    minWidth: 0,
                    "&:hover": {
                      borderColor: "rgba(255,255,255,0.4)",
                      background: isMobile
                        ? "transparent"
                        : "rgba(255,255,255,0.11)",
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Box
            sx={{
              p: { xs: 2.25, md: 3.25 },
              pt: { xs: 0, lg: 3.25 },
              display: "grid",
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 1,
              }}
            >
              {summaryStats.map((metric) => (
                <HeroSummaryStat
                  key={metric.label}
                  icon={metric.icon}
                  label={metric.label}
                  value={metric.value}
                  tone={metric.tone}
                />
              ))}
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: heroInnerRadius,
                border: "1px solid rgba(255,255,255,0.14)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
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
                  mb: 1,
                }}
              >
                {tHome("heroSummaryTitle")}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                  flexWrap: "wrap",
                  mb: 0.85,
                }}
              >
                <Typography
                  sx={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}
                >
                  {tHome("heroBalanceLabel")}
                </Typography>
                <Typography
                  sx={{ color: "rgba(255,255,255,0.82)", fontSize: "0.82rem" }}
                >
                  {overview.composition.governmentMembers} /{" "}
                  {overview.composition.oppositionMembers}
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 14,
                  borderRadius: 99,
                  overflow: "hidden",
                  display: "flex",
                  background: "rgba(255,255,255,0.08)",
                  mb: 1.25,
                }}
              >
                <Box
                  sx={{
                    width: `${governmentWidth}%`,
                    background: `linear-gradient(90deg, ${colors.success} 0%, ${colors.successLight} 100%)`,
                  }}
                />
                <Box
                  sx={{
                    flex: 1,
                    background: `linear-gradient(90deg, ${colors.warningLight} 0%, ${colors.warning} 100%)`,
                  }}
                />
              </Box>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.74)",
                  fontSize: "0.82rem",
                  lineHeight: 1.55,
                }}
              >
                {tHome("heroSummaryDescription", {
                  count: overview.composition.partyCount,
                })}
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gap: 1 }}>
              <HeroSignalCard
                icon={<HowToVoteIcon sx={{ fontSize: 18 }} />}
                eyebrow={tHome("heroCloseVote")}
                title={
                  tightestVote
                    ? `${tightestVote.margin} ${tHome("heroVoteMarginUnit")}`
                    : tHome("noData")
                }
                description={
                  tightestVote
                    ? tightestVote.title || tightestVote.section_title
                    : tHome("signalsEmpty")
                }
                href={tightestVote?.proceedings_url || "/aanestykset"}
                actionLabel={tHome("jumpVotes")}
              />
              <HeroSignalCard
                icon={<MicIcon sx={{ fontSize: 18 }} />}
                eyebrow={tHome("heroSpeechLeader")}
                title={
                  speechLeader
                    ? `${speechLeader.first_name} ${speechLeader.last_name}`
                    : tHome("noData")
                }
                description={
                  speechLeader
                    ? tHome("heroSpeechLeaderDetail", {
                        party: speechLeader.party || tHome("noData"),
                        count: speechLeader.speech_count,
                      })
                    : tHome("signalsEmpty")
                }
                href="/analytiikka?insight=speechActivity"
                actionLabel={tHome("jumpAnalytics")}
              />
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Box
        sx={{
          position: "relative",
          px: { xs: 2.25, md: 3.25 },
          pb: { xs: 2, md: 2.25 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
            px: 1.25,
            py: 1,
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Typography
            sx={{
              color: "#fff",
              opacity: 0.72,
              fontSize: "0.77rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {tHome("heroFreshnessLabel")}
          </Typography>
          <Typography
            sx={{
              color: "#fff",
              fontSize: "0.84rem",
              fontWeight: 600,
            }}
          >
            {overview.freshness.lastMigrationTimestamp
              ? formatDateTimeCompactFi(overview.freshness.lastMigrationTimestamp)
              : "-"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export const HomeHero = memo(HomeHeroComponent);

const heroScopeChipSx = {
  color: "#fff",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.18)",
  fontWeight: 700,
} as const;

const heroDetailChipSx = {
  color: "#fff",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.16)",
  "& .MuiChip-icon": {
    color: "inherit",
  },
} as const;

const HeroSummaryStat = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
}) => (
  <Box
    sx={{
      position: "relative",
      overflow: "hidden",
      p: 1.35,
      borderRadius: heroInnerRadius,
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 100%)",
      border: "1px solid rgba(255,255,255,0.12)",
      minHeight: 88,
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: 2,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.08) 100%)",
      },
    }}
  >
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: `${tone}22`,
        color: tone,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mb: 1,
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        color: "#fff",
        opacity: 0.7,
        fontSize: "0.7rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        mb: 0.45,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontWeight: 700,
        fontSize: "1.35rem",
        lineHeight: 1.1,
        color: "#fff",
      }}
    >
      {value}
    </Typography>
  </Box>
);

const HeroSignalCard = ({
  icon,
  eyebrow,
  title,
  description,
  href,
  actionLabel,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}) => (
  <Box
    sx={{
      p: 1.35,
      borderRadius: heroInnerRadius,
      border: "1px solid rgba(255,255,255,0.12)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Button
        href={href}
        size="small"
        endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
        sx={{
          color: "#fff",
          minWidth: 0,
          px: 0,
          textTransform: "none",
        }}
      >
        {actionLabel}
      </Button>
    </Box>
    <Typography
      sx={{
        mt: 1.1,
        fontSize: "0.72rem",
        color: "#fff",
        opacity: 0.64,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {eyebrow}
    </Typography>
    <Typography
      sx={{
        mt: 0.35,
        color: "#fff",
        fontWeight: 700,
        fontSize: "1rem",
        lineHeight: 1.3,
      }}
    >
      {title}
    </Typography>
    <Typography
      sx={{
        mt: 0.45,
        color: "rgba(255,255,255,0.78)",
        fontSize: "0.82rem",
        lineHeight: 1.5,
      }}
    >
      {description}
    </Typography>
  </Box>
);

export const CompositionPanel = ({
  overview,
  tHome,
}: {
  overview: HomeOverview;
  tHome: HomeTranslation;
}) => {
  const governmentWidth =
    overview.composition.totalMembers > 0
      ? (overview.composition.governmentMembers /
          overview.composition.totalMembers) *
        100
      : 0;

  return (
    <DataCard sx={{ p: 0, overflow: "hidden", height: "100%" }}>
      <PanelHeader
        eyebrow={tHome("compositionEyebrow")}
        title={tHome("compositionTitle")}
        subtitle={tHome("compositionDescription")}
        actions={
          <Button
            href="/puolueet"
            size="small"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            sx={{
              ...commonStyles.compactOutlinedPrimaryButton,
              whiteSpace: "nowrap",
            }}
          >
            {tHome("openParties")}
          </Button>
        }
        sx={{ p: 2, background: "rgba(255,255,255,0.84)" }}
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textSecondary,
                }}
              >
                {tHome("government")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: colors.success,
                }}
              >
                {overview.composition.governmentMembers}
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textSecondary,
                }}
              >
                {tHome("opposition")}
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: colors.warning,
                }}
              >
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
            <Box
              sx={{
                flex: 1,
                background: `linear-gradient(90deg, ${colors.warningLight} 0%, ${colors.warning} 100%)`,
              }}
            />
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    flexWrap: "wrap",
                  }}
                >
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
                <Typography
                  sx={{
                    ...commonStyles.compactTextLg,
                    color: colors.textSecondary,
                    mt: 0.3,
                  }}
                >
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
      subtitle={
        latestDate
          ? tHome("proceedingsDescription", {
              date: formatDateLongFi(latestDate),
            })
          : tHome("proceedingsDescriptionEmpty")
      }
      actions={
        <Button
          href="/istunnot"
          size="small"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          sx={{
            ...commonStyles.compactOutlinedPrimaryButton,
            whiteSpace: "nowrap",
          }}
        >
          {tHome("openSessions")}
        </Button>
      }
      sx={{ p: 2, background: "rgba(255,255,255,0.84)" }}
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
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "1rem",
              color: colors.textPrimary,
            }}
          >
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
              icon={
                <NotificationsActiveIcon sx={{ fontSize: "14px !important" }} />
              }
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
          <Typography
            sx={{ mt: 0.75, color: colors.textSecondary, fontSize: "0.85rem" }}
          >
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
      <Typography
        sx={{
          mt: 1,
          ...commonStyles.compactTextLg,
          color: colors.textTertiary,
        }}
      >
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
          {overview.signals.recentActivity.length > 0 ? (
            overview.signals.recentActivity.map((item) => (
              <RecentActivityRow
                key={`${item.session_key}-${item.date}`}
                item={item}
              />
            ))
          ) : (
            <EmptySignalState label={emptyLabel} />
          )}
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
          {overview.signals.closeVotes.length > 0 ? (
            overview.signals.closeVotes.map((vote) => (
              <CloseVoteRow key={vote.id} vote={vote} />
            ))
          ) : (
            <EmptySignalState label={emptyLabel} />
          )}
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
          {overview.signals.speechActivity.length > 0 ? (
            overview.signals.speechActivity.map((item) => (
              <SpeechActivityRow key={item.person_id} item={item} />
            ))
          ) : (
            <EmptySignalState label={emptyLabel} />
          )}
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
          {overview.signals.coalitionOpposition.length > 0 ? (
            overview.signals.coalitionOpposition.map((item) => (
              <CoalitionRow key={item.voting_id} item={item} />
            ))
          ) : (
            <EmptySignalState label={emptyLabel} />
          )}
        </SignalCard>
      </Grid>
    </Grid>
  );
};

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
      subtitle={description}
      actions={
        actionHref && actionLabel ? (
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
        ) : null
      }
      sx={{ p: 2, background: "rgba(255,255,255,0.84)" }}
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              color: colors.textPrimary,
              fontSize: "0.84rem",
            }}
          >
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
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            color: colors.textSecondary,
            mt: 0.3,
          }}
        >
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
      <Typography
        sx={{ ...commonStyles.compactTextLg, color: colors.textTertiary }}
      >
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
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 0.5,
        }}
      >
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
