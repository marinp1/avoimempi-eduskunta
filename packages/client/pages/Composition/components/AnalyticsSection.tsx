import EventBusyIcon from "@mui/icons-material/EventBusy";
import MicIcon from "@mui/icons-material/Mic";
import TimelineIcon from "@mui/icons-material/Timeline";
import { Box, Drawer, Stack, Typography } from "@mui/material";
import type React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import Attendance from "#client/pages/Insights/Attendance";
import SpeechActivity from "#client/pages/Insights/SpeechActivity";
import TimeSeriesStatistics from "#client/pages/Insights/TimeSeriesStatistics";
import { ActionLink } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

type InsightDrawer = "attendance" | "speechActivity" | "timeSeries" | null;

export const AnalyticsSection: React.FC<{
  activeInsightDrawer: InsightDrawer;
  setActiveInsightDrawer: (value: InsightDrawer) => void;
}> = ({ activeInsightDrawer, setActiveInsightDrawer }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();

  return (
    <>
      <Box sx={{ mt: 2.5 }}>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 1,
            fontWeight: 700,
            color: themedColors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {t("analyticsSection.title")}
        </Typography>
        <Stack spacing={0}>
          {[
            {
              key: "attendance" as const,
              icon: <EventBusyIcon sx={{ fontSize: 20 }} />,
              title: t("analyticsSection.attendance.title"),
              description: t("analyticsSection.attendance.description"),
            },
            {
              key: "speechActivity" as const,
              icon: <MicIcon sx={{ fontSize: 20 }} />,
              title: t("analyticsSection.speechActivity.title"),
              description: t("analyticsSection.speechActivity.description"),
            },
            {
              key: "timeSeries" as const,
              icon: <TimelineIcon sx={{ fontSize: 20 }} />,
              title: t("analyticsSection.timeSeries.title"),
              description: t("analyticsSection.timeSeries.description"),
            },
          ].map((card) => (
            <ActionLink
              key={card.key}
              icon={card.icon}
              title={card.title}
              description={card.description}
              onClick={() => setActiveInsightDrawer(card.key)}
            />
          ))}
        </Stack>
      </Box>

      <Drawer
        anchor="right"
        open={activeInsightDrawer === "attendance"}
        onClose={() => setActiveInsightDrawer(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" },
            maxWidth: "1400px",
          },
        }}
      >
        <Attendance onClose={() => setActiveInsightDrawer(null)} />
      </Drawer>
      <Drawer
        anchor="right"
        open={activeInsightDrawer === "speechActivity"}
        onClose={() => setActiveInsightDrawer(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" },
            maxWidth: "1400px",
          },
        }}
      >
        <SpeechActivity onClose={() => setActiveInsightDrawer(null)} />
      </Drawer>
      <Drawer
        anchor="right"
        open={activeInsightDrawer === "timeSeries"}
        onClose={() => setActiveInsightDrawer(null)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" },
            maxWidth: "1400px",
          },
        }}
      >
        <TimeSeriesStatistics onClose={() => setActiveInsightDrawer(null)} />
      </Drawer>
    </>
  );
};
