import CloseIcon from "@mui/icons-material/Close";
import GavelIcon from "@mui/icons-material/Gavel";
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
  Cell,
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

type PartyDisciplineData = ApiRouteItem<`/api/analytics/party-discipline`>;

interface PartyDisciplineProps {
  onClose: () => void;
}

export default function PartyDiscipline({ onClose }: PartyDisciplineProps) {
  const themedColors = useThemedColors();
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tInsights } = useScopedTranslation("insights");
  const { selectedHallituskausi } = useHallituskausi();
  const [data, setData] = useState<PartyDisciplineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
    }
    apiFetch(
      `/api/analytics/party-discipline${params.toString() ? (`?${params.toString()}` as const) : ""}` as const,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((result) => {
        setData(
          result.sort(
            (a: PartyDisciplineData, b: PartyDisciplineData) =>
              b.discipline_rate - a.discipline_rate,
          ),
        );
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

  const chartData = data.map((d) => ({
    name: d.party_code,
    fullName: d.party_name,
    value: d.discipline_rate,
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
          <GavelIcon sx={{ fontSize: 36, color: colors.primary }} />
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {tInsights("partyDiscipline.title")}
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
        {tInsights("partyDiscipline.description")}
      </Typography>
      {selectedHallituskausi && (
        <Alert severity="info" sx={{ mb: spacing.md }}>
          Rajattu hallituskauteen: {selectedHallituskausi.label}
        </Alert>
      )}

      {data.length === 0 ? (
        <Alert severity="info">{tInsights("partyDiscipline.noData")}</Alert>
      ) : (
        <>
          <Box sx={{ mb: spacing.lg }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  type="number"
                  domain={[80, 100]}
                  tick={{ fill: themedColors.textSecondary }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: themedColors.textSecondary, fontWeight: 600 }}
                  width={50}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(1)}%`,
                    tInsights("partyDiscipline.disciplineRate"),
                  ]}
                  labelFormatter={(label) => {
                    const item = chartData.find((d) => d.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PARTY_COLORS[entry.name] || colors.neutral}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {tCommon("party")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {tInsights("partyDiscipline.disciplineRate")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {tInsights("partyDiscipline.withMajority")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">
                    {tInsights("partyDiscipline.totalVotes")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.party_code}>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor:
                              PARTY_COLORS[d.party_code] || colors.neutral,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" fontWeight={600}>
                          {d.party_name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          color:
                            d.discipline_rate >= 90
                              ? colors.success
                              : colors.warning,
                        }}
                      >
                        {d.discipline_rate.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {d.votes_with_majority.toLocaleString("fi-FI")}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {d.total_votes.toLocaleString("fi-FI")}
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
