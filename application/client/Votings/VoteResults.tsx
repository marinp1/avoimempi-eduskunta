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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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
      {Object.entries(results).map(([sectionTitle, votes]) => (
        <Accordion key={sectionTitle}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="bold">
              {sectionTitle}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Aika</TableCell>
                    <TableCell>Vaihe</TableCell>
                    <TableCell>Otsikko</TableCell>
                    <TableCell>Jaa</TableCell>
                    <TableCell>Ei</TableCell>
                    <TableCell>Tyhjää</TableCell>
                    <TableCell>Poissa</TableCell>
                    <TableCell>Yht</TableCell>
                    <TableCell>Viralliset linkit</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(votes ?? []).map((res) => (
                    <TableRow key={res.id} hover>
                      <TableCell>{res.start_time}</TableCell>
                      <TableCell>{res.section_processing_phase}</TableCell>
                      <TableCell>{res.title}</TableCell>
                      <TableCell>{res.n_yes}</TableCell>
                      <TableCell>{res.n_no}</TableCell>
                      <TableCell>{res.n_abstain}</TableCell>
                      <TableCell>{res.n_absent}</TableCell>
                      <TableCell>{res.n_total}</TableCell>
                      <TableCell>
                        <Link
                          target="_blank"
                          href={eduskuntaLink(res.result_url)}
                          sx={{ mr: 1 }}
                        >
                          Tulokset
                        </Link>
                        <Link
                          target="_blank"
                          href={eduskuntaLink(res.proceedings_url)}
                        >
                          Pöytäkirja
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};
