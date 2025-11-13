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
import { commonStyles, colors, spacing, gradients, shadows } from "../theme";
import { voteColors } from "../theme/vote-styles";

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
  const results = React.use(fetchData(query?.trim()));

  return (
    <Box>
      {Object.entries(results).map(([sectionTitle, votes], index) => (
        <Fade in timeout={600 + index * 100} key={sectionTitle}>
          <Accordion
            elevation={0}
            sx={{
              mb: spacing.sm,
              ...commonStyles.glassCard,
              overflow: "hidden",
              "&:before": {
                display: "none",
              },
              "&.Mui-expanded": {
                boxShadow: shadows.card,
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: colors.primary }} />}
              sx={{
                py: spacing.sm,
                px: spacing.md,
                "&:hover": {
                  background: "rgba(102, 126, 234, 0.05)",
                },
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: colors.primary,
                }}
              >
                {sectionTitle}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        background: gradients.primary,
                      }}
                    >
                      <TableCell sx={{ color: "white", fontWeight: 600 }}>
                        Aika
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: 600 }}>
                        Vaihe
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: 600 }}>
                        Otsikko
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: 600 }}
                      >
                        Jaa
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: 600 }}
                      >
                        Ei
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: 600 }}
                      >
                        Tyhjää
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: 600 }}
                      >
                        Poissa
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: 600 }}
                      >
                        Yht
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: 600 }}>
                        Linkit
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(votes ?? []).map((res) => (
                      <TableRow
                        key={res.id}
                        hover
                        sx={commonStyles.interactiveHover}
                      >
                        <TableCell sx={{ fontSize: "0.875rem" }}>
                          {res.start_time
                            ? new Date(res.start_time).toLocaleDateString(
                                "fi-FI",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={res.section_processing_phase}
                            size="small"
                            sx={{
                              background: "rgba(102, 126, 234, 0.1)",
                              color: colors.primary,
                              fontWeight: 500,
                              fontSize: "0.75rem",
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {res.title}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              ...commonStyles.flexWithGap(0.5),
                              justifyContent: "center",
                            }}
                          >
                            <ThumbUpIcon
                              sx={{ fontSize: 16, color: voteColors.yes }}
                            />
                            <Typography fontWeight="600" color={voteColors.yes}>
                              {res.n_yes}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              ...commonStyles.flexWithGap(0.5),
                              justifyContent: "center",
                            }}
                          >
                            <ThumbDownIcon
                              sx={{ fontSize: 16, color: voteColors.no }}
                            />
                            <Typography fontWeight="600" color={voteColors.no}>
                              {res.n_no}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              ...commonStyles.flexWithGap(0.5),
                              justifyContent: "center",
                            }}
                          >
                            <RemoveIcon
                              sx={{ fontSize: 16, color: voteColors.abstain }}
                            />
                            <Typography
                              fontWeight="600"
                              color={voteColors.abstain}
                            >
                              {res.n_abstain}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              ...commonStyles.flexWithGap(0.5),
                              justifyContent: "center",
                            }}
                          >
                            <PersonOffIcon
                              sx={{ fontSize: 16, color: voteColors.absent }}
                            />
                            <Typography
                              fontWeight="600"
                              color={voteColors.absent}
                            >
                              {res.n_absent}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="700">
                            {res.n_total}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                            }}
                          >
                            <Link
                              target="_blank"
                              href={eduskuntaLink(res.result_url)}
                              sx={{
                                color: "#667eea",
                                textDecoration: "none",
                                fontWeight: 500,
                                fontSize: "0.875rem",
                                "&:hover": {
                                  textDecoration: "underline",
                                },
                              }}
                            >
                              Tulokset →
                            </Link>
                            <Link
                              target="_blank"
                              href={eduskuntaLink(res.proceedings_url)}
                              sx={{
                                color: "#667eea",
                                textDecoration: "none",
                                fontWeight: 500,
                                fontSize: "0.875rem",
                                "&:hover": {
                                  textDecoration: "underline",
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
