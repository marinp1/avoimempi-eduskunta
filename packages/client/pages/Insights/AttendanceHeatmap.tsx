import { Box, Divider, Tooltip, Typography } from "@mui/material";
import { Fragment } from "react";
import { useScopedTranslation } from "#client/i18n/scoped";

type HistoryRow = {
  session_date: string;
  entry_type: string | null;
  absence_reason: string | null;
};

interface AttendanceHeatmapProps {
  data: HistoryRow[];
}

type CellStatus = "none" | "present" | "late" | "absent";

interface MonthCell {
  date: string;
  dayOfWeek: number; // 0=Mon..6=Sun
  weekRow: number; // 0-based row within the month tile
  status: CellStatus;
  absence_reason: string | null;
}

interface MonthData {
  year: number;
  month: number; // 0-based
  numWeeks: number;
  cells: MonthCell[];
}

const CELL_SIZE = 12;
const CELL_GAP = 2;
const HEADER_ROW_HEIGHT = 14;

const STATUS_COLORS: Record<CellStatus, string> = {
  none: "transparent",
  present: "#4ade80",
  late: "#fbbf24",
  absent: "#f87171",
};

const STATUS_BORDER_COLORS: Record<CellStatus, string> = {
  none: "#e2e8f0",
  present: "#22c55e",
  late: "#f59e0b",
  absent: "#ef4444",
};

const DAY_LABELS = ["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"];

const MONTH_NAMES_FI = [
  "tammikuu",
  "helmikuu",
  "maaliskuu",
  "huhtikuu",
  "toukokuu",
  "kesäkuu",
  "heinäkuu",
  "elokuu",
  "syyskuu",
  "lokakuu",
  "marraskuu",
  "joulukuu",
];

