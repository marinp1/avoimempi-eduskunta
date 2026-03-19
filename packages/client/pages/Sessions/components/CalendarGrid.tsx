import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, IconButton, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { DataCard } from "#client/theme/components";
import { colors } from "#client/theme/index";
import { useThemedColors } from "#client/theme/ThemeContext";

export const CalendarGrid = ({
  validDates,
  selectedDate,
  onSelectDate,
}: {
  validDates: Set<string>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) => {
  const themedColors = useThemedColors();

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) =>
        new Intl.DateTimeFormat("fi-FI", { month: "short" })
          .format(new Date(2020, monthIndex, 1))
          .replace(".", ""),
      ),
    [],
  );
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, dayIndex) =>
        new Intl.DateTimeFormat("fi-FI", { weekday: "short" })
          .format(new Date(2020, 0, dayIndex + 6))
          .replace(".", ""),
      ),
    [],
  );

  const [viewYear, setViewYear] = useState(() =>
    parseInt(selectedDate.slice(0, 4), 10),
  );
  const [viewMonth, setViewMonth] = useState(
    () => parseInt(selectedDate.slice(5, 7), 10) - 1,
  );

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Monday-based: 0=Mon, 6=Sun
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthLast = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let d = 1; d <= lastDate; d++) {
      days.push({
        date: `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <DataCard sx={{ p: 2, mb: 3 }}>
      {/* Month navigation */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <IconButton onClick={prevMonth} size="small">
          <ChevronLeftIcon />
        </IconButton>
        <Typography
          sx={{ fontWeight: 700, fontSize: "1rem", color: colors.textPrimary }}
        >
          {monthNames[viewMonth]} {viewYear}
        </Typography>
        <IconButton onClick={nextMonth} size="small">
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Day headers */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
          mb: 0.5,
        }}
      >
        {weekDays.map((day) => (
          <Box key={day} sx={{ textAlign: "center" }}>
            <Typography
              sx={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: colors.textTertiary,
              }}
            >
              {day}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
        }}
      >
        {daysInMonth.map(({ date, day, isCurrentMonth }) => {
          const hasSession = validDates.has(date);
          const isSelected = date === selectedDate;

          return (
            <Box
              key={date}
              onClick={() => {
                if (hasSession) onSelectDate(date);
              }}
              sx={{
                textAlign: "center",
                py: 0.75,
                minHeight: 44,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1,
                cursor: hasSession ? "pointer" : "default",
                position: "relative",
                background: isSelected
                  ? colors.primary
                  : hasSession
                    ? `${colors.primaryLight}08`
                    : "transparent",
                "&:hover": hasSession
                  ? {
                      background: isSelected
                        ? colors.primary
                        : `${colors.primaryLight}18`,
                    }
                  : {},
                transition: "background 0.15s",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.8125rem",
                  fontWeight: isSelected ? 700 : hasSession ? 600 : 400,
                  color: isSelected
                    ? "#fff"
                    : !isCurrentMonth
                      ? colors.textTertiary
                      : hasSession
                        ? colors.textPrimary
                        : colors.textSecondary,
                }}
              >
                {day}
              </Typography>
              {/* Session indicator dot */}
              {hasSession && !isSelected && (
                <Box
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: themedColors.success,
                    mx: "auto",
                    mt: 0.25,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </DataCard>
  );
};
