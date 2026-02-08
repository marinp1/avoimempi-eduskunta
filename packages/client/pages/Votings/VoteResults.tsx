// VoteResults.tsx

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import RemoveIcon from "@mui/icons-material/Remove";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Fade,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React from "react";
import { commonStyles, shadows, spacing } from "#client/theme";
import { useThemedColors } from "#client/theme/ThemeContext";
import { getVoteColors } from "#client/theme/vote-styles";

const cache = new Map<string, ReturnType<typeof getVotings>>();

const getVotings = async (query: string) => {
  if (!query.trim() || query.trim().length < 3) return {};
  const qp = new URLSearchParams({ q: query.trim() });
  return fetch(`/api/votings/search?${qp.toString()}`)
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    })
    .then((data: DatabaseTables.Voting[]) =>
      Object.groupBy(data, (d) => d.section_title),
    );
};

export function fetchData(query: string) {
  if (!cache.has(query)) {
    cache.set(query, getVotings(query));
  }
  return (
    cache.get(query) ??
    Promise.resolve({} as Record<string, DatabaseTables.Voting[]>)
  );
}

const eduskuntaLink = (href: string) => {
  if (!href.startsWith("/")) href = `/${href}`;
  return `https://www.eduskunta.fi${href}`;
};

/** Mobile card for a single vote result */
const VoteCard: React.FC<{
  res: DatabaseTables.Voting;
  themedColors: ReturnType<typeof useThemedColors>;
  voteColors: ReturnType<typeof getVoteColors>;
}> = ({ res, themedColors, voteColors }) => (
  <Box
    sx={{
      p: 2,
      borderBottom: `1px solid ${themedColors.dataBorder}`,
      "&:last-child": { borderBottom: "none" },
    }}
  >
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Typography
          variant="caption"
          sx={{ color: themedColors.textSecondary }}
        >
          {res.start_time
            ? new Date(res.start_time).toLocaleDateString("fi-FI")
            : "-"}
        </Typography>
        <Chip
          label={res.section_processing_phase}
          size="small"
          sx={{
            background: themedColors.primary,
            color: "white",
            fontWeight: 700,
            fontSize: "0.65rem",
            height: 22,
          }}
        />
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          color: themedColors.textPrimary,
          mb: 1.5,
        }}
      >
        {res.title}
      </Typography>
    </Box>

    {/* Vote counts in a compact grid */}
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1,
        mb: 1.5,
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <ThumbUpIcon sx={{ fontSize: 16, color: voteColors.yes, mb: 0.25 }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: voteColors.yes, fontSize: "0.875rem" }}
        >
          {res.n_yes}
        </Typography>
        <Typography variant="caption" sx={{ color: themedColors.textTertiary, fontSize: "0.625rem" }}>
          Jaa
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <ThumbDownIcon sx={{ fontSize: 16, color: voteColors.no, mb: 0.25 }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: voteColors.no, fontSize: "0.875rem" }}
        >
          {res.n_no}
        </Typography>
        <Typography variant="caption" sx={{ color: themedColors.textTertiary, fontSize: "0.625rem" }}>
          Ei
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <RemoveIcon sx={{ fontSize: 16, color: voteColors.abstain, mb: 0.25 }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: voteColors.abstain, fontSize: "0.875rem" }}
        >
          {res.n_abstain}
        </Typography>
        <Typography variant="caption" sx={{ color: themedColors.textTertiary, fontSize: "0.625rem" }}>
          Tyhjää
        </Typography>
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <PersonOffIcon sx={{ fontSize: 16, color: voteColors.absent, mb: 0.25 }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: voteColors.absent, fontSize: "0.875rem" }}
        >
          {res.n_absent}
        </Typography>
        <Typography variant="caption" sx={{ color: themedColors.textTertiary, fontSize: "0.625rem" }}>
          Poissa
        </Typography>
      </Box>
    </Box>

    {/* Links */}
    <Box sx={{ display: "flex", gap: 1 }}>
      <Link
        target="_blank"
        href={eduskuntaLink(res.result_url)}
        sx={{
          color: themedColors.primary,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.8125rem",
          padding: "4px 10px",
          borderRadius: 1,
          border: `1px solid ${themedColors.primary}`,
          transition: "all 0.2s ease",
          "&:hover": {
            background: themedColors.primary,
            color: "white",
            textDecoration: "none",
          },
        }}
      >
        Tulokset
      </Link>
      <Link
        target="_blank"
        href={eduskuntaLink(res.proceedings_url)}
        sx={{
          color: themedColors.primary,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.8125rem",
          padding: "4px 10px",
          borderRadius: 1,
          border: `1px solid ${themedColors.primary}`,
          transition: "all 0.2s ease",
          "&:hover": {
            background: themedColors.primary,
            color: "white",
            textDecoration: "none",
          },
        }}
      >
        Pöytäkirja
      </Link>
    </Box>
  </Box>
);

