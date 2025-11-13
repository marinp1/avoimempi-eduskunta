import React from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  CircularProgress,
  Divider,
  IconButton,
  Fade,
  Collapse,
  Avatar,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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

const ExpandableSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}> = ({ title, icon, children, defaultExpanded = false }) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <Box
      sx={{
        mb: 2,
        borderRadius: 2,
        background: "white",
        border: "1px solid rgba(0,0,0,0.12)",
        overflow: "hidden",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          cursor: "pointer",
          userSelect: "none",
          "&:hover": {
            bgcolor: "rgba(102, 126, 234, 0.04)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {icon}
          <Typography variant="body1" fontWeight="600" sx={{ color: "#1a1a1a" }}>
            {title}
          </Typography>
        </Box>
        <ExpandMoreIcon
          sx={{
            color: "#667eea",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2, pt: 0 }}>
          <Divider sx={{ mb: 2 }} />
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};

export const RepresentativeDetails: React.FC<{
  open: boolean;
  onClose: () => void;
  selectedRepresentative: DatabaseQueries.GetParliamentComposition | null;
  selectedDate: string;
}> = ({ open, onClose, selectedRepresentative, selectedDate }) => {
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

  const calculateAge = (birthDate: string, asOfDate: string) => {
    const birth = new Date(birthDate);
    const asOf = new Date(asOfDate);
    let age = asOf.getFullYear() - birth.getFullYear();
    const m = asOf.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && asOf.getDate() < birth.getDate())) age--;
    return age;
  };

  const displayDate = (date?: string | null) => {
    if (!date) return "edelleen";
    return new Date(date).toLocaleDateString("fi-FI");
  };

  if (!selectedRepresentative) return null;

  const currentParty = details?.groupMemberships?.[0]?.group_name || "Ei tiedossa";
  const currentDistrict = details?.districts?.[0]?.district_name || "Ei tiedossa";

  // Check if person was alive on selected date
  const selectedDateObj = new Date(selectedDate);
  const deathDateObj = selectedRepresentative.death_date ? new Date(selectedRepresentative.death_date) : null;
  const wasAliveOnSelectedDate = !deathDateObj || selectedDateObj <= deathDateObj;

  // Calculate age as of selected date (or death date if they died before selected date)
  const effectiveDate = wasAliveOnSelectedDate ? selectedDate : selectedRepresentative.death_date!;
  const age = selectedRepresentative.birth_date
    ? calculateAge(selectedRepresentative.birth_date, effectiveDate)
    : null;

  const ageDisclaimer = displayDate(effectiveDate);

  // Find active government positions on selected date
  const activeGovernmentPositions = details?.governmentMemberships?.filter((gm) => {
    const startDate = new Date(gm.start_date);
    const endDate = gm.end_date && gm.end_date.trim() !== '' ? new Date(gm.end_date) : null;
    const isActive = startDate <= selectedDateObj && (!endDate || selectedDateObj <= endDate);
    return isActive;
  }) || [];

  // Find active trust positions on selected date (only if not in government)
  const activeTrustPositions = details?.trustPositions?.filter((tp) => {
    // Trust positions use "period" field which is a string like "2019-2023"
    // We'll do a simple check if the period contains years around the selected year
    const selectedYear = selectedDateObj.getFullYear();
    return tp.period && tp.period.includes(selectedYear.toString());
  }) || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      {details?.representativeDetails === undefined ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Fixed Header */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px 12px 0 0",
            }}
          >
            <Box sx={{ position: "relative", p: 3 }}>
              {/* Close Button */}
              <IconButton
                onClick={onClose}
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  color: "white",
                  bgcolor: "rgba(0,0,0,0.2)",
                  "&:hover": { bgcolor: "rgba(0,0,0,0.3)" },
                }}
              >
                <CloseIcon />
              </IconButton>

              {/* Header Content */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {/* Avatar */}
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    background: "white",
                    color: "#667eea",
                    fontSize: 32,
                    fontWeight: 700,
                    border: "3px solid rgba(255,255,255,0.3)",
                  }}
                >
                  {selectedRepresentative.first_name[0]}
                  {selectedRepresentative.last_name[0]}
                </Avatar>

                {/* Name and Stats */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="h5"
                    fontWeight="700"
                    sx={{
                      color: "white",
                      mb: 0.5,
                    }}
                  >
                    {selectedRepresentative.first_name} {selectedRepresentative.last_name}
                  </Typography>

                  {details.representativeDetails?.profession && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: "rgba(255,255,255,0.95)",
                        mb: 2,
                      }}
                    >
                      {details.representativeDetails.profession}
                    </Typography>
                  )}

                  {/* Quick Stats */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 3,
                      flexWrap: "wrap",
                      alignItems: "flex-end",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                          textTransform: "uppercase",
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          display: "block",
                        }}
                      >
                        Puolue
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{ color: "white", fontWeight: 600 }}
                        >
                          {currentParty}
                        </Typography>
                        <Box
                          sx={{
                            display: "inline-block",
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: selectedRepresentative.is_in_government === 1
                              ? "rgba(76, 175, 80, 0.3)"
                              : "rgba(255, 152, 0, 0.3)",
                            border: selectedRepresentative.is_in_government === 1
                              ? "1px solid rgba(76, 175, 80, 0.6)"
                              : "1px solid rgba(255, 152, 0, 0.6)",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "white",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {selectedRepresentative.is_in_government === 1 ? "Hallitus" : "Oppositio"}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                          textTransform: "uppercase",
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          display: "block",
                        }}
                      >
                        Vaalipiiri
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "white", fontWeight: 600 }}
                      >
                        {currentDistrict}
                      </Typography>
                    </Box>
                    {age && (
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255,255,255,0.8)",
                            textTransform: "uppercase",
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            display: "block",
                          }}
                        >
                          Ikä
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "white", fontWeight: 600 }}
                        >
                          {age} v
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "0.6rem",
                            display: "block",
                            mt: 0.25,
                          }}
                        >
                          ({ageDisclaimer})
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Government Position or Trust Positions */}
                  {details && activeGovernmentPositions.length > 0 ? (
                    <Box sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 1,
                          bgcolor: "rgba(255,255,255,0.2)",
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                          border: "1px solid rgba(255,255,255,0.3)",
                        }}
                      >
                        <AccountBalanceIcon sx={{ fontSize: 18, color: "white" }} />
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgba(255,255,255,0.9)",
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              display: "block",
                            }}
                          >
                            Hallituksessa
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "white", fontWeight: 600, lineHeight: 1.2 }}
                          >
                            {activeGovernmentPositions[0].name}
                          </Typography>
                          {activeGovernmentPositions[0].ministry && activeGovernmentPositions[0].ministry.trim() !== '' && (
                            <Typography
                              variant="caption"
                              sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.7rem", display: "block" }}
                            >
                              {activeGovernmentPositions[0].ministry}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ) : details && activeTrustPositions.length > 0 ? (
                    <Box sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 1,
                          bgcolor: "rgba(255,255,255,0.15)",
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                          border: "1px solid rgba(255,255,255,0.25)",
                        }}
                      >
                        <WorkIcon sx={{ fontSize: 18, color: "white" }} />
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgba(255,255,255,0.9)",
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              display: "block",
                            }}
                          >
                            Luottamustehtävät
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "white", fontWeight: 600, lineHeight: 1.2 }}
                          >
                            {activeTrustPositions.slice(0, 2).map(tp => tp.name).join(", ")}
                            {activeTrustPositions.length > 2 && ` +${activeTrustPositions.length - 2}`}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Scrollable Content */}
          <DialogContent
            sx={{
              p: 3,
              bgcolor: "#f5f7fa",
              overflowY: "auto",
            }}
          >
            <Fade in timeout={300}>
              <Box>
                {/* Basic Info */}
                <ExpandableSection
                  title="Perustiedot"
                  icon={<PersonIcon sx={{ color: "#667eea", fontSize: 22 }} />}
                  defaultExpanded={false}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {details.representativeDetails.gender && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "#666" }}>
                          Sukupuoli
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ color: "#1a1a1a" }}>
                          {details.representativeDetails.gender}
                        </Typography>
                      </Box>
                    )}
                    {details.representativeDetails.birth_date && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "#666" }}>
                          Syntymäaika
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ color: "#1a1a1a" }}>
                          {displayDate(details.representativeDetails.birth_date)}
                          {details.representativeDetails.birth_place &&
                            ` (${details.representativeDetails.birth_place})`}
                        </Typography>
                      </Box>
                    )}
                    {details.representativeDetails.death_date && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" sx={{ color: "#666" }}>
                          Kuolinaika
                        </Typography>
                        <Typography variant="body2" fontWeight="600" sx={{ color: "#1a1a1a" }}>
                          {displayDate(details.representativeDetails.death_date)}
                          {details.representativeDetails.death_place &&
                            ` (${details.representativeDetails.death_place})`}
                          {details.representativeDetails.birth_date &&
                            ` - ${calculateAge(details.representativeDetails.birth_date, details.representativeDetails.death_date)} v`}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </ExpandableSection>

                {/* Contact Info */}
                {(details.representativeDetails.email ||
                  details.representativeDetails.phone ||
                  details.representativeDetails.website) && (
                  <ExpandableSection
                    title="Yhteystiedot"
                    icon={<EmailIcon sx={{ color: "#667eea", fontSize: 22 }} />}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      {details.representativeDetails.email && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <EmailIcon sx={{ color: "#667eea", fontSize: 18 }} />
                          <Typography variant="body2" fontWeight="500" sx={{ color: "#1a1a1a" }}>
                            {details.representativeDetails.email}
                          </Typography>
                        </Box>
                      )}
                      {details.representativeDetails.phone && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PhoneIcon sx={{ color: "#667eea", fontSize: 18 }} />
                          <Typography variant="body2" fontWeight="500" sx={{ color: "#1a1a1a" }}>
                            {details.representativeDetails.phone}
                          </Typography>
                        </Box>
                      )}
                      {details.representativeDetails.website && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LanguageIcon sx={{ color: "#667eea", fontSize: 18 }} />
                          <a
                            href={details.representativeDetails.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "#667eea",
                              textDecoration: "none",
                              fontWeight: 500,
                              fontSize: "0.875rem",
                            }}
                          >
                            {details.representativeDetails.website}
                          </a>
                        </Box>
                      )}
                    </Box>
                  </ExpandableSection>
                )}

                {/* Districts */}
                {details.districts && details.districts.length > 0 && (
                  <ExpandableSection
                    title="Vaalipiirit"
                    icon={<LocationOnIcon sx={{ color: "#667eea", fontSize: 22 }} />}
                  >
                    <List dense sx={{ p: 0 }}>
                      {details.districts.map((district) => (
                        <ListItem key={district.id} sx={{ px: 0, py: 1 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight="600" sx={{ color: "#1a1a1a" }}>
                                {district.district_name}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" sx={{ color: "#666" }}>
                                {displayDate(district.start_date)} -{" "}
                                {displayDate(district.end_date)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </ExpandableSection>
                )}

                {/* Parliamentary Membership */}
                {details.groupMemberships && details.groupMemberships.length > 0 && (
                  <ExpandableSection
                    title="Eduskuntajäsenyys"
                    icon={<HowToVoteIcon sx={{ color: "#667eea", fontSize: 22 }} />}
                  >
                    <List dense sx={{ p: 0 }}>
                      {details.groupMemberships.map((membership) => {
                        const leavingRecord = details.leavingRecords?.find((record) => {
                          const recordDate = new Date(record.end_date);
                          const membershipEndDate = new Date(membership.end_date || "");
                          const diffDays = Math.abs(
                            (recordDate.getTime() - membershipEndDate.getTime()) /
                              (1000 * 60 * 60 * 24)
                          );
                          return diffDays < 30 && membership.end_date;
                        });

                        return (
                          <ListItem key={membership.id} sx={{ px: 0, py: 1 }}>
                            <ListItemText
                              primary={
                                <Typography variant="body2" fontWeight="600" sx={{ color: "#1a1a1a" }}>
                                  {membership.group_name}
                                </Typography>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="caption" sx={{ color: "#666" }}>
                                    {displayDate(membership.start_date)} -{" "}
                                    {displayDate(membership.end_date)}
                                    {leavingRecord?.replacement_person &&
                                      ` (Seuraaja: ${leavingRecord.replacement_person})`}
                                  </Typography>
                                  {leavingRecord?.description && (
                                    <Typography
                                      variant="caption"
                                      display="block"
                                      sx={{ color: "#888", fontStyle: "italic", mt: 0.5 }}
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
                  </ExpandableSection>
                )}

                {/* Government Memberships */}
                {details.governmentMemberships &&
                  details.governmentMemberships.length > 0 && (
                    <ExpandableSection
                      title="Hallituskoalitioon osallistuminen"
                      icon={<AccountBalanceIcon sx={{ color: "#667eea", fontSize: 22 }} />}
                    >
                      <List dense sx={{ p: 0 }}>
                        {details.governmentMemberships.map((membership) => (
                          <ListItem key={membership.id} sx={{ px: 0, py: 1 }}>
                            <ListItemText
                              primary={
                                <Box>
                                  <Typography variant="body2" fontWeight="600" sx={{ color: "#1a1a1a" }}>
                                    {membership.government}
                                  </Typography>
                                  {membership.ministry && (
                                    <Typography variant="body2" sx={{ color: "#555" }}>
                                      {membership.ministry}
                                    </Typography>
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" fontWeight="600" sx={{ color: "#667eea" }}>
                                    {membership.name}
                                  </Typography>
                                  <Typography variant="caption" display="block" sx={{ color: "#666" }}>
                                    {displayDate(membership.start_date)} -{" "}
                                    {displayDate(membership.end_date)}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </ExpandableSection>
                  )}

                {/* Trust Positions */}
                {details.trustPositions && details.trustPositions.length > 0 && (
                  <ExpandableSection
                    title="Luottamustehtävät"
                    icon={<WorkIcon sx={{ color: "#667eea", fontSize: 22 }} />}
                  >
                    <List dense sx={{ p: 0 }}>
                      {details.trustPositions.map((position) => (
                        <ListItem key={position.id} sx={{ px: 0, py: 1 }}>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontWeight="600" sx={{ color: "#1a1a1a" }}>
                                {position.name}
                                {position.position_type && (
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    sx={{ color: "#666", ml: 1 }}
                                  >
                                    ({position.position_type})
                                  </Typography>
                                )}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" sx={{ color: "#666" }}>
                                {position.period}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </ExpandableSection>
                )}
              </Box>
            </Fade>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};
