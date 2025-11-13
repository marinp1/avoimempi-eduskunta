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

type RepresentativeDetailsType = DatabaseTables.Representative & {
  district_name: string | null;
  district_start_date: string | null;
  district_end_date: string | null;
};

const fetchPersonDetails = async (personId: number) => {
  const [
    groupMemberships,
    terms,
    votes,
    representativeDetails,
    leavingRecords,
    trustPositions,
    governmentMemberships,
  ] = await Promise.all([
    fetch<DatabaseTables.ParliamentGroupMembership[]>(
      `/api/person/${personId}/group-memberships`
    ).then((res) => res.json()),
    fetch<DatabaseTables.Term[]>(`/api/person/${personId}/terms`).then((res) =>
      res.json()
    ),
    fetch<DatabaseQueries.VotesByPerson[]>(
      `/api/person/${personId}/votes`
    ).then((res) => res.json()),
    fetch<RepresentativeDetailsType>(
      `/api/person/${personId}/details`
    ).then((res) => res.json()),
    fetch<DatabaseTables.PeopleLeavingParliament[]>(
      `/api/person/${personId}/leaving-records`
    ).then((res) => res.json()),
    fetch<DatabaseTables.TrustPosition[]>(
      `/api/person/${personId}/trust-positions`
    ).then((res) => res.json()),
    fetch<DatabaseTables.GovernmentMembership[]>(
      `/api/person/${personId}/government-memberships`
    ).then((res) => res.json()),
  ]);
  return {
    groupMemberships,
    terms,
    votes,
    representativeDetails,
    leavingRecords,
    trustPositions,
    governmentMemberships,
  };
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
            <Typography variant="h6" gutterBottom>
              Perustiedot
            </Typography>
            {details?.representativeDetails === undefined ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={1}>
                  {details.representativeDetails.gender && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Sukupuoli
                      </Typography>
                      <Typography variant="body1">
                        {details.representativeDetails.gender}
                      </Typography>
                    </Grid>
                  )}
                  {details.representativeDetails.birth_date && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Syntymäaika
                      </Typography>
                      <Typography variant="body1">
                        {displayDate(details.representativeDetails.birth_date)}
                        {details.representativeDetails.birth_place &&
                          ` (${details.representativeDetails.birth_place})`}
                      </Typography>
                    </Grid>
                  )}
                  {details.representativeDetails.profession && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Ammatti
                      </Typography>
                      <Typography variant="body1">
                        {details.representativeDetails.profession}
                      </Typography>
                    </Grid>
                  )}
                  {details.groupMemberships &&
                    details.groupMemberships.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Eduskuntajäsenyys
                        </Typography>
                        <List dense sx={{ pt: 0 }}>
                          {details.groupMemberships.map((membership) => (
                            <ListItem
                              key={membership.id}
                              sx={{ px: 0, py: 0.5 }}
                            >
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="body2"
                                    component="span"
                                    fontWeight="medium"
                                  >
                                    {membership.group_name}
                                  </Typography>
                                }
                                secondary={`${displayDate(
                                  membership.start_date
                                )} - ${displayDate(membership.end_date)}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                    )}
                  {details.governmentMemberships &&
                    details.governmentMemberships.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Hallituskoalitioon osallistuminen
                        </Typography>
                        <List dense sx={{ pt: 0 }}>
                          {details.governmentMemberships.map((membership) => (
                            <ListItem
                              key={membership.id}
                              sx={{ px: 0, py: 0.5 }}
                            >
                              <ListItemText
                                primary={
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      component="span"
                                      fontWeight="medium"
                                    >
                                      {membership.government}
                                    </Typography>
                                    {membership.ministry && (
                                      <Typography
                                        variant="body2"
                                        component="span"
                                        color="text.secondary"
                                      >
                                        {" "}
                                        - {membership.ministry}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <Box>
                                    <Typography variant="body2">
                                      Virka: {membership.name}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {displayDate(membership.start_date)} -{" "}
                                      {displayDate(membership.end_date)}
                                    </Typography>
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                    )}
                  {details.trustPositions &&
                    details.trustPositions.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Luottamustehtävät ja muut toimet
                        </Typography>
                        <List dense sx={{ pt: 0 }}>
                          {details.trustPositions.map((position) => (
                            <ListItem
                              key={position.id}
                              sx={{ px: 0, py: 0.5 }}
                            >
                              <ListItemText
                                primary={
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      component="span"
                                      fontWeight="medium"
                                    >
                                      {position.name}
                                    </Typography>
                                    {position.position_type && (
                                      <Typography
                                        variant="body2"
                                        component="span"
                                        color="text.secondary"
                                        sx={{ ml: 1 }}
                                      >
                                        ({position.position_type})
                                      </Typography>
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="caption">
                                    {position.period}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                    )}
                  {details.leavingRecords &&
                    details.leavingRecords.length > 0 && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="text.secondary">
                          Eduskunnasta poistuminen
                        </Typography>
                        <List dense sx={{ pt: 0 }}>
                          {details.leavingRecords.map((record) => (
                            <ListItem key={record.id} sx={{ px: 0, py: 0.5 }}>
                              <ListItemText
                                primary={record.description}
                                secondary={`${displayDate(record.end_date)}${
                                  record.replacement_person
                                    ? ` (Seuraaja: ${record.replacement_person})`
                                    : ""
                                }`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                    )}
                  {details.representativeDetails.district_name && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Vaalipiiri
                      </Typography>
                      <Typography variant="body1">
                        {details.representativeDetails.district_name}
                      </Typography>
                    </Grid>
                  )}
                  {details.representativeDetails.email && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Sähköposti
                      </Typography>
                      <Typography variant="body1">
                        {details.representativeDetails.email}
                      </Typography>
                    </Grid>
                  )}
                  {details.representativeDetails.phone && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Puhelin
                      </Typography>
                      <Typography variant="body1">
                        {details.representativeDetails.phone}
                      </Typography>
                    </Grid>
                  )}
                  {details.representativeDetails.website && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Verkkosivusto
                      </Typography>
                      <Typography variant="body1">
                        <a
                          href={details.representativeDetails.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {details.representativeDetails.website}
                        </a>
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </Grid>

          {/* Voting History */}
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
