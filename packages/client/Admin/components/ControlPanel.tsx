import React from "react";
import {
  Box,
  CardContent,
  Typography,
  LinearProgress,
  Fade,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import { GlassCard, GradientButton } from "../../theme/components";
import { spacing } from "../../theme";

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
  return (
    <Fade in timeout={600}>
      <Box>
        <GlassCard sx={{ mb: spacing.md }}>
          <CardContent sx={{ p: spacing.md }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: spacing.sm,
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
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
                {lastUpdate && (
                  <Typography variant="caption" color="text.secondary">
                    Last update: {lastUpdate}
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
                  Start
                </GradientButton>
              ) : (
                <GradientButton
                  onClick={onStop}
                  startIcon={<StopIcon />}
                  sx={{
                    background:
                      "linear-gradient(135deg, #f44336 0%, #e91e63 100%)",
                  }}
                >
                  Stop
                </GradientButton>
              )}
            </Box>

            {isRunning && (
              <Box sx={{ mt: spacing.sm }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {progress}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    background: "rgba(0,0,0,0.1)",
                    "& .MuiLinearProgress-bar": {
                      background: gradient,
                      borderRadius: 4,
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
