import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Fade,
  Paper,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type HallituskausiPeriod,
  useHallituskausi,
} from "#client/filters/HallituskausiContext";
import { commonStyles, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";

type Government = {
  id: number;
  name: string;
  start_date: string;
  end_date: string | null;
  member_count: number;
  parties: string[];
};

type GovernmentMember = {
  id: number;
  person_id: number | null;
  name: string | null;
  ministry: string | null;
  start_date: string | null;
  end_date: string | null;
  first_name: string | null;
  last_name: string | null;
  party: string | null;
  gender: string | null;
};

// ─── Timeline selector ────────────────────────────────────────────────────────

const TimelineSelector: React.FC<{
  hallituskaudet: HallituskausiPeriod[];
  todayIso: string;
  date: string;
  onDateChange: (date: string) => void;
}> = ({ hallituskaudet, todayIso, date, onDateChange }) => {
  const tc = useThemedColors();

  const sorted = [...hallituskaudet].sort((a, b) =>
    a.startDate < b.startDate ? -1 : 1,
  );

  const rangeStart = sorted[0]?.startDate ?? "2000-01-01";
  const rangeEnd = todayIso;

  const startMs = new Date(rangeStart).getTime();
  const endMs = new Date(rangeEnd).getTime();
  const span = endMs - startMs;

  if (span <= 0 || sorted.length === 0) return null;

  const toMs = (d: string) => new Date(d).getTime();
  const toDate = (ms: number) => new Date(ms).toISOString().split("T")[0];
  const toPct = (d: string) =>
    Math.max(0, Math.min(100, ((toMs(d) - startMs) / span) * 100));

  const currentMs = Math.max(startMs, Math.min(endMs, toMs(date)));

  const formatLabel = (ms: number) => {
    const [yr, mo, dy] = toDate(ms).split("-");
    return `${parseInt(dy)}.${parseInt(mo)}.${yr}`;
  };

  type Seg =
    | { kind: "period"; p: HallituskausiPeriod; duration: number; idx: number }
    | { kind: "gap"; duration: number };

  const segments: Seg[] = [];
  let cursor = startMs;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const pStart = Math.max(toMs(p.startDate), startMs);
    const pEnd = Math.min(toMs(p.endDate ?? todayIso), endMs);
    if (pStart > cursor) {
      segments.push({ kind: "gap", duration: pStart - cursor });
    }
    if (pEnd > Math.max(pStart, cursor)) {
      const start = Math.max(pStart, cursor);
      segments.push({ kind: "period", p, duration: pEnd - start, idx: i });
      cursor = pEnd;
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
  for (let y = startYear + 1; y <= endYear; y++) {
    if ((y - startYear) % yearStep === 0) {
      const pct = toPct(`${y}-01-01`);
      if (pct > 2 && pct < 98) yearTicks.push(y);
    }
  }

  return (
    <Box sx={{ mb: spacing.md }}>
      <Box
        sx={{
          display: "flex",
          height: 28,
          borderRadius: 0.5,
          overflow: "hidden",
          border: `1px solid ${tc.dataBorder}`,
        }}
      >
        {segments.map((seg, i) => {
          if (seg.kind === "gap") {
            return (
              <Box
                key={`gap-${i}`}
                sx={{ flexGrow: seg.duration, flexBasis: 0, flexShrink: 1 }}
              />
            );
          }
          const { p, duration, idx } = seg;
          const isActive =
            toMs(date) >= toMs(p.startDate) &&
            toMs(date) <= toMs(p.endDate ?? todayIso);
          const nextIsPeriod = segments[i + 1]?.kind === "period";
          return (
            <Box
              key={p.id}
              title={p.label}
              onClick={() => onDateChange(p.startDate)}
              sx={{
                flexGrow: duration,
                flexBasis: 0,
                flexShrink: 1,
                position: "relative",
                bgcolor: isActive
                  ? `${tc.primary}18`
                  : idx % 2 === 0
                    ? `${tc.primary}08`
                    : `${tc.primary}03`,
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                px: 0.75,
                cursor: "pointer",
                transition: "background-color 0.15s",
                "&:hover": { bgcolor: `${tc.primary}14` },
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? tc.primary : tc.textTertiary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                {p.name}
              </Typography>
              {nextIsPeriod && (
                <Box
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: "15%",
                    bottom: "15%",
                    width: "1px",
                    bgcolor: tc.dataBorder,
                  }}
                />
              )}
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
          onChange={(_, v) => onDateChange(toDate(v as number))}
          valueLabelDisplay="auto"
          valueLabelFormat={formatLabel}
          sx={{
            py: "6px !important",
            color: tc.primary,
            "& .MuiSlider-thumb": {
              width: 14,
              height: 14,
              "&:hover, &.Mui-focusVisible": {
                boxShadow: `0 0 0 6px ${tc.primary}1A`,
              },
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
        {yearTicks.map((year) => {
          const pct = toPct(`${year}-01-01`);
          return (
            <Typography
              key={year}
              sx={{
                position: "absolute",
                left: `${pct}%`,
                transform: "translateX(-50%)",
                fontSize: "0.6rem",
                color: tc.textTertiary,
                userSelect: "none",
                lineHeight: 1,
                top: 0,
              }}
            >
              {year}
            </Typography>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── Government card ──────────────────────────────────────────────────────────

const GovernmentCard: React.FC<{
  gov: Government;
  isCurrent: boolean;
  isActive: boolean;
}> = ({ gov, isCurrent, isActive }) => {
  const { t } = useTranslation();
  const tc = useThemedColors();
  const [members, setMembers] = useState<GovernmentMember[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded || members !== null) return;
    setMembersLoading(true);
    fetch(`/api/hallitukset/${gov.id}/members`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<GovernmentMember[]>;
      })
      .then((data) => setMembers(data))
      .catch(() => setMembersError(t("hallitukset.membersLoadError")))
      .finally(() => setMembersLoading(false));
  }, [expanded, gov.id, members, t]);

  const formatDate = (d: string | null) => {
    if (!d) return "...";
    const [yr, mo, dy] = d.split("-");
    return `${parseInt(dy)}.${parseInt(mo)}.${yr}`;
  };

  // Group members by ministry
  const byMinistry = React.useMemo(() => {
    if (!members) return [];
    const map = new Map<string, GovernmentMember[]>();
    for (const m of members) {
      const key = m.ministry ?? "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "fi"),
    );
  }, [members]);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        border: `1px solid ${isActive ? tc.primary : tc.dataBorder}`,
        borderLeft: isActive ? `3px solid ${tc.primary}` : undefined,
        borderRadius: 1,
        background: tc.backgroundPaper,
        boxShadow: isActive
          ? `0 2px 8px ${tc.primary}18`
          : "0 1px 3px rgba(0,0,0,0.06)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <Accordion
        expanded={expanded}
        onChange={(_, v) => setExpanded(v)}
        elevation={0}
        disableGutters
        sx={{ background: "transparent", "&::before": { display: "none" } }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            px: 2.5,
            py: 1.5,
            minHeight: "auto",
            "& .MuiAccordionSummary-content": { my: 0 },
          }}
        >
          <Box sx={{ width: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: tc.textPrimary,
                    lineHeight: 1.3,
                  }}
                >
                  {gov.name}
                </Typography>
                {isCurrent && (
                  <Chip
                    label={t("hallitukset.current")}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      bgcolor: tc.success,
                      color: "white",
                    }}
                  />
                )}
              </Box>
              <Typography
                variant="body2"
                sx={{ color: tc.textTertiary, flexShrink: 0 }}
              >
                {formatDate(gov.start_date)} – {formatDate(gov.end_date)}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {gov.parties.map((party) => (
                <Chip
                  key={party}
                  label={party}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.72rem",
                    fontWeight: 500,
                    bgcolor: `${tc.primary}12`,
                    color: tc.primary,
                    border: `1px solid ${tc.primary}30`,
                  }}
                />
              ))}
              {gov.member_count > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: tc.textTertiary,
                    alignSelf: "center",
                    ml: "auto",
                  }}
                >
                  {gov.member_count} {t("hallitukset.ministers")}
                </Typography>
              )}
            </Stack>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2 }}>
          {membersLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} sx={{ color: tc.primary }} />
            </Box>
          )}
          {membersError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {membersError}
            </Alert>
          )}
          {!membersLoading &&
            !membersError &&
            members !== null &&
            (members.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: tc.textTertiary, py: 1 }}
              >
                {t("hallitukset.noMembers")}
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  border: `1px solid ${tc.dataBorder}`,
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ background: tc.primaryGradient }}>
                      <TableCell sx={{ ...commonStyles.tableHeader }}>
                        {t("hallitukset.name")}
                      </TableCell>
                      <TableCell sx={{ ...commonStyles.tableHeader }}>
                        {t("hallitukset.ministry")}
                      </TableCell>
                      <TableCell sx={{ ...commonStyles.tableHeader }}>
                        {t("hallitukset.party")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {byMinistry.map(([ministry, mems]) =>
                      mems.map((m, mi) => (
                        <TableRow
                          key={m.id}
                          sx={{
                            ...commonStyles.tableRow,
                            borderBottom: `1px solid ${tc.dataBorder}`,
                          }}
                        >
                          <TableCell sx={{ ...commonStyles.dataCell, py: 1 }}>
                            {m.first_name && m.last_name
                              ? `${m.first_name} ${m.last_name}`
                              : (m.name ?? "—")}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: tc.textSecondary,
                              py: 1,
                            }}
                          >
                            {mi === 0 ? ministry : ""}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...commonStyles.labelCell,
                              color: tc.textSecondary,
                              py: 1,
                            }}
                          >
                            {m.party ?? "—"}
                          </TableCell>
                        </TableRow>
                      )),
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ))}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default () => {
  const { t } = useTranslation();
  const tc = useThemedColors();
  const { hallituskaudet } = useHallituskausi();

  const todayIso = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState<string>(todayIso);
  const [governments, setGovernments] = useState<Government[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hallitukset")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Government[]>;
      })
      .then(setGovernments)
      .catch(() => setError(t("hallitukset.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const activeGovernment = React.useMemo(() => {
    return governments.find(
      (g) =>
        g.start_date <= date && (g.end_date === null || g.end_date >= date),
    );
  }, [governments, date]);

  const isToday = date === todayIso;

  const formatFinnishDate = (d: string) => {
    const [yr, mo, dy] = d.split("-");
    return `${parseInt(dy)}.${parseInt(mo)}.${yr}`;
  };

  return (
    <Box>
      <Box sx={{ mb: spacing.md }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, color: tc.textPrimary, mb: 0.5 }}
        >
          {t("hallitukset.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("hallitukset.subtitle")}
        </Typography>
      </Box>

      <TimelineSelector
        hallituskaudet={hallituskaudet}
        todayIso={todayIso}
        date={date}
        onDateChange={setDate}
      />

      {!isToday && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            px: 1.5,
            py: 0.875,
            mb: spacing.md,
            borderRadius: 1,
            bgcolor: `${tc.warning}08`,
            borderTop: `1px solid ${tc.warning}28`,
            borderRight: `1px solid ${tc.warning}28`,
            borderBottom: `1px solid ${tc.warning}28`,
            borderLeft: `3px solid ${tc.warning}80`,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: tc.textSecondary, flexGrow: 1 }}
          >
            <Box
              component="span"
              sx={{ fontWeight: 600, color: tc.textPrimary }}
            >
              {t("hallitukset.historicalView")}
            </Box>
            {" · "}
            {formatFinnishDate(date)}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setDate(todayIso)}
            sx={{
              textTransform: "none",
              fontSize: "0.75rem",
              py: 0.25,
              px: 1.25,
              flexShrink: 0,
              borderColor: `${tc.warning}60`,
              color: tc.warning,
              "&:hover": {
                borderColor: tc.warning,
                bgcolor: `${tc.warning}10`,
              },
            }}
          >
            {t("hallitukset.returnToPresent")}
          </Button>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: spacing.xl }}>
          <CircularProgress sx={{ color: tc.primary }} />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: spacing.md }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Fade in timeout={700}>
          <Box>
            {governments.map((gov) => {
              const isCurrent =
                gov.start_date <= todayIso &&
                (gov.end_date === null || gov.end_date >= todayIso);
              const isActive = gov.id === activeGovernment?.id;
              return (
                <GovernmentCard
                  key={gov.id}
                  gov={gov}
                  isCurrent={isCurrent}
                  isActive={isActive}
                />
              );
            })}
          </Box>
        </Fade>
      )}
    </Box>
  );
};
