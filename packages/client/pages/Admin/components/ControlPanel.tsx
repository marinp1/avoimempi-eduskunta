import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import {
  Box,
  CardContent,
  Fade,
  LinearProgress,
  Typography,
} from "@mui/material";
import type React from "react";
import { useTranslation } from "react-i18next";
import { gradients, spacing } from "#client/theme";
import { GlassCard, GradientButton } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

interface ControlPanelProps {
  title: string;
  description: string;
  isRunning: boolean;
  progress: string;
  progressPercent: number;
  onStart: () => void;
  onStop: () => void;
  gradient: string;
  disabled?: boolean;
  lastUpdate?: string | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  title,
  description,
  isRunning,
  progress,
  progressPercent,
  onStart,
  onStop,
  gradient,
  disabled = false,
  lastUpdate,
}) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  return (
    <Fade in timeout={600}>
      <Box>
        <GlassCard sx={{ mb: spacing.sm }}>
          <CardContent sx={{ p: spacing.sm, "&:last-child": { pb: spacing.sm } }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="600"
                  sx={{
                    background: gradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {description}
                </Typography>
                {lastUpdate && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    {t("admin.controlPanel.lastUpdate")} {lastUpdate}
                  </Typography>
                )}
              </Box>

              {!isRunning ? (
                <GradientButton
                  onClick={onStart}
                  startIcon={<PlayArrowIcon />}
                  disabled={disabled}
                  sx={{ background: gradient }}
                >
                  {t("admin.controlPanel.start")}
                </GradientButton>
              ) : (
                <GradientButton
                  onClick={onStop}
                  startIcon={<StopIcon />}
                  sx={{
                    background: gradients.danger,
                  }}
                >
                  {t("admin.controlPanel.stop")}
                </GradientButton>
              )}
            </Box>

            {isRunning && (
              <Box sx={{ mt: spacing.sm }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, display: "block" }}
                >
                  {progress}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: themedColors.backgroundSubtle,
                    "& .MuiLinearProgress-bar": {
                      background: gradient,
                      borderRadius: 3,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  {progressPercent.toFixed(1)}%
                </Typography>
              </Box>
            )}
          </CardContent>
        </GlassCard>
      </Box>
    </Fade>
  );
};
