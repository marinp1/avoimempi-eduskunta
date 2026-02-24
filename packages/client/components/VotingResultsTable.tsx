import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { colors } from "#client/theme";

export type VotingPartyBreakdown = {
  party_code: string;
  party_name: string;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
};

export type VotingMemberVote = {
  person_id: number;
  first_name: string;
  last_name: string;
  party_code: string;
  vote: string;
  is_government: 0 | 1;
};

export const VotingResultsTable: React.FC<{
  partyBreakdown: VotingPartyBreakdown[];
  memberVotes: VotingMemberVote[];
}> = ({ partyBreakdown, memberVotes }) => {
  const { t } = useTranslation();
  const [groupBy, setGroupBy] = useState<"party" | "representative">("party");

  if (partyBreakdown.length === 0 && memberVotes.length === 0) return null;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          mb: 0.5,
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ fontSize: "0.68rem", color: colors.textSecondary }}>
          {t("votings.resultsTable.title")}
        </Typography>
        <Button
          size="small"
          variant={groupBy === "party" ? "contained" : "outlined"}
          sx={{
            minWidth: 0,
            px: 1,
            fontSize: "0.65rem",
            textTransform: "none",
            height: 22,
          }}
          onClick={() => setGroupBy("party")}
        >
          {t("votings.resultsTable.groupByParty")}
        </Button>
        <Button
          size="small"
          variant={groupBy === "representative" ? "contained" : "outlined"}
          sx={{
            minWidth: 0,
            px: 1,
            fontSize: "0.65rem",
            textTransform: "none",
            height: 22,
          }}
          onClick={() => setGroupBy("representative")}
        >
          {t("votings.resultsTable.groupByRepresentative")}
        </Button>
      </Box>
      <TableContainer
        sx={{ border: `1px solid ${colors.dataBorder}60`, borderRadius: 1 }}
      >
        {groupBy === "party" ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }}>
                  {t("common.party")}
                </TableCell>
                <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }} align="right">
                  {t("common.yes")}
                </TableCell>
                <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }} align="right">
                  {t("common.no")}
                </TableCell>
                <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }} align="right">
                  {t("common.empty")}
                </TableCell>
                <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }} align="right">
                  {t("common.absent")}
                </TableCell>
                <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }} align="right">
                  {t("votings.results.total")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {partyBreakdown.map((party) => (
                <TableRow key={party.party_code}>
                  <TableCell sx={{ fontSize: "0.68rem", py: 0.4 }}>
                    {party.party_name}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: "0.68rem", py: 0.4 }}
                    align="right"
                  >
                    {party.n_yes}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: "0.68rem", py: 0.4 }}
                    align="right"
                  >
                    {party.n_no}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: "0.68rem", py: 0.4 }}
                    align="right"
                  >
                    {party.n_abstain}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: "0.68rem", py: 0.4 }}
                    align="right"
                  >
                    {party.n_absent}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: "0.68rem", py: 0.4 }}
                    align="right"
                  >
                    {party.n_total}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }}>
                  {t("votings.resultsTable.representative")}
                </TableCell>
                <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }}>
                  {t("common.party")}
                </TableCell>
                <TableCell sx={{ fontSize: "0.65rem", py: 0.5 }}>
                  {t("votings.resultsTable.vote")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {memberVotes.map((member) => (
                <TableRow key={member.person_id}>
                  <TableCell sx={{ fontSize: "0.68rem", py: 0.4 }}>
                    {member.last_name}, {member.first_name}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.68rem", py: 0.4 }}>
                    {member.party_code}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.68rem", py: 0.4 }}>
                    {member.vote}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};
