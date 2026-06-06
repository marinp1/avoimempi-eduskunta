import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import type { MemberWithExtras } from "../helpers";

type PartyDelta = {
  partyName: string;
  delta: number;
};

export const CompositionDiffBanner: React.FC<{
  previousMembers: MemberWithExtras[];
  currentMembers: MemberWithExtras[];
}> = ({ previousMembers, currentMembers }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();
  const [dismissed, setDismissed] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const diff = React.useMemo(() => {
    const prevIds = new Set(previousMembers.map((m) => m.person_id));
    const currIds = new Set(currentMembers.map((m) => m.person_id));

    const added = currentMembers.filter((m) => !prevIds.has(m.person_id));
    const removed = previousMembers.filter((m) => !currIds.has(m.person_id));

    const prevPartyCounts: Record<string, number> = {};
    for (const m of previousMembers) {
      const p = m.party_name || "?";
      prevPartyCounts[p] = (prevPartyCounts[p] || 0) + 1;
    }
    const currPartyCounts: Record<string, number> = {};
    for (const m of currentMembers) {
      const p = m.party_name || "?";
      currPartyCounts[p] = (currPartyCounts[p] || 0) + 1;
    }

    const allParties = new Set([
      ...Object.keys(prevPartyCounts),
      ...Object.keys(currPartyCounts),
    ]);
    const partyDeltas: PartyDelta[] = [];
    for (const party of allParties) {
      const delta =
        (currPartyCounts[party] || 0) - (prevPartyCounts[party] || 0);
      if (delta !== 0) {
        partyDeltas.push({ partyName: party, delta });
      }
    }
    partyDeltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return { added, removed, partyDeltas };
  }, [previousMembers, currentMembers]);

  React.useEffect(() => {
    setDismissed(false);
    setExpanded(false);
  }, [previousMembers, currentMembers]);

  if (dismissed || (diff.added.length === 0 && diff.removed.length === 0)) {
    return null;
  }

  return (
    <Box
      sx={{
        mb: 2,
        p: 1.25,
        borderRadius: 1,
        border: `1px solid ${themedColors.dataBorder}`,
        background: `${themedColors.primary}06`,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          <Typography
            variant="body2"
            sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
          >
            {t("diffBanner.summary", {
              added: diff.added.length,
              removed: diff.removed.length,
            })}
          </Typography>
          {diff.partyDeltas.slice(0, 6).map((pd) => (
            <Chip
              key={pd.partyName}
              size="small"
              label={`${pd.delta > 0 ? "+" : ""}${pd.delta} ${pd.partyName}`}
              sx={{
                fontWeight: 700,
                bgcolor:
                  pd.delta > 0 ? `${colors.success}12` : `${colors.error}12`,
                color: pd.delta > 0 ? colors.success : colors.error,
              }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          {(diff.added.length > 0 || diff.removed.length > 0) && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              <ExpandMoreIcon
                sx={{
                  fontSize: 18,
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform 200ms",
                }}
              />
            </IconButton>
          )}
          <IconButton size="small" onClick={() => setDismissed(true)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1.5 }}>
          {diff.added.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: colors.success,
                  fontWeight: 700,
                  display: "block",
                  mb: 0.5,
                }}
              >
                {t("diffBanner.added", { count: diff.added.length })}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {diff.added.map((m) => (
                  <Chip
                    key={m.person_id}
                    size="small"
                    label={`${m.first_name} ${m.last_name} (${m.party_name || "?"})`}
                    variant="outlined"
                    sx={{ borderColor: `${colors.success}40` }}
                  />
                ))}
              </Stack>
            </Box>
          )}
          {diff.removed.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: colors.error,
                  fontWeight: 700,
                  display: "block",
                  mb: 0.5,
                }}
              >
                {t("diffBanner.removed", { count: diff.removed.length })}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {diff.removed.map((m) => (
                  <Chip
                    key={m.person_id}
                    size="small"
                    label={`${m.first_name} ${m.last_name} (${m.party_name || "?"})`}
                    variant="outlined"
                    sx={{ borderColor: `${colors.error}40` }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