/** Returns day of week: 0=Mon, 1=Tue, ..., 6=Sun */
function isoWeekday(d: Date): number {
  const jsDay = d.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatDateFI(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("fi-FI", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function computeStatus(
  entry:
    | { entry_type: string | null; absence_reason: string | null }
    | undefined,
): CellStatus {
  if (entry === undefined) return "none";
  if (entry.entry_type === null) return "present";
  if (entry.entry_type === "late") return "late";
  if (entry.entry_type === "absent") return "absent";
  return "present";
}

interface MonthTileProps {
  data: MonthData;
  statusLabel: (status: CellStatus) => string;
  reasonLabel: (reason: string | null) => string | null;
}

function MonthTile({ data, statusLabel, reasonLabel }: MonthTileProps) {
  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", gap: "2px" }}>
      <Typography
        variant="caption"
        sx={{
          fontSize: "0.6rem",
          color: "text.secondary",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {MONTH_NAMES_FI[data.month]}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(7, ${CELL_SIZE}px)`,
          gridTemplateRows: `${HEADER_ROW_HEIGHT}px repeat(${data.numWeeks}, ${CELL_SIZE}px)`,
          gap: `${CELL_GAP}px`,
        }}
      >
        {/* Weekday headers — row 1 */}
        {DAY_LABELS.map((lbl, i) => (
          <Typography
            key={lbl}
            variant="caption"
            sx={{
              gridRow: 1,
              gridColumn: i + 1,
              fontSize: "0.5rem",
              color: "text.disabled",
              textAlign: "center",
              lineHeight: `${HEADER_ROW_HEIGHT}px`,
              display: "block",
            }}
          >
            {lbl}
          </Typography>
        ))}

        {/* Day cells */}
        {data.cells.map((cell) => {
          const tooltipLines = [
            formatDateFI(cell.date),
            statusLabel(cell.status),
          ];
          if (cell.status === "absent" && cell.absence_reason) {
            const r = reasonLabel(cell.absence_reason.toLowerCase());
            if (r) tooltipLines.push(r);
          }
          return (
            <Tooltip
              key={cell.date}
              title={tooltipLines.join(" — ")}
              placement="top"
              arrow
            >
              <Box
                aria-label={tooltipLines.join(", ")}
                sx={{
                  gridRow: cell.weekRow + 2,
                  gridColumn: cell.dayOfWeek + 1,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderRadius: "2px",
                  backgroundColor: STATUS_COLORS[cell.status],
                  border: "1px solid",
                  borderColor: STATUS_BORDER_COLORS[cell.status],
                  cursor: "default",
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}

export default function AttendanceHeatmap({ data }: AttendanceHeatmapProps) {
  const { t } = useScopedTranslation("insights");

  if (data.length === 0) return null;

  // Build date→entry map
  const dateMap = new Map<
    string,
    { entry_type: string | null; absence_reason: string | null }
  >();
  for (const row of data) {
    dateMap.set(row.session_date, {
      entry_type: row.entry_type,
      absence_reason: row.absence_reason,
    });
  }

  // Determine date range from session dates
  const sessionDates = [...dateMap.keys()].sort();
  const firstDateStr = sessionDates[0];
  const lastDateStr = sessionDates[sessionDates.length - 1];

  const [fy, fm] = firstDateStr.substring(0, 7).split("-").map(Number);
  const [ly, lm] = lastDateStr.substring(0, 7).split("-").map(Number);

  // Build month data
  const months: MonthData[] = [];
  let cy = fy;
  let cm = fm - 1; // convert to 0-based month
  const endY = ly;
  const endM = lm - 1;

  while (cy < endY || (cy === endY && cm <= endM)) {
    const daysInMonth = new Date(cy, cm + 1, 0).getDate();
    const firstDOW = isoWeekday(new Date(cy, cm, 1));
    const numWeeks = Math.ceil((daysInMonth + firstDOW) / 7);

    const cells: MonthCell[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${cy}-${String(cm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dow = (firstDOW + day - 1) % 7;
      const weekRow = Math.floor((day - 1 + firstDOW) / 7);
      const entry = dateMap.get(dateStr);
      cells.push({
        date: dateStr,
        dayOfWeek: dow,
        weekRow,
        status: computeStatus(entry),
        absence_reason: entry?.absence_reason ?? null,
      });
    }

    months.push({ year: cy, month: cm, numWeeks, cells });
    cm++;
    if (cm > 11) {
      cm = 0;
      cy++;
    }
  }

  const statusLabel = (status: CellStatus): string => {
    switch (status) {
      case "present":
        return t("attendance.present");
      case "late":
        return t("attendance.late");
      case "absent":
        return t("attendance.absent");
      case "none":
        return t("attendance.noRollCall");
    }
  };

  const reasonLabel = (reason: string | null): string | null => {
    if (!reason) return null;
    if (reason === "e") return t("attendance.reasonE");
    if (reason === "h") return t("attendance.reasonH");
    return t("attendance.reasonOther");
  };

  let prevYear = -1;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        {months.map((m) => {
          const yearChanged = m.year !== prevYear;
          prevYear = m.year;
          return (
            <Fragment key={`${m.year}-${m.month}`}>
              {yearChanged && (
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ whiteSpace: "nowrap", fontWeight: 600 }}
                  >
                    {m.year}
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>
              )}
              <MonthTile
                data={m}
                statusLabel={statusLabel}
                reasonLabel={reasonLabel}
              />
            </Fragment>
          );
        })}
      </Box>

      {/* Legend */}
      <Box sx={{ display: "flex", gap: 2, mt: "12px", flexWrap: "wrap" }}>
        {(["present", "late", "absent", "none"] as CellStatus[]).map(
          (status) => (
            <Box
              key={status}
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Box
                sx={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  borderRadius: "2px",
                  backgroundColor: STATUS_COLORS[status],
                  border: "1px solid",
                  borderColor: STATUS_BORDER_COLORS[status],
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {statusLabel(status)}
              </Typography>
            </Box>
          ),
        )}
      </Box>
    </Box>
  );
}
