import CloseIcon from "@mui/icons-material/Close";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { useTranslation } from "react-i18next";

interface CoalitionOppositionData {
  voting_id: number;
  start_time: string;
  title: string;
  section_title: string;
  n_yes: number;
  n_no: number;
  coalition_yes: number;
  coalition_no: number;
  coalition_total: number;
  opposition_yes: number;
  opposition_no: number;
  opposition_total: number;
}

interface CoalitionOppositionProps {
  onClose: () => void;
}

export default function CoalitionOpposition({ onClose }: CoalitionOppositionProps) {
  const themedColors = useThemedColors();
  const { t } = useTranslation();
  const [data, setData] = useState<CoalitionOppositionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/coalition-opposition?limit=30")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", p: spacing.lg }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box sx={{ p: spacing.lg }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );

  // Compute agreement rate: votings where coalition and opposition majority agree
  const agreementCount = data.filter((d) => {
    const coalitionMajority = d.coalition_yes >= d.coalition_no ? "yes" : "no";
    const oppositionMajority = d.opposition_yes >= d.opposition_no ? "yes" : "no";
    return coalitionMajority === oppositionMajority;
  }).length;
  const agreementRate = data.length > 0 ? ((agreementCount / data.length) * 100).toFixed(1) : "0";

  const chartData = data.slice(0, 20).map((d, i) => ({
    name: `#${i + 1}`,
    "Hallitus jaa": d.coalition_yes,
    "Hallitus ei": d.coalition_no,
    "Oppositio jaa": d.opposition_yes,
    "Oppositio ei": d.opposition_no,
  }));

  return (
    <Box sx={{ p: spacing.lg, minHeight: "100vh" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: spacing.lg }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <AccountBalanceIcon sx={{ fontSize: 36, color: colors.primary }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {t("insights.coalitionOpposition.title")}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: spacing.lg }}>
        {t("insights.coalitionOpposition.description")}
      </Typography>

      {data.length === 0 ? (
        <Alert severity="info">{t("insights.coalitionOpposition.noData")}</Alert>
      ) : (
        <>
          {/* Summary metrics */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
              gap: spacing.md,
              mb: spacing.lg,
            }}
          >
            <Box
              sx={{
                p: spacing.md,
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" sx={{ color: themedColors.textSecondary }}>
                Yksimielisyysaste
              </Typography>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: colors.primary }}>
                {agreementRate}%
              </Typography>
            </Box>
            <Box
              sx={{
                p: spacing.md,
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" sx={{ color: themedColors.textSecondary }}>
                Yksimielisiä
              </Typography>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: colors.success }}>
                {agreementCount}
              </Typography>
            </Box>
            <Box
              sx={{
                p: spacing.md,
                borderRadius: 2,
                border: `1px solid ${themedColors.dataBorder}`,
                textAlign: "center",
              }}
            >
              <Typography variant="body2" sx={{ color: themedColors.textSecondary }}>
                Äänestyksiä
              </Typography>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color: themedColors.textPrimary }}>
                {data.length}
              </Typography>
            </Box>
          </Box>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fill: themedColors.textSecondary }} />
              <YAxis tick={{ fill: themedColors.textSecondary }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Hallitus jaa" stackId="coalition" fill={colors.success} />
              <Bar dataKey="Hallitus ei" stackId="coalition" fill={colors.errorLight} />
              <Bar dataKey="Oppositio jaa" stackId="opposition" fill={colors.coalitionColor} />
              <Bar dataKey="Oppositio ei" stackId="opposition" fill={colors.warning} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </Box>
  );
}
