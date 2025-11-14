import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  CardContent,
  CircularProgress,
  Alert,
  Fade,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BarChartIcon from "@mui/icons-material/BarChart";
import { GlassCard } from "../theme/components";
import { commonStyles, colors, spacing } from "../theme";

export default function InsightsPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Box>
      {/* Header Card */}
      <Fade in timeout={500}>
        <Box>
          <GlassCard sx={{ mb: spacing.lg }}>
            <CardContent sx={{ p: spacing.lg, textAlign: "center" }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  ...commonStyles.gradientText,
                  mb: spacing.md,
                }}
              >
                Eduskunnan analytiikka
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Syvällisiä näkemyksiä eduskunnan toiminnasta
              </Typography>
            </CardContent>
          </GlassCard>
        </Box>
      </Fade>

      {/* Insights Grid */}
      <Fade in timeout={600}>
        <Box>
          <Grid container spacing={spacing.md}>
            {/* Voting Trends */}
            <Grid item xs={12} md={6}>
              <GlassCard
                sx={{
                  height: "100%",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(102, 126, 234, 0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: spacing.lg }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <TrendingUpIcon
                      sx={{
                        fontSize: 40,
                        color: colors.primary,
                        mr: spacing.sm,
                      }}
                    />
                    <Typography
                      variant="h5"
                      sx={{ ...commonStyles.gradientText }}
                    >
                      Äänestystrendit
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Tulossa pian: Äänestystrendien analyysi ajanjaksolta
                  </Typography>
                  <Box
                    sx={{
                      mt: spacing.md,
                      p: spacing.md,
                      borderRadius: 2,
                      background: "rgba(102, 126, 234, 0.1)",
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Ominaisuus kehitteillä
                    </Typography>
                  </Box>
                </CardContent>
              </GlassCard>
            </Grid>

            {/* Party Performance */}
            <Grid item xs={12} md={6}>
              <GlassCard
                sx={{
                  height: "100%",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(102, 126, 234, 0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: spacing.lg }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <AssessmentIcon
                      sx={{
                        fontSize: 40,
                        color: colors.success,
                        mr: spacing.sm,
                      }}
                    />
                    <Typography
                      variant="h5"
                      sx={{ ...commonStyles.gradientText }}
                    >
                      Puolueiden suorituskyky
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Tulossa pian: Puolueiden äänestysaktiivisuus ja linjakkuus
                  </Typography>
                  <Box
                    sx={{
                      mt: spacing.md,
                      p: spacing.md,
                      borderRadius: 2,
                      background: "rgba(76, 175, 80, 0.1)",
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Ominaisuus kehitteillä
                    </Typography>
                  </Box>
                </CardContent>
              </GlassCard>
            </Grid>

            {/* Session Statistics */}
            <Grid item xs={12} md={6}>
              <GlassCard
                sx={{
                  height: "100%",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(102, 126, 234, 0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: spacing.lg }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <BarChartIcon
                      sx={{
                        fontSize: 40,
                        color: colors.warning,
                        mr: spacing.sm,
                      }}
                    />
                    <Typography
                      variant="h5"
                      sx={{ ...commonStyles.gradientText }}
                    >
                      Istuntotilastot
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Tulossa pian: Istuntojen kesto, osallistuminen ja tehokkuus
                  </Typography>
                  <Box
                    sx={{
                      mt: spacing.md,
                      p: spacing.md,
                      borderRadius: 2,
                      background: "rgba(255, 152, 0, 0.1)",
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Ominaisuus kehitteillä
                    </Typography>
                  </Box>
                </CardContent>
              </GlassCard>
            </Grid>

            {/* Representative Activity */}
            <Grid item xs={12} md={6}>
              <GlassCard
                sx={{
                  height: "100%",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(102, 126, 234, 0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: spacing.lg }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <TrendingUpIcon
                      sx={{
                        fontSize: 40,
                        color: colors.error,
                        mr: spacing.sm,
                      }}
                    />
                    <Typography
                      variant="h5"
                      sx={{ ...commonStyles.gradientText }}
                    >
                      Edustajien aktiivisuus
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Tulossa pian: Edustajien osallistumisaktiivisuus ja äänestyshistoria
                  </Typography>
                  <Box
                    sx={{
                      mt: spacing.md,
                      p: spacing.md,
                      borderRadius: 2,
                      background: "rgba(244, 67, 54, 0.1)",
                      textAlign: "center",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Ominaisuus kehitteillä
                    </Typography>
                  </Box>
                </CardContent>
              </GlassCard>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* Coming Soon Section */}
      <Fade in timeout={800}>
        <Box>
          <GlassCard sx={{ mt: spacing.lg }}>
            <CardContent sx={{ p: spacing.lg, textAlign: "center" }}>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ color: colors.primary, fontWeight: 600 }}
              >
                Lisää analytiikkaa tulossa pian
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Työskentelemme tuodaksemme sinulle kattavia näkemyksiä eduskunnan
                toiminnasta. Tarkista takaisin pian!
              </Typography>
            </CardContent>
          </GlassCard>
        </Box>
      </Fade>

      {/* Footer */}
      <Fade in timeout={900}>
        <Box>
          <Box
            sx={{
              mt: spacing.lg,
              p: spacing.md,
              textAlign: "center",
              borderRadius: 3,
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "text.secondary", fontWeight: 500 }}
            >
              Tietolähde: Eduskunnan avoin data
            </Typography>
          </Box>
        </Box>
      </Fade>
    </Box>
  );
}
