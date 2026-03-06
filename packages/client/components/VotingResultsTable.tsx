import {
  Box,
  Button,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import { colors, commonStyles } from "#client/theme";

const tableHeadCellSx = { ...commonStyles.compactTextXs, py: 0.5 };
const tableBodyCellSx = { ...commonStyles.compactTextSm, py: 0.4 };

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
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tVotings } = useScopedTranslation("votings");
  const [groupBy, setGroupBy] = useState<"party" | "representative">("party");

  if (partyBreakdown.length === 0 && memberVotes.length === 0) return null;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Box
        role="group"
        aria-label={tVotings("resultsTable.title")}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          mb: 0.5,
          flexWrap: "wrap",
        }}
      >
        <Typography
          sx={{ ...commonStyles.compactTextSm, color: colors.textSecondary }}
        >
          {tVotings("resultsTable.title")}
        </Typography>
        <Button
          size="small"
          variant={groupBy === "party" ? "contained" : "outlined"}
          aria-pressed={groupBy === "party"}
          sx={{
            ...commonStyles.compactActionButton,
            ...commonStyles.compactTextXs,
            height: 22,
          }}
          onClick={() => setGroupBy("party")}
        >
          {tVotings("resultsTable.groupByParty")}
        </Button>
        <Button
          size="small"
          variant={groupBy === "representative" ? "contained" : "outlined"}
          aria-pressed={groupBy === "representative"}
          sx={{
            ...commonStyles.compactActionButton,
            ...commonStyles.compactTextXs,
            height: 22,
          }}
          onClick={() => setGroupBy("representative")}
        >
          {tVotings("resultsTable.groupByRepresentative")}
        </Button>
      </Box>
      <TableContainer
        sx={{ border: `1px solid ${colors.dataBorder}60`, borderRadius: 1 }}
      >
        {groupBy === "party" ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadCellSx}>{tCommon("party")}</TableCell>
                <TableCell sx={tableHeadCellSx} align="right">
                  {tCommon("yes")}
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="right">
                  {tCommon("no")}
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="right">
                  {tCommon("empty")}
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="right">
                  {tCommon("absent")}
                </TableCell>
                <TableCell sx={tableHeadCellSx} align="right">
                  {tVotings("results.total")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {partyBreakdown.map((party) => (
                <TableRow key={party.party_code}>
                  <TableCell sx={tableBodyCellSx}>{party.party_name}</TableCell>
                  <TableCell sx={tableBodyCellSx} align="right">
                    {party.n_yes}
                  </TableCell>
                  <TableCell sx={tableBodyCellSx} align="right">
                    {party.n_no}
                  </TableCell>
                  <TableCell sx={tableBodyCellSx} align="right">
                    {party.n_abstain}
                  </TableCell>
                  <TableCell sx={tableBodyCellSx} align="right">
                    {party.n_absent}
                  </TableCell>
                  <TableCell sx={tableBodyCellSx} align="right">
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
                <TableCell sx={tableHeadCellSx}>
                  {tVotings("resultsTable.representative")}
                </TableCell>
                <TableCell sx={tableHeadCellSx}>{tCommon("party")}</TableCell>
                <TableCell sx={tableHeadCellSx}>
                  {tVotings("resultsTable.vote")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {memberVotes.map((member) => (
                <TableRow key={member.person_id}>
                  <TableCell sx={tableBodyCellSx}>
                    <Link
                      href={refs.member(member.person_id)}
                      underline="hover"
                      sx={{ color: "inherit", fontWeight: 500 }}
                    >
                      {member.last_name}, {member.first_name}
                    </Link>
                  </TableCell>
                  <TableCell sx={tableBodyCellSx}>
                    {member.party_code}
                  </TableCell>
                  <TableCell sx={tableBodyCellSx}>{member.vote}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};
