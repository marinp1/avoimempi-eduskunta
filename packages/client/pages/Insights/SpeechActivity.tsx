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
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";

type SpeechActivityData = ApiRouteItem<`/api/analytics/speech-activity`>;

interface SpeechActivityProps {
  onClose: () => void;
}

export default function SpeechActivity({ onClose }: SpeechActivityProps) {
  const themedColors = useThemedColors();
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tInsights } = useScopedTranslation("insights");
  const { selectedHallituskausi } = useHallituskausi();
  const [data, setData] = useState<SpeechActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ limit: "30" });
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
    }
    apiFetch(`/api/analytics/speech-activity?${params.toString()}`)
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
  }, [selectedHallituskausi]);

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          p: spacing.lg,
        }}
      >
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: spacing.lg,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          <MicIcon sx={{ fontSize: 36, color: colors.primary }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {tInsights("speechActivity.title")}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </Box>

      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ mb: spacing.lg }}
      >
        {tInsights("speechActivity.description")}
      </Typography>
      {selectedHallituskausi && (
        <Alert severity="info" sx={{ mb: spacing.md }}>
          Rajattu hallituskauteen: {selectedHallituskausi.label}
        </Alert>
      )}

      {data.length === 0 ? (
        <Alert severity="info">{tInsights("speechActivity.noData")}</Alert>
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
                <XAxis
                  type="number"
                  tick={{ fill: themedColors.textSecondary }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: themedColors.textSecondary, fontSize: 12 }}
                  width={70}
                />
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString("fi-FI"),
                    tInsights("speechActivity.speechCount"),
                  ]}
                />
                <Bar
                  dataKey="speeches"
                  fill={colors.primaryLight}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {tCommon("name")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {tCommon("party")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {tInsights("speechActivity.speechCount")}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      display: { xs: "none", sm: "table-cell" },
                    }}
                    align="right"
                  >
                    {tInsights("speechActivity.totalWords")}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      display: { xs: "none", sm: "table-cell" },
                    }}
                    align="right"
                  >
                    {tInsights("speechActivity.avgWords")}
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
                    <TableCell
                      align="right"
                      sx={{ display: { xs: "none", sm: "table-cell" } }}
                    >
                      <Typography variant="body2">
                        {d.total_words.toLocaleString("fi-FI")}
                      </Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ display: { xs: "none", sm: "table-cell" } }}
                    >
                      <Typography variant="body2">
                        {Math.round(d.avg_words_per_speech).toLocaleString(
                          "fi-FI",
                        )}
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
