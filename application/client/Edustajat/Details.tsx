import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Box,
  CircularProgress,
  Pagination,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const fetchPersonDetails = async (personId: number) => {
  const [groupMemberships, terms, votes] = await Promise.all([
    fetch<DatabaseTables.ParliamentGroupMembership[]>(
      `/api/person/${personId}/group-memberships`
    ).then((res) => res.json()),
    fetch<DatabaseTables.Term[]>(`/api/person/${personId}/terms`).then((res) =>
      res.json()
    ),
    fetch<DatabaseQueries.VotesByPerson[]>(
      `/api/person/${personId}/votes`
    ).then((res) => res.json()),
  ]);
  return { groupMemberships, terms, votes };
};

const groupBy = <T, K extends keyof any>(array: T[], getKey: (item: T) => K) =>
  array.reduce((result, item) => {
    const key = getKey(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
    return result;
  }, {} as Record<K, T[]>);

export const RepresentativeDetails: React.FC<{
  open: boolean;
  onClose: () => void;
  selectedRepresentative: DatabaseQueries.GetParliamentComposition | null;
}> = ({ open, onClose, selectedRepresentative }) => {
  const [details, setDetails] =
    React.useState<Awaited<ReturnType<typeof fetchPersonDetails>>>();

  React.useEffect(() => {
    if (selectedRepresentative) {
      setDetails(undefined);
      fetchPersonDetails(selectedRepresentative.person_id).then(setDetails);
    } else {
      setDetails(undefined);
    }
  }, [selectedRepresentative]);

  const VOTES_PER_PAGE = 10;

  const [votePages, setVotePages] = React.useState<{ [key: string]: number }>(
    {}
  );

  const handleVotePageChange = (groupTitle: string, page: number) => {
    setVotePages((prev) => ({ ...prev, [groupTitle]: page }));
  };

  const calculateAge = (birthDate: string, deathDate?: string | null) => {
    const birth = new Date(birthDate);
    const death = deathDate ? new Date(deathDate) : new Date();
    let age = death.getFullYear() - birth.getFullYear();
    const m = death.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) age--;
    return age;
  };

  const displayDate = (date?: string | null) => {
    if (!date) return "edelleen";
    return new Date(date).toLocaleDateString("fi-FI");
  };

  const getTimelineEvents = () => {
    if (!selectedRepresentative) return [];
    const events: { date: string; description: string }[] = [];

    events.push({
      date: selectedRepresentative.birth_date,
      description: `syntyi paikkakunnalla ${selectedRepresentative.birth_place}`,
    });

    details?.terms.forEach((term, index) => {
      events.push({
        date: term.start_date,
        description: `aloitti eduskunnassa ryhmässä ${details.groupMemberships[index]?.group_name}`,
      });
      if (term.end_date?.trim()) {
        events.push({ date: term.end_date, description: "lähti eduskunnasta" });
      }
    });

    details?.groupMemberships.forEach((membership, index) => {
      if (index > 0) {
        events.push({
          date: membership.start_date,
          description: `aloitti eduskuntaryhmässä ${membership.group_name}`,
        });
      }
    });

    if (selectedRepresentative.death_date) {
      events.push({
        date: selectedRepresentative.death_date,
        description: `kuoli paikkakunnalla ${selectedRepresentative.death_place}`,
      });
    }

    return events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  const timelineEvents = getTimelineEvents();

  const groupedVotes = React.useMemo(() => {
    return groupBy(
      details?.votes ?? [],
      (v) => `${v.section_title}: ${v.section_processing_phase}`
    );
  }, [details]);

  if (!selectedRepresentative) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {selectedRepresentative.first_name} {selectedRepresentative.last_name}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Basic Info */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6">Äänestyshistoria</Typography>

            {details?.votes === undefined ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : Object.entries(groupedVotes).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Ei äänestyksiä saatavilla.
              </Typography>
            ) : (
              Object.entries(groupedVotes).map(([groupTitle, votes]) => {
                const page = votePages[groupTitle] ?? 1;
                const startIndex = (page - 1) * VOTES_PER_PAGE;
                const paginatedVotes = votes.slice(
                  startIndex,
                  startIndex + VOTES_PER_PAGE
                );
                const pageCount = Math.ceil(votes.length / VOTES_PER_PAGE);

                return (
                  <Accordion key={groupTitle}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>{groupTitle}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {paginatedVotes.length > 0 ? (
                        <>
                          <List dense>
                            {paginatedVotes.map((v) => (
                              <ListItem key={`${v.id}-${page}`}>
                                <ListItemText
                                  primary={`${v.vote} ${displayDate(
                                    v.start_time
                                  )}: ${v.title}`}
                                />
                              </ListItem>
                            ))}
                          </List>

                          {pageCount > 1 && (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                mt: 2,
                              }}
                            >
                              <Pagination
                                count={pageCount}
                                page={page}
                                onChange={(_, p) =>
                                  handleVotePageChange(groupTitle, p)
                                }
                                size="small"
                                color="primary"
                              />
                            </Box>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Ei äänestyksiä tällä sivulla.
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })
            )}
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};
