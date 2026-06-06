import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";
import { warnInDevelopment } from "#client/utils/request-errors";
import { getStatusColor, type PartySummary } from "../helpers";

type PartyMember = ApiRouteItem<`/api/parties/:code/members`>;

export const PartyDetailPanel: React.FC<{
  partyCode: string;
  partyName: string;
  partySummary: PartySummary;
  date: string;
}> = ({ partyCode, partyName, partySummary, date }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const [members, setMembers] = React.useState<PartyMember[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ asOfDate: date });
    apiFetch(`/api/parties/${partyCode}/members?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setMembers(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        warnInDevelopment("Failed to fetch party members for drill-down", err);
        setError(t("partyPanel.loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [partyCode, date, t]);

  const ministers = React.useMemo(
    () => members?.filter((m) => m.is_minister === 1) ?? [],
    [members],
  );

  const isGovernment =
    partySummary.government > 0 && partySummary.opposition === 0;
  const isOpposition =
    partySummary.opposition > 0 && partySummary.government === 0;

  return (
    <Box
      sx={{
        mb: spacing.md,
        p: 1.5,
        borderRadius: 1,
        border: `1px solid ${themedColors.dataBorder}`,
        background: themedColors.backgroundSubtle,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="h6"
            sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
          >
            {partyName}
          </Typography>
          <Chip
            size="small"
            label={
              isGovernment
                ? t("partyMatrix.government")
                : isOpposition
                  ? t("partyMatrix.opposition")
                  : t("partyMatrix.mixed")
            }
            sx={{
              fontWeight: 700,
              bgcolor: `${getStatusColor(partySummary.government, partySummary.opposition)}14`,
              color: getStatusColor(
                partySummary.government,
                partySummary.opposition,
              ),
            }}
          />
          <Chip
            size="small"
            label={t("partyPanel.seats", { count: partySummary.total })}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
        <Button
          size="small"
          variant="outlined"
          endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
          onClick={() => {
            const href = `/puolueet?party=${partyCode}`;
            window.history.pushState({}, "", href);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
          sx={{ textTransform: "none" }}
        >
          {t("partyPanel.openPartyPage")}
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      ) : (
        <>
          {ministers.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: themedColors.textSecondary,
                  fontWeight: 700,
                  mb: 0.75,
                }}
              >
                <AccountBalanceIcon
                  sx={{ fontSize: 14, mr: 0.5, verticalAlign: "text-bottom" }}
                />
                {t("partyPanel.ministers")}
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {ministers.map((m) => (
                  <Chip
                    key={m.person_id}
                    size="small"
                    label={`${m.first_name} ${m.last_name}${m.ministry ? ` — ${m.ministry}` : ""}`}
                    sx={{
                      fontWeight: 600,
                      bgcolor: `${colors.success}10`,
                      color: colors.success,
                      border: `1px solid ${colors.success}30`,
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {members && members.length > 0 && (
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <StatChip
                label={t("partyPanel.stats.members")}
                value={String(members.length)}
                themedColors={themedColors}
              />
              <StatChip
                label={t("partyPanel.stats.women")}
                value={String(
                  members.filter((m) => m.gender?.toLowerCase().startsWith("n"))
                    .length,
                )}
                themedColors={themedColors}
              />
              <StatChip
                label={t("partyPanel.stats.men")}
                value={String(
                  members.filter((m) => m.gender?.toLowerCase().startsWith("m"))
                    .length,
                )}
                themedColors={themedColors}
              />
              <StatChip
                label={t("partyPanel.stats.avgAge")}
                value={
                  members.length > 0
                    ? String(
                        Math.round(
                          members.reduce((sum, m) => {
                            if (!m.birth_date) return sum;
                            const birth = new Date(m.birth_date);
                            const now = new Date(date);
                            return (
                              sum + (now.getFullYear() - birth.getFullYear())
                            );
                          }, 0) / members.length,
                        ),
                      )
                    : "-"
                }
                themedColors={themedColors}
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};

const StatChip: React.FC<{
  label: string;
  value: string;
  themedColors: ReturnType<typeof useThemedColors>;
}> = ({ label, value, themedColors }) => (
  <Box
    sx={{
      px: 1,
      py: 0.5,
      borderRadius: 1,
      background: themedColors.backgroundPaper,
      border: `1px solid ${themedColors.dataBorder}`,
    }}
  >
    <Typography
      variant="caption"
      sx={{ color: themedColors.textSecondary, display: "block" }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
    >
      {value}
    </Typography>
  </Box>
);
