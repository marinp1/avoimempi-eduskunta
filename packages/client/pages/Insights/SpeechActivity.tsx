import CloseIcon from "@mui/icons-material/Close";
import MicIcon from "@mui/icons-material/Mic";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colors, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { useTranslation } from "react-i18next";

interface SpeechActivityData {
  person_id: number;
  first_name: string;
  last_name: string;
  party: string;
  speech_count: number;
  total_words: number;
  avg_words_per_speech: number;
  first_speech: string;
  last_speech: string;
}

interface SpeechActivityProps {
  onClose: () => void;
}

export default function SpeechActivity({ onClose }: SpeechActivityProps) {
  const themedColors = useThemedColors();
  const { t } = useTranslation();
  const [data, setData] = useState<SpeechActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/speech-activity?limit=30")
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

  const chartData = data.slice(0, 15).map((d) => ({
    name: `${d.last_name}`,
    speeches: d.speech_count,
    party: d.party,
  }));

  return (
    <Box sx={{ p: spacing.lg, minHeight: "100vh" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: spacing.lg }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <MicIcon sx={{ fontSize: 36, color: colors.primary }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {t("insights.speechActivity.title")}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: spacing.lg }}>
        {t("insights.speechActivity.description")}
      </Typography>

      {data.length === 0 ? (
        <Alert severity="info">{t("insights.speechActivity.noData")}</Alert>
      ) : (
        <>
          <Box sx={{ mb: spacing.lg }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fill: themedColors.textSecondary }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: themedColors.textSecondary, fontSize: 12 }}
                  width={70}
                />
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString("fi-FI"), t("insights.speechActivity.speechCount")]}
                />
                <Bar dataKey="speeches" fill={colors.primaryLight} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>{t("common.name")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t("common.party")}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {t("insights.speechActivity.speechCount")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: "none", sm: "table-cell" } }} align="right">
                    {t("insights.speechActivity.totalWords")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: "none", sm: "table-cell" } }} align="right">
                    {t("insights.speechActivity.avgWords")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.person_id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {d.last_name}, {d.first_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{d.party}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {d.speech_count.toLocaleString("fi-FI")}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Typography variant="body2">
                        {d.total_words.toLocaleString("fi-FI")}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      <Typography variant="body2">
                        {Math.round(d.avg_words_per_speech).toLocaleString("fi-FI")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
