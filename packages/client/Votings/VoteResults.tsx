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
      Object.groupBy(data, (d) => d.section_title)
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
              mb: 2,
              borderRadius: 3,
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.6)",
              overflow: "hidden",
              "&:before": {
                display: "none",
              },
              "&.Mui-expanded": {
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: "#667eea" }} />}
              sx={{
                py: 2,
                px: 3,
                "&:hover": {
                  background: "rgba(102, 126, 234, 0.05)",
                },
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: "#667eea",
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
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
                        sx={{
                          transition: "all 0.2s ease",
                          "&:hover": {
                            background: "rgba(102, 126, 234, 0.05)",
                          },
                        }}
                      >
                        <TableCell sx={{ fontSize: "0.875rem" }}>
                          {res.start_time
                            ? new Date(res.start_time).toLocaleDateString(
                                "fi-FI"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={res.section_processing_phase}
                            size="small"
                            sx={{
                              background: "rgba(102, 126, 234, 0.1)",
                              color: "#667eea",
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
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            <ThumbUpIcon
                              sx={{ fontSize: 16, color: "#4caf50" }}
                            />
                            <Typography fontWeight="600" color="#4caf50">
                              {res.n_yes}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            <ThumbDownIcon
                              sx={{ fontSize: 16, color: "#f44336" }}
                            />
                            <Typography fontWeight="600" color="#f44336">
                              {res.n_no}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            <RemoveIcon
                              sx={{ fontSize: 16, color: "#ff9800" }}
                            />
                            <Typography fontWeight="600" color="#ff9800">
                              {res.n_abstain}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            <PersonOffIcon
                              sx={{ fontSize: 16, color: "#9e9e9e" }}
                            />
                            <Typography fontWeight="600" color="#9e9e9e">
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
                            sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
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
