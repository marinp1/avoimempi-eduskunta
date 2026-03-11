import EventBusyIcon from "@mui/icons-material/EventBusy";
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
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
import { PanelHeader } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";
import AttendancePersonDetail from "./AttendancePersonDetail";

type AttendanceData = ApiRouteItem<`/api/analytics/attendance`>;

interface AttendanceProps {
  onClose: () => void;
}

export default function Attendance({ onClose }: AttendanceProps) {
  const themedColors = useThemedColors();
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tInsights } = useScopedTranslation("insights");
  const { selectedHallituskausi } = useHallituskausi();
  const [data, setData] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedPersonName, setSelectedPersonName] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedPersonId(null);
    const params = new URLSearchParams();
    if (selectedHallituskausi) {
      params.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        params.set("endDate", selectedHallituskausi.endDate);
      }
    }
    apiFetch(`/api/analytics/attendance?${params.toString()}`)
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

  const handleRowClick = (person: AttendanceData) => {
    if (selectedPersonId === person.person_id) {
      setSelectedPersonId(null);
      setSelectedPersonName("");
    } else {
      setSelectedPersonId(person.person_id);
      setSelectedPersonName(`${person.last_name}, ${person.first_name}`);
    }
  };

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

  const totalRollCalls = data[0]?.total_roll_calls ?? 0;

  const chartData = data.slice(0, 15).map((d) => ({
    name: d.last_name,
    absences: d.absent_count,
    party: d.party,
  }));

  const startDate = selectedHallituskausi?.startDate;
  const endDate = selectedHallituskausi?.endDate ?? undefined;

  return (
    <Box sx={{ p: spacing.lg, minHeight: "100vh" }}>
      <PanelHeader
        title={tInsights("attendance.title")}
        subtitle={tInsights("attendance.description")}
        icon={<EventBusyIcon sx={{ fontSize: 28, color: colors.primary }} />}
        onClose={onClose}
        sx={{ mb: spacing.lg }}
      />
      {selectedHallituskausi && (
        <Alert severity="info" sx={{ mb: spacing.md }}>
          Rajattu hallituskauteen: {selectedHallituskausi.label}
        </Alert>
      )}

      {data.length === 0 ? (
        <Alert severity="info">{tInsights("attendance.noData")}</Alert>
      ) : (
        <>
          <Box sx={{ mb: spacing.md }}>
            <Typography variant="body2" color="text.secondary">
              {tInsights("attendance.totalRollCalls")}:{" "}
              <strong>{totalRollCalls.toLocaleString("fi-FI")}</strong>
            </Typography>
          </Box>

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
                    tInsights("attendance.absentCount"),
                  ]}
                />
                <Bar
                  dataKey="absences"
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
                    {tInsights("attendance.absentCount")}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      display: { xs: "none", sm: "table-cell" },
                    }}
                    align="right"
                  >
                    {tInsights("attendance.lateCount")}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 600,
                      display: { xs: "none", sm: "table-cell" },
                    }}
                    align="right"
                  >
                    {tInsights("attendance.absenceRate")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((d) => {
                  const isSelected = selectedPersonId === d.person_id;
                  return (
                    <>
                      <TableRow
                        key={d.person_id}
                        onClick={() => handleRowClick(d)}
                        aria-label={`${d.last_name}, ${d.first_name} — ${tInsights("attendance.absentCount")}: ${d.absent_count}`}
                        sx={{
                          cursor: "pointer",
                          backgroundColor: isSelected
                            ? "action.selected"
                            : undefined,
                          "&:hover": {
                            backgroundColor: isSelected
                              ? "action.selected"
                              : "action.hover",
                          },
                        }}
                      >
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
                            {d.absent_count.toLocaleString("fi-FI")}
                          </Typography>
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ display: { xs: "none", sm: "table-cell" } }}
                        >
                          <Typography variant="body2">
                            {d.late_count.toLocaleString("fi-FI")}
                          </Typography>
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ display: { xs: "none", sm: "table-cell" } }}
                        >
                          <Typography variant="body2">
                            {d.absence_rate.toLocaleString("fi-FI", {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                            %
                          </Typography>
                        </TableCell>
                      </TableRow>
                      {isSelected && (
                        <TableRow key={`${d.person_id}-detail`}>
                          <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                            <Collapse
                              in={isSelected}
                              timeout="auto"
                              unmountOnExit
                            >
                              <Box sx={{ p: spacing.sm }}>
                                <AttendancePersonDetail
                                  personId={d.person_id}
                                  personName={selectedPersonName}
                                  startDate={startDate}
                                  endDate={endDate}
                                  onClose={() => setSelectedPersonId(null)}
                                />
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
