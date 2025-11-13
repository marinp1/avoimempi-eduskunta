import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  Fade,
  Slide,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LanguageIcon from "@mui/icons-material/Language";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import WorkIcon from "@mui/icons-material/Work";
import PublicIcon from "@mui/icons-material/Public";

type RepresentativeDetailsType = DatabaseTables.Representative;

type DistrictHistoryType = {
  id: number;
  person_id: number;
  district_name: string;
  start_date: string;
  end_date: string;
};

const fetchPersonDetails = async (personId: number) => {
  const [
    groupMemberships,
    terms,
    representativeDetails,
    districts,
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
    fetch<RepresentativeDetailsType>(
      `/api/person/${personId}/details`
    ).then((res) => res.json()),
    fetch<DistrictHistoryType[]>(`/api/person/${personId}/districts`).then(
      (res) => res.json()
    ),
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
    representativeDetails,
    districts,
    leavingRecords,
    trustPositions,
    governmentMemberships,
  };
};



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

  if (!selectedRepresentative) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      TransitionComponent={Slide}
      TransitionProps={{ direction: "up" } as any}
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        },
      }}
    >
      <DialogTitle
        sx={{
          pb: 2,
          pt: 3,
          px: 4,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          position: "relative",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
            }}
          >
            <PersonIcon sx={{ fontSize: 32, color: "white" }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight="700" letterSpacing="-0.5px">
              {selectedRepresentative.first_name}{" "}
              {selectedRepresentative.last_name}
            </Typography>
            {details?.representativeDetails?.profession && (
              <Typography
                variant="body1"
                sx={{ opacity: 0.9, mt: 0.5, fontWeight: 300 }}
              >
                {details.representativeDetails.profession}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: "white",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: "transparent", pt: 3, px: 4, pb: 4 }}>
        {details?.representativeDetails === undefined ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Basic Info Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Fade in timeout={600}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.6)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 2,
                      }}
                    >
                      <PersonIcon sx={{ color: "#667eea", fontSize: 28 }} />
                      <Typography
                        variant="h6"
                        fontWeight="600"
                        sx={{
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Perustiedot
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2, opacity: 0.6 }} />
                  <Grid container spacing={2}>
                  {details.representativeDetails.gender && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          fontWeight: 600,
                          color: "#667eea",
                          mb: 0.5,
                          display: "block",
                        }}
                      >
                        Sukupuoli
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {details.representativeDetails.gender}
                      </Typography>
                    </Grid>
                  )}
                  {details.representativeDetails.birth_date && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          fontWeight: 600,
                          color: "#667eea",
                          mb: 0.5,
                          display: "block",
                        }}
                      >
                        Syntymäaika
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {displayDate(details.representativeDetails.birth_date)}
                        {details.representativeDetails.birth_place &&
                          ` (${details.representativeDetails.birth_place})`}
                      </Typography>
                    </Grid>
                  )}
                  {details.representativeDetails.profession && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          fontWeight: 600,
                          color: "#667eea",
                          mb: 0.5,
                          display: "block",
                        }}
                      >
                        Ammatti
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {details.representativeDetails.profession}
                      </Typography>
                    </Grid>
                  )}
                  {details.representativeDetails.website && (
                    <Grid size={{ xs: 12 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mt: 2,
                        }}
                      >
                        <LanguageIcon
                          sx={{ color: "#667eea", fontSize: 20 }}
                        />
                        <a
                          href={details.representativeDetails.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#667eea",
                            textDecoration: "none",
                            fontWeight: 500,
                            transition: "all 0.2s",
                          }}
                        >
                          {details.representativeDetails.website}
                        </a>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
              </Fade>
          </Grid>

          {/* Contact Info Card */}
          {(details.representativeDetails.email ||
            details.representativeDetails.phone) && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Fade in timeout={700}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.6)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 2,
                      }}
                    >
                      <EmailIcon sx={{ color: "#667eea", fontSize: 28 }} />
                      <Typography
                        variant="h6"
                        fontWeight="600"
                        sx={{
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Yhteystiedot
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2, opacity: 0.6 }} />
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {details.representativeDetails.email && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <EmailIcon sx={{ color: "#667eea", fontSize: 20 }} />
                          <Typography variant="body1" fontWeight="500">
                            {details.representativeDetails.email}
                          </Typography>
                        </Box>
                      )}
                      {details.representativeDetails.phone && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <PhoneIcon sx={{ color: "#667eea", fontSize: 20 }} />
                          <Typography variant="body1" fontWeight="500">
                            {details.representativeDetails.phone}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          )}

          {/* Districts Card */}
          {details.districts && details.districts.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Fade in timeout={800}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.6)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 2,
                      }}
                    >
                      <LocationOnIcon sx={{ color: "#667eea", fontSize: 28 }} />
                      <Typography
                        variant="h6"
                        fontWeight="600"
                        sx={{
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Vaalipiirit
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2, opacity: 0.6 }} />
                    <List dense sx={{ pt: 0 }}>
                    {details.districts.map((district) => (
                      <ListItem key={district.id} sx={{ px: 0, py: 0.5 }}>
                        <ListItemText
                          primary={
                            <Typography
                              variant="body2"
                              component="span"
                              fontWeight="medium"
                            >
                              {district.district_name}
                            </Typography>
                          }
                          secondary={`${displayDate(
                            district.start_date
                          )} - ${displayDate(district.end_date)}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
              </Fade>
            </Grid>
          )}

          {/* Parliamentary Membership Card */}
          {details.groupMemberships && details.groupMemberships.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Fade in timeout={900}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.6)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 2,
                      }}
                    >
                      <HowToVoteIcon sx={{ color: "#667eea", fontSize: 28 }} />
                      <Typography
                        variant="h6"
                        fontWeight="600"
                        sx={{
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Eduskuntajäsenyys
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2, opacity: 0.6 }} />
                  <List dense sx={{ pt: 0 }}>
                    {details.groupMemberships.map((membership) => {
                      // Find matching leaving record for this membership period
                      const leavingRecord = details.leavingRecords?.find(
                        (record) => {
                          const recordDate = new Date(record.end_date);
                          const membershipEndDate = new Date(
                            membership.end_date || ""
                          );
                          // Match if dates are close (within a few days)
                          const diffDays = Math.abs(
                            (recordDate.getTime() - membershipEndDate.getTime()) /
                              (1000 * 60 * 60 * 24)
                          );
                          return diffDays < 30 && membership.end_date; // Only match if membership has ended
                        }
                      );

                      return (
                        <ListItem key={membership.id} sx={{ px: 0, py: 0.5 }}>
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
                            secondary={
                              <Box>
                                <Typography variant="caption">
                                  {displayDate(membership.start_date)} -{" "}
                                  {displayDate(membership.end_date)}
                                  {leavingRecord?.replacement_person &&
                                    ` (Seuraaja: ${leavingRecord.replacement_person})`}
                                </Typography>
                                {leavingRecord?.description && (
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    color="text.secondary"
                                    sx={{ fontStyle: "italic" }}
                                  >
                                    {leavingRecord.description}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </CardContent>
              </Card>
              </Fade>
            </Grid>
          )}

          {/* Government Coalition Card */}
          {details.governmentMemberships &&
            details.governmentMemberships.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Fade in timeout={1000}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      background: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.6)",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          mb: 2,
                        }}
                      >
                        <AccountBalanceIcon sx={{ color: "#667eea", fontSize: 28 }} />
                        <Typography
                          variant="h6"
                          fontWeight="600"
                          sx={{
                            background:
                              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          Hallituskoalitioon osallistuminen
                        </Typography>
                      </Box>
                      <Divider sx={{ mb: 2, opacity: 0.6 }} />
                    <List dense sx={{ pt: 0 }}>
                      {details.governmentMemberships.map((membership) => (
                        <ListItem key={membership.id} sx={{ px: 0, py: 0.5 }}>
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
                  </CardContent>
                </Card>
                </Fade>
              </Grid>
            )}

          {/* Trust Positions Card */}
          {details.trustPositions && details.trustPositions.length > 0 && (
            <Grid size={{ xs: 12, md: 6 }}>
              <Fade in timeout={1100}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.6)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 12px 24px rgba(0,0,0,0.15)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 2,
                      }}
                    >
                      <WorkIcon sx={{ color: "#667eea", fontSize: 28 }} />
                      <Typography
                        variant="h6"
                        fontWeight="600"
                        sx={{
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Luottamustehtävät ja muut toimet
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2, opacity: 0.6 }} />
                  <List dense sx={{ pt: 0 }}>
                    {details.trustPositions.map((position) => (
                      <ListItem key={position.id} sx={{ px: 0, py: 0.5 }}>
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
                </CardContent>
              </Card>
              </Fade>
            </Grid>
          )}
        </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};