export const VoteResults: React.FC<{ query: string }> = ({ query }) => {
  const themedColors = useThemedColors();
  const voteColors = getVoteColors(themedColors);
  const results = React.use(fetchData(query?.trim()));

  return (
    <Box>
      {Object.entries(results).map(([sectionTitle, votes], index) => (
        <Fade in timeout={500 + index * 50} key={sectionTitle}>
          <Accordion
            elevation={0}
            sx={{
              mb: spacing.md,
              borderRadius: 1,
              background: themedColors.backgroundPaper,
              border: `1px solid ${themedColors.dataBorder}`,
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
              overflow: "hidden",
              transition: "all 0.2s ease-in-out",
              "&:before": {
                display: "none",
              },
              "&.Mui-expanded": {
                boxShadow: shadows.cardHover,
                borderColor: themedColors.primary,
              },
            }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon
                  sx={{ color: themedColors.primary, fontSize: 28 }}
                />
              }
              sx={{
                py: { xs: 1, sm: spacing.md },
                px: { xs: 2, sm: spacing.lg },
                "&:hover": {
                  background: `${themedColors.primary}08`,
                },
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: themedColors.primary,
                  fontSize: { xs: "0.9375rem", sm: "1.125rem" },
                  letterSpacing: "0",
                }}
              >
                {sectionTitle}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {/* Mobile card layout */}
              <Box sx={{ display: { xs: "block", md: "none" } }}>
                {(votes ?? []).map((res) => (
                  <VoteCard
                    key={res.id}
                    res={res}
                    themedColors={themedColors}
                    voteColors={voteColors}
                  />
                ))}
              </Box>

              {/* Desktop table layout */}
              <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        background: themedColors.primary,
                      }}
                    >
                      <TableCell sx={{ ...commonStyles.tableHeader }}>
                        Aika
                      </TableCell>
                      <TableCell sx={{ ...commonStyles.tableHeader }}>
                        Vaihe
                      </TableCell>
                      <TableCell sx={{ ...commonStyles.tableHeader }}>
                        Otsikko
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ ...commonStyles.tableHeader }}
                      >
                        Jaa
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ ...commonStyles.tableHeader }}
                      >
                        Ei
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ ...commonStyles.tableHeader }}
                      >
                        Tyhjää
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ ...commonStyles.tableHeader }}
                      >
                        Poissa
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ ...commonStyles.tableHeader }}
                      >
                        Yht
                      </TableCell>
                      <TableCell sx={{ ...commonStyles.tableHeader }}>
                        Linkit
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(votes ?? []).map((res) => (
                      <TableRow
                        key={res.id}
                        hover
                        sx={{
                          ...commonStyles.tableRow,
                          borderBottom: `1px solid ${themedColors.dataBorder}`,
                          "&:hover": {
                            background: `${themedColors.primary}05`,
                          },
                          cursor: "default",
                        }}
                      >
                        <TableCell
                          sx={{
                            ...commonStyles.labelCell,
                            color: themedColors.textSecondary,
                            py: 2.5,
                          }}
                        >
                          {res.start_time
                            ? new Date(res.start_time).toLocaleDateString(
                                "fi-FI",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Chip
                            label={res.section_processing_phase}
                            size="small"
                            sx={{
                              background: themedColors.primary,
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              height: 28,
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            ...commonStyles.dataCell,
                            color: themedColors.textPrimary,
                            py: 2.5,
                          }}
                        >
                          {res.title}
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2.5 }}>
                          <Box
                            sx={{
                              ...commonStyles.flexWithGap(1),
                              justifyContent: "center",
                            }}
                          >
                            <ThumbUpIcon
                              sx={{ fontSize: 20, color: voteColors.yes }}
                            />
                            <Typography
                              sx={{
                                fontWeight: 700,
                                color: voteColors.yes,
                                fontSize: "1rem",
                              }}
                            >
                              {res.n_yes}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2.5 }}>
                          <Box
                            sx={{
                              ...commonStyles.flexWithGap(1),
                              justifyContent: "center",
                            }}
                          >
                            <ThumbDownIcon
                              sx={{ fontSize: 20, color: voteColors.no }}
                            />
                            <Typography
                              sx={{
                                fontWeight: 700,
                                color: voteColors.no,
                                fontSize: "1rem",
                              }}
                            >
                              {res.n_no}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2.5 }}>
                          <Box
                            sx={{
                              ...commonStyles.flexWithGap(1),
                              justifyContent: "center",
                            }}
                          >
                            <RemoveIcon
                              sx={{ fontSize: 20, color: voteColors.abstain }}
                            />
                            <Typography
                              sx={{
                                fontWeight: 700,
                                color: voteColors.abstain,
                                fontSize: "1rem",
                              }}
                            >
                              {res.n_abstain}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2.5 }}>
                          <Box
                            sx={{
                              ...commonStyles.flexWithGap(1),
                              justifyContent: "center",
                            }}
                          >
                            <PersonOffIcon
                              sx={{ fontSize: 20, color: voteColors.absent }}
                            />
                            <Typography
                              sx={{
                                fontWeight: 700,
                                color: voteColors.absent,
                                fontSize: "1rem",
                              }}
                            >
                              {res.n_absent}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 2.5 }}>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: "1.125rem",
                              color: themedColors.primary,
                            }}
                          >
                            {res.n_total}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            <Link
                              target="_blank"
                              href={eduskuntaLink(res.result_url)}
                              sx={{
                                color: themedColors.primary,
                                textDecoration: "none",
                                fontWeight: 600,
                                fontSize: "0.875rem",
                                padding: "4px 12px",
                                borderRadius: 2,
                                border: `1px solid ${themedColors.primary}`,
                                display: "inline-block",
                                transition:
                                  "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                "&:hover": {
                                  background: themedColors.primary,
                                  color: "white",
                                  textDecoration: "none",
                                },
                              }}
                            >
                              Tulokset →
                            </Link>
                            <Link
                              target="_blank"
                              href={eduskuntaLink(res.proceedings_url)}
                              sx={{
                                color: themedColors.primary,
                                textDecoration: "none",
                                fontWeight: 600,
                                fontSize: "0.875rem",
                                padding: "4px 12px",
                                borderRadius: 2,
                                border: `1px solid ${themedColors.primary}`,
                                display: "inline-block",
                                transition:
                                  "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                "&:hover": {
                                  background: themedColors.primary,
                                  color: "white",
                                  textDecoration: "none",
                                },
                              }}
                            >
                              Pöytäkirja →
                            </Link>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Fade>
      ))}
    </Box>
  );
};
