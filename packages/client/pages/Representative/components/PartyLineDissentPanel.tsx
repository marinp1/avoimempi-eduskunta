import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import React from "react";
import { apiFetch } from "#client/utils/fetch";
import { VotingDrawerContent } from "../../../components/VotingCard";
import { useOverlayDrawer } from "../../../context/OverlayDrawerContext";
import { useThemedColors } from "../../../theme/ThemeContext";
import { JudgmentLine, judgeAgainstBaseline } from "./JudgmentLine";

interface DissentRow {
  voting_id: number;
  start_time: string;
  title: string;
  section_title: string;
  mp_vote: string;
  majority_vote: string;
  party_name: string;
}

interface PartyLineDissentPanelProps {
  personId: number;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fi-FI") : "—";

const PREVIEW = 5;

export const PartyLineDissentPanel: React.FC<PartyLineDissentPanelProps> = ({
  personId,
}) => {
  const themed = useThemedColors();
  const { openRootDrawer } = useOverlayDrawer();
  const openVotingDrawer = React.useCallback(
    (row: DissentRow) => {
      openRootDrawer({
        drawerKey: `voting:${row.voting_id}`,
        title: row.section_title || row.title || `Äänestys #${row.voting_id}`,
        subtitle: row.start_time
          ? new Date(row.start_time).toLocaleDateString("fi-FI")
          : undefined,
        content: <VotingDrawerContent votingId={row.voting_id} />,
      });
    },
    [openRootDrawer],
  );
  const [rows, setRows] = React.useState<DissentRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setRows(null);
    setError(false);
    setShowAll(false);
    apiFetch(`/api/person/${personId}/dissents`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ctrl.signal.aborted && Array.isArray(d)) setRows(d);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      });
    return () => ctrl.abort();
  }, [personId]);

  if (error) {
    return (
      <Typography variant="body2" sx={{ color: themed.textTertiary }}>
        Ryhmäkurin poikkeamia ei voitu ladata.
      </Typography>
    );
  }
  if (!rows) {
    return <Skeleton variant="rectangular" height={120} />;
  }

  if (rows.length === 0) {
    return (
      <JudgmentLine
        text="Edustaja ei ole äänestänyt vastoin oman ryhmänsä enemmistöä yhdessäkään seuratussa äänestyksessä."
        tone="neutral"
      />
    );
  }

  // Tone is informational — no party-baseline yet, so use plain "neutral".
  const tone = judgeAgainstBaseline(rows.length, 0);
  const visible = showAll ? rows : rows.slice(0, PREVIEW);

  return (
    <Stack spacing={1.25}>
      <JudgmentLine
        text={`Edustaja on äänestänyt ${rows.length} kertaa vastoin oman ryhmänsä enemmistöä.`}
        tone={tone === "above" ? "below" : tone}
      />
      <Stack spacing={0.5}>
        {visible.map((row) => (
          <Box
            key={row.voting_id}
            component="button"
            type="button"
            onClick={() => openVotingDrawer(row)}
            sx={{
              py: 0.75,
              px: 1,
              borderLeft: `2px solid ${themed.warning ?? "#c77700"}`,
              backgroundColor: themed.backgroundSubtle,
              border: "none",
              borderLeftStyle: "solid",
              borderLeftWidth: "2px",
              borderLeftColor: themed.warning ?? "#c77700",
              textAlign: "left",
              width: "100%",
              cursor: "pointer",
              "&:hover": { backgroundColor: themed.dataBorder },
            }}
          >
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              spacing={1}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ color: themed.textPrimary, fontWeight: 600 }}
                >
                  {row.section_title || row.title}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ mt: 0.25, flexWrap: "wrap" }}
                >
                  <Chip
                    label={`Äänesti: ${row.mp_vote}`}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: "0.6rem",
                      bgcolor: themed.warning ?? "#c77700",
                      color: "#fff",
                    }}
                  />
                  <Chip
                    label={`Ryhmän enemmistö: ${row.majority_vote}`}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: "0.6rem",
                      bgcolor: themed.backgroundSubtle,
                      color: themed.textSecondary,
                      border: `1px solid ${themed.dataBorder}`,
                    }}
                  />
                </Stack>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: themed.textTertiary,
                  fontFamily: "monospace",
                  flexShrink: 0,
                }}
              >
                {formatDate(row.start_time)}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Stack>
      {rows.length > PREVIEW && (
        <Box
          component="button"
          type="button"
          onClick={() => setShowAll((v) => !v)}
          sx={{
            background: "none",
            border: "none",
            color: themed.accent,
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            py: 0.5,
            textAlign: "left",
            alignSelf: "flex-start",
          }}
        >
          {showAll ? "Näytä vähemmän" : `Näytä kaikki (${rows.length})`}
        </Box>
      )}
    </Stack>
  );
};
