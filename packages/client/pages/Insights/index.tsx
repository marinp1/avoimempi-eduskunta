import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BalanceIcon from "@mui/icons-material/Balance";
import BarChartIcon from "@mui/icons-material/BarChart";
import GavelIcon from "@mui/icons-material/Gavel";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import MicIcon from "@mui/icons-material/Mic";
import TimelineIcon from "@mui/icons-material/Timeline";
import {
  Box,
  CardContent,
  Drawer,
  Fade,
  Grid,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { spacing } from "#client/theme";
import { GlassCard } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import CloseVotes from "./CloseVotes";
import CoalitionOpposition from "./CoalitionOpposition";
import PartyDiscipline from "./PartyDiscipline";
import PartyParticipation from "./PartyParticipation";
import SpeechActivity from "./SpeechActivity";
import TimeSeriesStatistics from "./TimeSeriesStatistics";
import OsallistumisaktiivisuusPanel from "./VotingActivity";

type DrawerType =
  | "timeSeries"
  | "partyParticipation"
  | "votingActivity"
  | "partyDiscipline"
  | "closeVotes"
  | "coalitionOpposition"
  | "speechActivity"
  | null;

export default () => {
  const themedColors = useThemedColors();
  const { t } = useTranslation();
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [initialPersonId, setInitialPersonId] = useState<number | null>(null);

  // URL-based state for voting activity drawer
  const updateUrl = (open: boolean, personId?: number | null) => {
    const params = new URLSearchParams(window.location.search);
    if (open) {
      params.set("participation", "true");
      if (personId) params.set("personId", personId.toString());
      else params.delete("personId");
    } else {
      params.delete("participation");
      params.delete("personId");
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.pushState({}, "", newUrl);
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("participation") === "true") {
        setActiveDrawer("votingActivity");
        const personIdParam = params.get("personId");
        if (personIdParam) {
          const personId = parseInt(personIdParam, 10);
          if (!Number.isNaN(personId)) setInitialPersonId(personId);
        }
      }
    };
    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  const openDrawer = (drawer: DrawerType, personId?: number) => {
    setActiveDrawer(drawer);
    if (drawer === "votingActivity") {
      if (personId) setInitialPersonId(personId);
      updateUrl(true, personId);
    }
  };

  const closeDrawer = () => {
    if (activeDrawer === "votingActivity") {
      setInitialPersonId(null);
      updateUrl(false);
    }
    setActiveDrawer(null);
  };

  const cards: {
    key: DrawerType;
    icon: React.ReactNode;
    iconColor: string;
    titleKey: string;
    descriptionKey: string;
    actionKey: string;
    actionColor: string;
    actionBg: string;
  }[] = [
    {
      key: "timeSeries",
      icon: <TimelineIcon sx={{ fontSize: 40 }} />,
      iconColor: themedColors.primary,
      titleKey: "insights.cards.timeSeriesStats.title",
      descriptionKey: "insights.cards.timeSeriesStats.description",
      actionKey: "insights.cards.timeSeriesStats.action",
      actionColor: themedColors.primary,
      actionBg: "rgba(102, 126, 234, 0.1)",
    },
    {
      key: "partyParticipation",
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      iconColor: themedColors.success,
      titleKey: "insights.cards.partyParticipation.title",
      descriptionKey: "insights.cards.partyParticipation.description",
      actionKey: "insights.cards.partyParticipation.action",
      actionColor: themedColors.success,
      actionBg: "rgba(76, 175, 80, 0.1)",
    },
    {
      key: "partyDiscipline",
      icon: <GavelIcon sx={{ fontSize: 40 }} />,
      iconColor: themedColors.warning,
      titleKey: "insights.cards.partyDiscipline.title",
      descriptionKey: "insights.cards.partyDiscipline.description",
      actionKey: "insights.cards.partyDiscipline.action",
      actionColor: themedColors.warning,
      actionBg: "rgba(255, 152, 0, 0.1)",
    },
    {
      key: "votingActivity",
      icon: <HowToVoteIcon sx={{ fontSize: 40 }} />,
      iconColor: themedColors.success,
      titleKey: "insights.cards.votingActivity.title",
      descriptionKey: "insights.cards.votingActivity.description",
      actionKey: "insights.cards.votingActivity.action",
      actionColor: themedColors.success,
      actionBg: "rgba(76, 175, 80, 0.1)",
    },
    {
      key: "closeVotes",
      icon: <BalanceIcon sx={{ fontSize: 40 }} />,
      iconColor: themedColors.primary,
      titleKey: "insights.cards.closeVotes.title",
      descriptionKey: "insights.cards.closeVotes.description",
      actionKey: "insights.cards.closeVotes.action",
      actionColor: themedColors.primary,
      actionBg: "rgba(102, 126, 234, 0.1)",
    },
    {
      key: "coalitionOpposition",
      icon: <AccountBalanceIcon sx={{ fontSize: 40 }} />,
      iconColor: themedColors.primary,
      titleKey: "insights.cards.coalitionOpposition.title",
      descriptionKey: "insights.cards.coalitionOpposition.description",
      actionKey: "insights.cards.coalitionOpposition.action",
      actionColor: themedColors.primary,
      actionBg: "rgba(102, 126, 234, 0.1)",
    },
    {
      key: "speechActivity",
      icon: <MicIcon sx={{ fontSize: 40 }} />,
      iconColor: themedColors.warning,
      titleKey: "insights.cards.speechActivity.title",
      descriptionKey: "insights.cards.speechActivity.description",
      actionKey: "insights.cards.speechActivity.action",
      actionColor: themedColors.warning,
      actionBg: "rgba(255, 152, 0, 0.1)",
    },
  ];

  const drawerPaperProps = {
    sx: {
      width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" },
      maxWidth: "1400px",
    },
  };

  return (
    <Box>
      {/* Header Card */}
      <Fade in timeout={500}>
        <Box>
          <GlassCard
            sx={{
              mb: spacing.lg,
              background: themedColors.glassBackground,
              border: `1px solid ${themedColors.glassBorder}`,
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: spacing.lg }, textAlign: "center" }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  background: themedColors.primaryGradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 700,
                  mb: spacing.md,
                  fontSize: { xs: "1.5rem", sm: "2.125rem" },
                }}
              >
                {t("insights.title")}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t("insights.subtitle")}
              </Typography>
            </CardContent>
          </GlassCard>
        </Box>
      </Fade>

      {/* Insights Grid */}
      <Fade in timeout={600}>
        <Box>
          <Grid container spacing={spacing.md}>
            {cards.map((card) => (
              <Grid key={card.key} size={{ xs: 12, md: 6 }}>
                <Box onClick={() => openDrawer(card.key!)} sx={{ height: "100%" }}>
                  <GlassCard
                    sx={{
                      height: "100%",
                      background: themedColors.glassBackground,
                      border: `1px solid ${themedColors.glassBorder}`,
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 12px 24px rgba(102, 126, 234, 0.2)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: spacing.lg }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <Box sx={{ color: card.iconColor, mr: spacing.sm }}>
                          {card.icon}
                        </Box>
                        <Typography
                          variant="h5"
                          sx={{
                            background: themedColors.primaryGradient,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            fontWeight: 700,
                          }}
                        >
                          {t(card.titleKey)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {t(card.descriptionKey)}
                      </Typography>
                      <Box
                        sx={{
                          mt: spacing.md,
                          p: spacing.md,
                          borderRadius: 2,
                          background: card.actionBg,
                          textAlign: "center",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: card.actionColor, fontWeight: 600 }}
                        >
                          {t(card.actionKey)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </GlassCard>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Fade>

      {/* Drawers */}
      <Drawer anchor="right" open={activeDrawer === "votingActivity"} onClose={closeDrawer} PaperProps={drawerPaperProps}>
        <OsallistumisaktiivisuusPanel onClose={closeDrawer} initialPersonId={initialPersonId} />
      </Drawer>

      <Drawer anchor="right" open={activeDrawer === "timeSeries"} onClose={closeDrawer} PaperProps={drawerPaperProps}>
        <TimeSeriesStatistics onClose={closeDrawer} />
      </Drawer>

      <Drawer anchor="right" open={activeDrawer === "partyParticipation"} onClose={closeDrawer} PaperProps={drawerPaperProps}>
        <PartyParticipation onClose={closeDrawer} />
      </Drawer>

      <Drawer anchor="right" open={activeDrawer === "partyDiscipline"} onClose={closeDrawer} PaperProps={drawerPaperProps}>
        <PartyDiscipline onClose={closeDrawer} />
      </Drawer>

      <Drawer anchor="right" open={activeDrawer === "closeVotes"} onClose={closeDrawer} PaperProps={drawerPaperProps}>
        <CloseVotes onClose={closeDrawer} />
      </Drawer>

      <Drawer anchor="right" open={activeDrawer === "coalitionOpposition"} onClose={closeDrawer} PaperProps={drawerPaperProps}>
        <CoalitionOpposition onClose={closeDrawer} />
      </Drawer>

      <Drawer anchor="right" open={activeDrawer === "speechActivity"} onClose={closeDrawer} PaperProps={drawerPaperProps}>
        <SpeechActivity onClose={closeDrawer} />
      </Drawer>
    </Box>
  );
};
