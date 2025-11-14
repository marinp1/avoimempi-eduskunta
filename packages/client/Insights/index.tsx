import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  CardContent,
  CircularProgress,
  Alert,
  Fade,
  Drawer,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BarChartIcon from "@mui/icons-material/BarChart";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import { GlassCard } from "../theme/components";
import { commonStyles, colors, spacing } from "../theme";
import OsallistumisaktiivisuusPanel from "./Osallistumisaktiivisuus";

export default function InsightsPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [initialPersonId, setInitialPersonId] = useState<number | null>(null);

  // Update URL when drawer state changes
  const updateUrl = (open: boolean, personId?: number | null) => {
    const params = new URLSearchParams(window.location.search);

    if (open) {
      params.set("participation", "true");
      if (personId) {
        params.set("personId", personId.toString());
      } else {
        params.delete("personId");
      }
    } else {
      params.delete("participation");
      params.delete("personId");
    }

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.pushState({}, "", newUrl);
  };

  // Check URL parameters on mount and handle browser navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const participationParam = params.get("participation");
      const personIdParam = params.get("personId");

      if (participationParam === "true") {
        setDrawerOpen(true);
        if (personIdParam) {
          const personId = parseInt(personIdParam, 10);
          if (!isNaN(personId)) {
            setInitialPersonId(personId);
          }
        }
      } else {
        setDrawerOpen(false);
        setInitialPersonId(null);
      }
    };

    // Handle initial load
    handleUrlChange();

    // Handle browser back/forward buttons
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  const handleDrawerOpen = (personId?: number) => {
    setDrawerOpen(true);
    if (personId) {
      setInitialPersonId(personId);
    }
    updateUrl(true, personId);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setInitialPersonId(null);
    updateUrl(false);
  };

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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Box onClick={() => handleDrawerOpen()} sx={{ height: "100%" }}>
                <GlassCard
                  sx={{
                    height: "100%",
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
                      <HowToVoteIcon
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
                        Äänestysosallistuminen
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Seuraa kansanedustajien äänestysosallistumista eri
                      vaalikausilla
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
                      <Typography
                        variant="body2"
                        sx={{ color: colors.success, fontWeight: 600 }}
                      >
                        Katso analytiikka →
                      </Typography>
                    </Box>
                  </CardContent>
                </GlassCard>
              </Box>
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
                Työskentelemme tuodaksemme sinulle kattavia näkemyksiä
                eduskunnan toiminnasta. Tarkista takaisin pian!
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

      {/* Voting Participation Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleDrawerClose}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: "90%", md: "80%", lg: "70%" },
            maxWidth: "1400px",
          },
        }}
      >
        <OsallistumisaktiivisuusPanel
          onClose={handleDrawerClose}
          initialPersonId={initialPersonId}
        />
      </Drawer>
    </Box>
  );
}
