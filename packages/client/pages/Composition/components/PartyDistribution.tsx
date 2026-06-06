import {
  Box,
  CardActionArea,
  Chip,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import type React from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { getPartyBlocKey, getStatusColor, type PartySummary } from "../helpers";

export const PartyDistribution: React.FC<{
  stats: {
    governmentMembers: number;
    oppositionMembers: number;
    womenCount: number;
    menCount: number;
    partySummaries: PartySummary[];
    largestParty: PartySummary | null;
  };
  partyFilter: string | null;
  setPartyFilter: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({ stats, partyFilter, setPartyFilter }) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" },
        gap: 2,
        mb: 2,
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: themedColors.textPrimary,
                fontWeight: 700,
                mb: 0.25,
              }}
            >
              {t("distribution.title")}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: themedColors.textSecondary }}
            >
              {t("distribution.description")}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              label={t("snapshot.genderSplit", {
                women: stats.womenCount,
                men: stats.menCount,
              })}
            />
            {stats.largestParty && (
              <Chip
                size="small"
                label={t("snapshot.leadingPartySeats", {
                  party: stats.largestParty.partyName,
                  count: stats.largestParty.total,
                })}
              />
            )}
          </Stack>
        </Stack>
        <Box
          sx={{
            display: "flex",
            height: 18,
            overflow: "hidden",
            borderRadius: 1,
            border: `1px solid ${themedColors.dataBorder}`,
            background: themedColors.backgroundSubtle,
          }}
        >
          {stats.partySummaries.map((party) => (
            <Tooltip
              key={party.partyName}
              title={`${party.partyName}: ${party.total} ${t("distribution.seats")}`}
              arrow
            >
              <Box
                onClick={() =>
                  setPartyFilter((current) =>
                    current === party.partyName ? null : party.partyName,
                  )
                }
                sx={{
                  flex: party.total,
                  minWidth: party.total <= 2 ? 8 : 0,
                  cursor: "pointer",
                  bgcolor: getStatusColor(party.government, party.opposition),
                  opacity:
                    partyFilter && partyFilter !== party.partyName ? 0.45 : 1,
                  transition: "opacity 150ms ease",
                }}
              />
            </Tooltip>
          ))}
        </Box>
        <Box
          sx={{
            mt: 1,
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            },
            gap: 0.75,
          }}
        >
          <Box
            sx={{
              p: 0.75,
              borderRadius: 1,
              background: themedColors.backgroundSubtle,
              border: `1px solid ${themedColors.dataBorder}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary, display: "block" }}
            >
              {t("snapshot.governmentMembers")}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: colors.success, fontWeight: 700 }}
            >
              {stats.governmentMembers}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 0.75,
              borderRadius: 1,
              background: themedColors.backgroundSubtle,
              border: `1px solid ${themedColors.dataBorder}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary, display: "block" }}
            >
              {t("snapshot.oppositionMembers")}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: colors.warning, fontWeight: 700 }}
            >
              {stats.oppositionMembers}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 0.75,
              borderRadius: 1,
              background: themedColors.backgroundSubtle,
              border: `1px solid ${themedColors.dataBorder}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary, display: "block" }}
            >
              {t("distribution.majorityLine")}
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
            >
              {Math.max(0, 101 - stats.governmentMembers)}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 0.75,
              borderRadius: 1,
              background: themedColors.backgroundSubtle,
              border: `1px solid ${themedColors.dataBorder}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: themedColors.textSecondary, display: "block" }}
            >
              {t("distribution.topThreeLine")}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
            >
              {stats.partySummaries
                .slice(0, 3)
                .map((party) => `${party.partyName} ${party.total}`)
                .join(" · ")}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ p: 1.5 }}>
        <Typography
          variant="h6"
          sx={{
            color: themedColors.textPrimary,
            fontWeight: 700,
            mb: 0.75,
          }}
        >
          {t("partyMatrix.title")}
        </Typography>
        <Stack spacing={0.75}>
          {stats.partySummaries.map((party) => (
            <CardActionArea
              key={party.partyName}
              onClick={() =>
                setPartyFilter((current) =>
                  current === party.partyName ? null : party.partyName,
                )
              }
              sx={{
                borderRadius: 1,
                border: `1px solid ${
                  partyFilter === party.partyName
                    ? themedColors.primary
                    : themedColors.dataBorder
                }`,
                p: 0.75,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: themedColors.textPrimary,
                      fontWeight: 700,
                    }}
                  >
                    {party.partyName}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: themedColors.textSecondary }}
                  >
                    {t(getPartyBlocKey(party.government, party.opposition))}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: themedColors.textPrimary,
                  }}
                >
                  {party.total}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={party.share * 100}
                sx={{
                  mt: 0.75,
                  height: 6,
                  borderRadius: 1,
                  bgcolor: themedColors.backgroundSubtle,
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 1,
                    bgcolor: getStatusColor(party.government, party.opposition),
                  },
                }}
              />
            </CardActionArea>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};
