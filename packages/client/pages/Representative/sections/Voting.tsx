import { Box, Divider, Skeleton, Typography } from "@mui/material";
import React from "react";
import { useThemedColors } from "../../../theme/ThemeContext";
import { PartyLineDissentPanel } from "../components/PartyLineDissentPanel";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

const VotesTab = React.lazy(() =>
  import("../../Composition/Details").then((m) => ({ default: m.VotesTab })),
);

const Voting: React.FC<ProfileSectionProps> = ({ personId, scope }) => {
  const themed = useThemedColors();
  return (
    <SectionShell
      anchor="aanestykset"
      title="Äänestykset"
      methodology="Tilastot kootaan kaikista täysistunnon nimenhuutoäänestyksistä, joissa edustaja on ollut paikalla tai poissa. Ryhmäkurin poikkeamat lasketaan vertaamalla edustajan ääntä oman parlamenttiryhmänsä enemmistöön kussakin äänestyksessä."
    >
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="overline"
          sx={{ color: themed.textTertiary, letterSpacing: "0.06em" }}
        >
          Ryhmäkurin poikkeamat
        </Typography>
        <Box sx={{ mt: 0.5 }}>
          <PartyLineDissentPanel personId={personId} />
        </Box>
      </Box>
      <Divider sx={{ my: 2 }} />
      <React.Suspense
        fallback={<Skeleton variant="rectangular" height={240} />}
      >
        <VotesTab personId={personId} scope={scope} />
      </React.Suspense>
    </SectionShell>
  );
};

export default Voting;
