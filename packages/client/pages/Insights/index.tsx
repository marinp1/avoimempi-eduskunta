import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BalanceIcon from "@mui/icons-material/Balance";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GavelIcon from "@mui/icons-material/Gavel";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import MicIcon from "@mui/icons-material/Mic";
import TimelineIcon from "@mui/icons-material/Timeline";
import {
  Box,
  CardActionArea,
  CardContent,
  Chip,
  Drawer,
  Grid,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import type fi from "#client/i18n/locales/fi.json";
import { useScopedTranslation } from "#client/i18n/scoped";
import { spacing } from "#client/theme";
import { DataCard, PageHeader } from "#client/theme/components";
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

type DrawerKey = Exclude<DrawerType, null>;
type InsightsCardTranslationName = keyof (typeof fi)["insights"]["cards"];
type InsightsTitleKey = `cards.${InsightsCardTranslationName}.title`;
type InsightsDescriptionKey =
  `cards.${InsightsCardTranslationName}.description`;
type InsightCard = {
  key: DrawerKey;
  icon: React.ReactNode;
  titleKey: InsightsTitleKey;
  descriptionKey: InsightsDescriptionKey;
};

export default () => {
  const themedColors = useThemedColors();
  const { t } = useScopedTranslation("insights");
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [initialPersonId, setInitialPersonId] = useState<number | null>(null);

  // URL-based state
  const updateUrl = (
    open: boolean,
    drawer?: DrawerKey,
    personId?: number | null,
  ) => {
    const params = new URLSearchParams(window.location.search);
    if (open && drawer) {
      params.set("insight", drawer);
      if (drawer === "votingActivity" && personId) {
        params.set("personId", personId.toString());
      } else {
        params.delete("personId");
      }
    } else {
      params.delete("insight");
      params.delete("personId");
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.pushState({}, "", newUrl);
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const insight = params.get("insight") as DrawerKey | null;
      if (insight) {
        setActiveDrawer(insight);
        if (insight === "votingActivity") {
          const personIdParam = params.get("personId");
          if (personIdParam) {
            const personId = parseInt(personIdParam, 10);
            if (!Number.isNaN(personId)) setInitialPersonId(personId);
          }
        }
      }
    };
    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  const openDrawer = (drawer: DrawerKey, personId?: number) => {
    setActiveDrawer(drawer);
    if (drawer === "votingActivity" && personId) setInitialPersonId(personId);
    updateUrl(true, drawer, personId);
  };

  const closeDrawer = () => {
    if (activeDrawer === "votingActivity") setInitialPersonId(null);
    setActiveDrawer(null);
    updateUrl(false);
  };

  const cards = [
    {
      key: "timeSeries",
      icon: <TimelineIcon sx={{ fontSize: 24 }} />,
      titleKey: "cards.timeSeriesStats.title",
      descriptionKey: "cards.timeSeriesStats.description",
    },
    {
      key: "partyParticipation",
      icon: <AssessmentIcon sx={{ fontSize: 24 }} />,
      titleKey: "cards.partyParticipation.title",
      descriptionKey: "cards.partyParticipation.description",
    },
    {
      key: "partyDiscipline",
      icon: <GavelIcon sx={{ fontSize: 24 }} />,
      titleKey: "cards.partyDiscipline.title",
      descriptionKey: "cards.partyDiscipline.description",
    },
    {
      key: "votingActivity",
      icon: <HowToVoteIcon sx={{ fontSize: 24 }} />,
      titleKey: "cards.votingActivity.title",
      descriptionKey: "cards.votingActivity.description",
    },
    {
      key: "closeVotes",
      icon: <BalanceIcon sx={{ fontSize: 24 }} />,
      titleKey: "cards.closeVotes.title",
      descriptionKey: "cards.closeVotes.description",
    },
    {
      key: "coalitionOpposition",
      icon: <AccountBalanceIcon sx={{ fontSize: 24 }} />,
      titleKey: "cards.coalitionOpposition.title",
      descriptionKey: "cards.coalitionOpposition.description",
    },
    {
      key: "speechActivity",
      icon: <MicIcon sx={{ fontSize: 24 }} />,
      titleKey: "cards.speechActivity.title",
      descriptionKey: "cards.speechActivity.description",
    },
  ] as const satisfies readonly InsightCard[];

  const drawerPaperProps = {
    sx: {
      width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" },
      maxWidth: "1400px",
    },
  };

  return (
    <Box>
      <PageHeader
        title={t("title")}
        summary={t("summary")}
        mobileMode="compact"
        mobileAnchorId="insights-content"
        mobileSummary={
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <Chip size="small" label="Äänestykset" sx={{ fontWeight: 700 }} />
            <Chip size="small" label="Puolueet" sx={{ fontWeight: 700 }} />
            <Chip size="small" label="Puheenvuorot" sx={{ fontWeight: 700 }} />
          </Box>
        }
      />

      <Grid container spacing={spacing.sm} id="insights-content">
        {cards.map((card) => (
          <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 4 }}>
            <DataCard sx={{ height: "100%", p: 0 }}>
              <CardActionArea
                onClick={() => openDrawer(card.key)}
                sx={{
                  height: "100%",
                  borderRadius: "inherit",
                  display: "flex",
                  alignItems: "stretch",
                }}
              >
                <CardContent
                  sx={{
                    p: spacing.md,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    width: "100%",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                      }}
                    >
                      <Box
                        sx={{
                          color: themedColors.primary,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.9375rem",
                          color: themedColors.textPrimary,
                          lineHeight: 1.3,
                        }}
                      >
                        {t(card.titleKey)}
                      </Typography>
                    </Box>
                    <ChevronRightIcon
                      sx={{
                        fontSize: 18,
                        color: themedColors.textTertiary,
                        flexShrink: 0,
                        ml: 1,
                      }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: themedColors.textSecondary, lineHeight: 1.5 }}
                  >
                    {t(card.descriptionKey)}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </DataCard>
          </Grid>
        ))}
      </Grid>

      {/* Drawers */}
      <Drawer
        anchor="right"
        open={activeDrawer === "votingActivity"}
        onClose={closeDrawer}
        PaperProps={drawerPaperProps}
      >
        <OsallistumisaktiivisuusPanel
          onClose={closeDrawer}
          initialPersonId={initialPersonId}
        />
      </Drawer>

      <Drawer
        anchor="right"
        open={activeDrawer === "timeSeries"}
        onClose={closeDrawer}
        PaperProps={drawerPaperProps}
      >
        <TimeSeriesStatistics onClose={closeDrawer} />
      </Drawer>

      <Drawer
        anchor="right"
        open={activeDrawer === "partyParticipation"}
        onClose={closeDrawer}
        PaperProps={drawerPaperProps}
      >
        <PartyParticipation onClose={closeDrawer} />
      </Drawer>

      <Drawer
        anchor="right"
        open={activeDrawer === "partyDiscipline"}
        onClose={closeDrawer}
        PaperProps={drawerPaperProps}
      >
        <PartyDiscipline onClose={closeDrawer} />
      </Drawer>

      <Drawer
        anchor="right"
        open={activeDrawer === "closeVotes"}
        onClose={closeDrawer}
        PaperProps={drawerPaperProps}
      >
        <CloseVotes onClose={closeDrawer} />
      </Drawer>

      <Drawer
        anchor="right"
        open={activeDrawer === "coalitionOpposition"}
        onClose={closeDrawer}
        PaperProps={drawerPaperProps}
      >
        <CoalitionOpposition onClose={closeDrawer} />
      </Drawer>

      <Drawer
        anchor="right"
        open={activeDrawer === "speechActivity"}
        onClose={closeDrawer}
        PaperProps={drawerPaperProps}
      >
        <SpeechActivity onClose={closeDrawer} />
      </Drawer>
    </Box>
  );
};
