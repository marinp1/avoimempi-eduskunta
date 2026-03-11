import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { spacing } from "#client/theme";
import { apiFetch } from "#client/utils/fetch";
import AttendanceHeatmap from "./AttendanceHeatmap";

type PersonHistoryRow = ApiRouteItem<`/api/analytics/attendance/:personId`>;

interface AttendancePersonDetailProps {
  personId: number;
  personName: string;
  startDate?: string;
  endDate?: string;
  onClose: () => void;
}

export default function AttendancePersonDetail({
  personId,
  personName,
  startDate,
  endDate,
  onClose,
}: AttendancePersonDetailProps) {
  const { t } = useScopedTranslation("insights");
  const [data, setData] = useState<PersonHistoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    apiFetch(`/api/analytics/attendance/${personId}${qs ? `?${qs}` : ""}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setData([]);
        setLoading(false);
      });
  }, [personId, startDate, endDate]);

  const absentRows = data?.filter((r) => r.entry_type === "absent") ?? [];

  const reasonECount = absentRows.filter(
    (r) => r.absence_reason?.toLowerCase() === "e",
  ).length;
  const reasonHCount = absentRows.filter(
    (r) => r.absence_reason?.toLowerCase() === "h",
  ).length;
  const reasonOtherCount = absentRows.filter(
    (r) =>
      r.absence_reason == null ||
      (r.absence_reason.toLowerCase() !== "e" &&
        r.absence_reason.toLowerCase() !== "h"),
  ).length;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: spacing.md,
        backgroundColor: "background.paper",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: spacing.sm,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          {personName}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Sulje henkilötiedot"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: spacing.md }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
          {/* Reason breakdown */}
          {absentRows.length > 0 && (
            <Box sx={{ mb: spacing.sm }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1, fontWeight: 600 }}
              >
                {t("attendance.reasonBreakdown")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {reasonECount > 0 && (
                  <Chip
                    size="small"
                    label={`${t("attendance.reasonE")} (${reasonECount})`}
                    sx={{
                      backgroundColor: "rgba(37, 99, 235, 0.12)",
                      color: "#1d4ed8",
                      fontWeight: 600,
                    }}
                  />
                )}
                {reasonHCount > 0 && (
                  <Chip
                    size="small"
                    label={`${t("attendance.reasonH")} (${reasonHCount})`}
                    sx={{
                      backgroundColor: "rgba(217, 119, 6, 0.12)",
                      color: "#b45309",
                      fontWeight: 600,
                    }}
                  />
                )}
                {reasonOtherCount > 0 && (
                  <Chip
                    size="small"
                    label={`${t("attendance.reasonOther")} (${reasonOtherCount})`}
                    sx={{
                      backgroundColor: "rgba(100, 116, 139, 0.12)",
                      color: "#475569",
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Heatmap */}
          {data && data.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1, fontWeight: 600 }}
              >
                {t("attendance.heatmapTitle")}
              </Typography>
              <AttendanceHeatmap data={data} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
