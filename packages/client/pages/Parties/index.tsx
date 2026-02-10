import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { colors, spacing } from "#client/theme";
import { DataCard, PageHeader } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { PartyDetail } from "./PartyDetail";

const PARTY_COLORS: Record<string, string> = {
  KOK: "#0066CC",
  SDP: "#E11931",
  PS: "#FFDE55",
  KESK: "#3AAA35",
  VIHR: "#61BF1A",
  VAS: "#AA0000",
  RKP: "#FFD500",
  KD: "#1E90FF",
  LIIK: "#00A0DC",
};

interface PartySummary {
  party_code: string;
  party_name: string;
  member_count: number;
  is_in_government: number;
  participation_rate: number;
  female_count: number;
  male_count: number;
  average_age: number;
}

const Parties = () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const [parties, setParties] = useState<PartySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParty, setSelectedParty] = useState<PartySummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/parties/summary")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setParties(data.sort((a: PartySummary, b: PartySummary) => b.member_count - a.member_count));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleCardClick = (party: PartySummary) => {
    setSelectedParty(party);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedParty(null);
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box>
        <PageHeader title={t("parties.title")} subtitle={t("parties.subtitle")} />
        <Alert severity="error">{error}</Alert>
      </Box>
    );

  return (
    <Box>
      <PageHeader title={t("parties.title")} subtitle={t("parties.subtitle")} />

      <Grid container spacing={spacing.md}>
        {parties.map((party) => {
          const partyColor = PARTY_COLORS[party.party_code] || colors.neutral;
          return (
            <Grid key={party.party_code} size={{ xs: 12, sm: 6, md: 4 }}>
              <DataCard
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    borderColor: partyColor,
                  },
                }}
              >
                <Box onClick={() => handleCardClick(party)} sx={{ p: 2.5 }}>
                  {/* Header: party name + gov/opp badge */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          bgcolor: partyColor,
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="h6" fontWeight={700}>
                        {party.party_name}
                      </Typography>
                    </Box>
                    <Chip
                      label={
                        party.is_in_government === 1
                          ? t("parties.government")
                          : t("parties.opposition")
                      }
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor:
                          party.is_in_government === 1
                            ? colors.coalitionBackground
                            : colors.oppositionBackground,
                        color:
                          party.is_in_government === 1
                            ? colors.coalitionColor
                            : colors.oppositionColor,
                      }}
                    />
                  </Box>

                  {/* Stats grid */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                        {t("parties.members")}
                      </Typography>
                      <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: themedColors.textPrimary }}>
                        {party.member_count}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
                        {t("parties.participation")}
                      </Typography>
                      <Typography sx={{ fontSize: "1.25rem", fontWeight: 700, color: themedColors.textPrimary }}>
                        {party.participation_rate != null
                          ? `${party.participation_rate.toFixed(1)}%`
                          : "-"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </DataCard>
            </Grid>
          );
        })}
      </Grid>

      <PartyDetail
        open={dialogOpen}
        onClose={handleDialogClose}
        party={selectedParty}
      />
    </Box>
  );
};

export default Parties;
