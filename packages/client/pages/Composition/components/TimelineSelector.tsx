import { Box, Slider, Tooltip, Typography } from "@mui/material";
import type React from "react";
import type { HallituskausiPeriod } from "#client/filters/HallituskausiContext";
import { useThemedColors } from "#client/theme/ThemeContext";
import { formatFinnishDate } from "../helpers";

export const TimelineSelector: React.FC<{
  hallituskaudet: HallituskausiPeriod[];
  selectedHallituskausi: HallituskausiPeriod | null;
  date: string;
  todayIso: string;
  onDateChange: (date: string) => void;
}> = ({
  hallituskaudet,
  selectedHallituskausi,
  date,
  todayIso,
  onDateChange,
}) => {
  const tc = useThemedColors();

  const rangeStart =
    selectedHallituskausi?.startDate ??
    hallituskaudet.reduce(
      (min, period) => (period.startDate < min ? period.startDate : min),
      hallituskaudet[0]?.startDate ?? "2000-01-01",
    );
  const rangeEnd = selectedHallituskausi?.endDate ?? todayIso;

  const startMs = new Date(rangeStart).getTime();
  const endMs = new Date(rangeEnd).getTime();
  const span = endMs - startMs;

  if (span <= 0 || hallituskaudet.length === 0) return null;

  const toMs = (value: string) => new Date(value).getTime();
  const toDate = (value: number) => new Date(value).toISOString().split("T")[0];
  const toPct = (value: string) =>
    Math.max(0, Math.min(100, ((toMs(value) - startMs) / span) * 100));

  const visible = hallituskaudet
    .filter(
      (period) =>
        period.startDate <= rangeEnd &&
        (period.endDate ?? todayIso) >= rangeStart,
    )
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
  const minTimelineWidth = Math.max(visible.length * 88, 720);

  type Segment =
    | {
        kind: "period";
        period: HallituskausiPeriod;
        duration: number;
        idx: number;
      }
    | { kind: "gap"; duration: number }
    | {
        kind: "overlap";
        duration: number;
        prev: HallituskausiPeriod;
        curr: HallituskausiPeriod;
      };

  const segments: Segment[] = [];
  let cursor = startMs;
  for (let index = 0; index < visible.length; index++) {
    const period = visible[index];
    const periodStart = Math.max(toMs(period.startDate), startMs);
    const periodEnd = Math.min(toMs(period.endDate ?? todayIso), endMs);

    if (periodStart < cursor) {
      const overlapDuration = cursor - periodStart;
      const previousPeriod = visible[index - 1];
      if (overlapDuration > 2 * 86_400_000 && previousPeriod) {
        segments.push({
          kind: "overlap",
          duration: overlapDuration,
          prev: previousPeriod,
          curr: period,
        });
      }
      if (periodEnd > cursor) {
        segments.push({
          kind: "period",
          period,
          duration: periodEnd - cursor,
          idx: index,
        });
        cursor = periodEnd;
      }
    } else {
      if (periodStart > cursor) {
        segments.push({ kind: "gap", duration: periodStart - cursor });
      }
      if (periodEnd > periodStart) {
        segments.push({
          kind: "period",
          period,
          duration: periodEnd - periodStart,
          idx: index,
        });
        cursor = periodEnd;
      }
    }
  }

  if (cursor < endMs) {
    segments.push({ kind: "gap", duration: endMs - cursor });
  }

  const startYear = new Date(rangeStart).getFullYear();
  const endYear = new Date(rangeEnd).getFullYear();
  const yearSpan = endYear - startYear;
  const yearStep = yearSpan <= 5 ? 1 : yearSpan <= 10 ? 2 : 4;
  const yearTicks: number[] = [];
  for (let year = startYear + 1; year <= endYear; year++) {
    if ((year - startYear) % yearStep === 0) {
      const pct = toPct(`${year}-01-01`);
      if (pct > 2 && pct < 98) yearTicks.push(year);
    }
  }

  const currentMs = Math.max(startMs, Math.min(endMs, toMs(date)));

  return (
    <Box sx={{ overflowX: "auto", pb: 0.5, scrollbarWidth: "thin" }}>
      <Box sx={{ minWidth: minTimelineWidth }}>
        <Box
          sx={{
            display: "flex",
            height: 28,
            borderRadius: 1,
            overflow: "hidden",
            border: `1px solid ${tc.dataBorder}`,
            background: tc.backgroundPaper,
          }}
        >
          {segments.map((segment, index) => {
            if (segment.kind === "gap") {
              return (
                <Box
                  key={`gap-${index}`}
                  sx={{
                    flexGrow: segment.duration,
                    flexBasis: 0,
                    flexShrink: 1,
                  }}
                />
              );
            }

            if (segment.kind === "overlap") {
              return (
                <Tooltip
                  key={`overlap-${index}`}
                  title={`${segment.prev.label}\n${segment.curr.label}`}
                  arrow
                >
                  <Box
                    sx={{
                      flexGrow: segment.duration,
                      flexBasis: 0,
                      flexShrink: 1,
                      bgcolor: `${tc.warning}30`,
                      borderLeft: `1px solid ${tc.warning}60`,
                      borderRight: `1px solid ${tc.warning}60`,
                    }}
                  />
                </Tooltip>
              );
            }

            const isSelected = selectedHallituskausi?.id === segment.period.id;
            return (
              <Box
                key={segment.period.id}
                onClick={() =>
                  onDateChange(
                    segment.period.startDate > rangeStart
                      ? segment.period.startDate
                      : rangeStart,
                  )
                }
                sx={{
                  flexGrow: segment.duration,
                  flexBasis: 0,
                  flexShrink: 1,
                  minWidth: 84,
                  px: 0.75,
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  bgcolor: isSelected
                    ? `${tc.primary}18`
                    : segment.idx % 2 === 0
                      ? `${tc.primary}08`
                      : `${tc.primary}03`,
                  borderRight: `1px solid ${tc.dataBorder}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.62rem",
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? tc.primary : tc.textTertiary,
                    lineHeight: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {segment.period.name}
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Box sx={{ px: 0.75 }}>
          <Slider
            value={currentMs}
            min={startMs}
            max={endMs}
            step={86_400_000}
            onChange={(_, value) => onDateChange(toDate(value as number))}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => formatFinnishDate(toDate(value))}
            sx={{
              py: "6px !important",
              color: tc.primary,
              "& .MuiSlider-thumb": {
                width: 14,
                height: 14,
              },
              "& .MuiSlider-rail": {
                bgcolor: tc.dataBorder,
                opacity: 1,
                height: 4,
              },
              "& .MuiSlider-track": {
                height: 4,
                bgcolor: `${tc.primary}40`,
                border: "none",
              },
              "& .MuiSlider-valueLabel": {
                fontSize: "0.7rem",
                py: 0.25,
                px: 0.75,
                bgcolor: tc.primary,
              },
            }}
          />
        </Box>

        <Box sx={{ position: "relative", height: 14 }}>
          {yearTicks.map((year) => (
            <Typography
              key={year}
              sx={{
                position: "absolute",
                left: `${toPct(`${year}-01-01`)}%`,
                transform: "translateX(-50%)",
                top: 0,
                fontSize: "0.62rem",
                color: tc.textTertiary,
                lineHeight: 1,
              }}
            >
              {year}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
};
