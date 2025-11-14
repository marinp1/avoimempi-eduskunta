// VoteResults.tsx
import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Link,
  Typography,
  Chip,
  Fade,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import RemoveIcon from "@mui/icons-material/Remove";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import { commonStyles, spacing, shadows } from "../theme";
import { getVoteColors } from "../theme/vote-styles";
import { useThemedColors } from "../theme/ThemeContext";

let cache = new Map<string, ReturnType<typeof getVotings>>();

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
  if (!href.startsWith("/")) href = "/" + href;
  return `https://www.eduskunta.fi${href}`;
};

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
                py: spacing.md,
                px: spacing.lg,
                "&:hover": {
                  background: themedColors.primary + "08",
                },
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: themedColors.primary,
                  fontSize: "1.125rem",
                  letterSpacing: "0",
                }}
              >
                {sectionTitle}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
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
                            background: themedColors.primary + "05",
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
