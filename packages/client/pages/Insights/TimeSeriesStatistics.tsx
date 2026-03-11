import {
  Alert,
  Box,
  CardContent,
  CircularProgress,
  Fade,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, spacing } from "#client/theme";
import { DataCard, PanelHeader } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";

type GenderData = ApiRouteItem<`/api/insights/gender-division`>;
type AgeData = ApiRouteItem<`/api/insights/age-division`>;

interface TimeSeriesStatisticsProps {
  onClose: () => void;
}

export default function TimeSeriesStatistics({
  onClose,
}: TimeSeriesStatisticsProps) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tInsights } = useScopedTranslation("insights");
  const themedColors = useThemedColors();
  const { selectedHallituskausi } = useHallituskausi();
  const [genderData, setGenderData] = useState<GenderData[]>([]);
  const [ageData, setAgeData] = useState<AgeData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [genderResponse, ageResponse] = await Promise.all([
          apiFetch("/api/insights/gender-division"),
          apiFetch("/api/insights/age-division"),
        ]);

        if (!genderResponse.ok || !ageResponse.ok) {
          throw new Error("Failed to fetch data");
        }

        const genderResult = await genderResponse.json();
        const ageResult = await ageResponse.json();

        setGenderData(genderResult);
        setAgeData(ageResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredGenderData = useMemo(() => {
    if (!selectedHallituskausi) return genderData;
    const startYear = Number.parseInt(
      selectedHallituskausi.startDate.slice(0, 4),
      10,
    );
    const endYear = selectedHallituskausi.endDate
      ? Number.parseInt(selectedHallituskausi.endDate.slice(0, 4), 10)
      : Number.MAX_SAFE_INTEGER;
    return genderData.filter(
      (row) => row.year >= startYear && row.year <= endYear,
    );
  }, [genderData, selectedHallituskausi]);

  const filteredAgeData = useMemo(() => {
    if (!selectedHallituskausi) return ageData;
    const startYear = Number.parseInt(
      selectedHallituskausi.startDate.slice(0, 4),
      10,
    );
    const endYear = selectedHallituskausi.endDate
      ? Number.parseInt(selectedHallituskausi.endDate.slice(0, 4), 10)
      : Number.MAX_SAFE_INTEGER;
    return ageData.filter(
      (row) => row.year >= startYear && row.year <= endYear,
    );
  }, [ageData, selectedHallituskausi]);

  const CustomTooltip = <
    T extends { color: string; name: string; value: string },
  >({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: T[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: themedColors.backgroundPaper,
            padding: spacing.sm,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {label}
          </Typography>
          {payload.map((entry) => (
            <Typography
              key={entry.name}
              variant="body2"
              sx={{ color: entry.color }}
            >
              {entry.name}: {entry.value}
              {entry.name.includes("%") ? "" : ""}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (loading) {
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
  }

  if (error) {
    return (
      <Box sx={{ p: spacing.lg }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: spacing.lg, minHeight: "100vh" }}>
      <PanelHeader
        title={tInsights("timeSeries.title")}
        subtitle="Sukupuoli- ja ikäjakauman pitkän aikavälin kehitys eduskunnassa."
        icon={
          <Typography sx={{ color: colors.primary, fontWeight: 700 }}>
            TS
          </Typography>
        }
        onClose={onClose}
        sx={{
          mb: spacing.lg,
          p: spacing.md,
          border: `1px solid ${colors.dataBorder}`,
          borderRadius: 2,
        }}
      />

      {/* Gender Division Section */}
      {selectedHallituskausi && (
        <Alert severity="info" sx={{ mb: spacing.md }}>
          Rajattu hallituskauteen: {selectedHallituskausi.label}
        </Alert>
      )}
      <Fade in timeout={500}>
        <Box sx={{ mb: spacing.xl }}>
          <DataCard>
            <CardContent sx={{ p: spacing.lg }}>
              <Typography variant="h5" sx={{ mb: spacing.sm, fontWeight: 600 }}>
                {tInsights("timeSeries.gender.title")}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: spacing.lg }}
              >
                {tInsights("timeSeries.gender.description")}
              </Typography>

              {/* Percentage Chart */}
              <Box sx={{ mb: spacing.xl }}>
                <Typography
                  variant="h6"
                  sx={{ mb: spacing.md, fontWeight: 600 }}
                >
                  {tInsights("timeSeries.gender.percentageDistribution")}
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={filteredGenderData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="year"
                      style={{ fontSize: "14px" }}
                      tick={{ fill: themedColors.textSecondary }}
                    />
                    <YAxis
                      style={{ fontSize: "14px" }}
                      tick={{ fill: themedColors.textSecondary }}
                      label={{
                        value: tInsights("timeSeries.gender.sharePercent"),
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="female_percentage"
                      stackId="1"
                      stroke={colors.chartPink}
                      fill={colors.chartPink}
                      fillOpacity={0.6}
                      name={tInsights("timeSeries.gender.womenPercent")}
                    />
                    <Area
                      type="monotone"
                      dataKey="male_percentage"
                      stackId="1"
                      stroke={colors.chartBlue}
                      fill={colors.chartBlue}
                      fillOpacity={0.6}
                      name={tInsights("timeSeries.gender.menPercent")}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>

              {/* Absolute Numbers Chart */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{ mb: spacing.md, fontWeight: 600 }}
                >
                  {tInsights("timeSeries.gender.countDistribution")}
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={filteredGenderData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="year"
                      style={{ fontSize: "14px" }}
                      tick={{ fill: themedColors.textSecondary }}
                    />
                    <YAxis
                      style={{ fontSize: "14px" }}
                      tick={{ fill: themedColors.textSecondary }}
                      label={{
                        value: tInsights("timeSeries.count"),
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="female_count"
                      stroke={colors.chartPink}
                      strokeWidth={2}
                      dot={{ fill: colors.chartPink }}
                      name={tInsights("timeSeries.gender.women")}
                    />
                    <Line
                      type="monotone"
                      dataKey="male_count"
                      stroke={colors.chartBlue}
                      strokeWidth={2}
                      dot={{ fill: colors.chartBlue }}
                      name={tInsights("timeSeries.gender.men")}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_count"
                      stroke={colors.chartGreen}
                      strokeWidth={2}
                      dot={{ fill: colors.chartGreen }}
                      strokeDasharray="5 5"
                      name={tCommon("total")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>

              {/* Key Stats */}
              <Box
                sx={{
                  mt: spacing.lg,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
                  gap: spacing.md,
                }}
              >
                <Box
                  sx={{
                    p: spacing.md,
                    borderRadius: 2,
                    background: "rgba(233, 30, 99, 0.1)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {tInsights("timeSeries.gender.womenLatest")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {genderData[genderData.length - 1]?.female_count || 0} (
                    {genderData[genderData.length - 1]?.female_percentage || 0}
                    %)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: spacing.md,
                    borderRadius: 2,
                    background: "rgba(33, 150, 243, 0.1)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {tInsights("timeSeries.gender.menLatest")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {genderData[genderData.length - 1]?.male_count || 0} (
                    {genderData[genderData.length - 1]?.male_percentage || 0}%)
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: spacing.md,
                    borderRadius: 2,
                    background: "rgba(76, 175, 80, 0.1)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {tInsights("timeSeries.totalLatest")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {genderData[genderData.length - 1]?.total_count || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </DataCard>
        </Box>
      </Fade>

      {/* Age Distribution Section */}
      <Fade in timeout={600}>
        <Box>
          <DataCard>
            <CardContent sx={{ p: spacing.lg }}>
              <Typography variant="h5" sx={{ mb: spacing.sm, fontWeight: 600 }}>
                {tInsights("timeSeries.age.title")}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: spacing.lg }}
              >
                {tInsights("timeSeries.age.description")}
              </Typography>

              {/* Age Groups Stacked Area Chart */}
              <Box sx={{ mb: spacing.xl }}>
                <Typography
                  variant="h6"
                  sx={{ mb: spacing.md, fontWeight: 600 }}
                >
                  {tInsights("timeSeries.age.groups")}
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart
                    data={filteredAgeData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="year"
                      style={{ fontSize: "14px" }}
                      tick={{ fill: themedColors.textSecondary }}
                    />
                    <YAxis
                      style={{ fontSize: "14px" }}
                      tick={{ fill: themedColors.textSecondary }}
                      label={{
                        value: tInsights("timeSeries.count"),
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="age_under_30"
                      stackId="1"
                      stroke={colors.chartPurple}
                      fill={colors.chartPurple}
                      fillOpacity={0.7}
                      name="< 30v"
                    />
                    <Area
                      type="monotone"
                      dataKey="age_30_39"
                      stackId="1"
                      stroke={colors.chartBlue}
                      fill={colors.chartBlue}
                      fillOpacity={0.7}
                      name="30-39v"
                    />
                    <Area
                      type="monotone"
                      dataKey="age_40_49"
                      stackId="1"
                      stroke={colors.chartGreen}
                      fill={colors.chartGreen}
                      fillOpacity={0.7}
                      name="40-49v"
                    />
                    <Area
                      type="monotone"
                      dataKey="age_50_59"
                      stackId="1"
                      stroke={colors.chartOrange}
                      fill={colors.chartOrange}
                      fillOpacity={0.7}
                      name="50-59v"
                    />
                    <Area
                      type="monotone"
                      dataKey="age_60_plus"
                      stackId="1"
                      stroke={colors.chartRed}
                      fill={colors.chartRed}
                      fillOpacity={0.7}
                      name="60+v"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>

              {/* Average Age Line Chart */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{ mb: spacing.md, fontWeight: 600 }}
                >
                  {tInsights("timeSeries.age.averageAge")}
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={filteredAgeData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="year"
                      style={{ fontSize: "14px" }}
                      tick={{ fill: themedColors.textSecondary }}
                    />
                    <YAxis
                      domain={[40, 60]}
                      style={{ fontSize: "14px" }}
                      tick={{ fill: themedColors.textSecondary }}
                      label={{
                        value: tInsights("timeSeries.age.years"),
                        angle: -90,
                        position: "insideLeft",
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="average_age"
                      stroke={colors.primary}
                      strokeWidth={3}
                      dot={{ fill: colors.primary, r: 4 }}
                      name={tInsights("timeSeries.age.averageAge")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>

              {/* Key Stats */}
              <Box
                sx={{
                  mt: spacing.lg,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr 1fr" },
                  gap: spacing.md,
                }}
              >
                <Box
                  sx={{
                    p: spacing.md,
                    borderRadius: 2,
                    background: "rgba(102, 126, 234, 0.1)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {tInsights("timeSeries.age.averageLatest")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {ageData[ageData.length - 1]?.average_age || 0} v
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: spacing.md,
                    borderRadius: 2,
                    background: "rgba(76, 175, 80, 0.1)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {tInsights("timeSeries.age.youngestLatest")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {ageData[ageData.length - 1]?.min_age || 0} v
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: spacing.md,
                    borderRadius: 2,
                    background: "rgba(244, 67, 54, 0.1)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {tInsights("timeSeries.age.oldestLatest")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {ageData[ageData.length - 1]?.max_age || 0} v
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: spacing.md,
                    borderRadius: 2,
                    background: "rgba(156, 39, 176, 0.1)",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {tInsights("timeSeries.totalLatest")}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {ageData[ageData.length - 1]?.total_count || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </DataCard>
        </Box>
      </Fade>
    </Box>
  );
}
