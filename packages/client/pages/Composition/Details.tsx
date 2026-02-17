import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CloseIcon from "@mui/icons-material/Close";
import EmailIcon from "@mui/icons-material/Email";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MicIcon from "@mui/icons-material/Mic";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
} from "@mui/material";
import React from "react";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { refs } from "#client/references";
import theme, { colors } from "#client/theme";
import { VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

type RepresentativeDetailsType = DatabaseTables.Representative;

type DistrictHistoryType = {
  id: number;
  person_id: number;
  district_name: string;
  start_date: string;
  end_date: string;
};

type SpeechType = {
  id: number;
  start_time: string;
  end_time: string;
  speech_type: string;
  processing_phase: string;
  document: string;
  content: string;
  party: string;
  minutes_url: string;
  word_count: number;
};

type CommitteeType = {
  id: number;
  committee_code: string;
  committee_name: string;
  role: string;
  start_date: string;
  end_date: string | null;
};

type DissentType = {
  voting_id: number;
  start_time: string;
  title: string;
  section_title: string;
  mp_vote: string;
  majority_vote: string;
  party_name: string;
};

type VotesByPersonType = {
  id: number;
  start_time: string;
  title: string;
  section_title: string;
  vote: string;
  group_abbreviation: string;
  yes_votes: number;
  no_votes: number;
  empty_votes: number;
  absent_votes: number;
};

type VotingInlineDetails = {
  voting: {
    id: number;
    n_yes: number;
    n_no: number;
    n_abstain: number;
    n_absent: number;
  };
  partyBreakdown: {
    party_code: string;
    party_name: string;
    n_yes: number;
    n_no: number;
    n_abstain: number;
    n_absent: number;
    n_total: number;
  }[];
  memberVotes: {
    person_id: number;
    first_name: string;
    last_name: string;
    party_code: string;
    vote: string;
    is_government: 0 | 1;
  }[];
  governmentOpposition: {
    government_yes: number;
    government_no: number;
    opposition_yes: number;
    opposition_no: number;
  } | null;
  relatedVotings: {
    id: number;
    n_yes: number;
    n_no: number;
  }[];
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
      `/api/person/${personId}/group-memberships`,
    ).then((res) => res.json()),
    fetch<DatabaseTables.Term[]>(`/api/person/${personId}/terms`).then((res) =>
      res.json(),
    ),
    fetch<RepresentativeDetailsType>(`/api/person/${personId}/details`).then(
      (res) => res.json(),
    ),
    fetch<DistrictHistoryType[]>(`/api/person/${personId}/districts`).then(
      (res) => res.json(),
    ),
    fetch<DatabaseTables.PeopleLeavingParliament[]>(
      `/api/person/${personId}/leaving-records`,
    ).then((res) => res.json()),
    fetch<DatabaseTables.TrustPosition[]>(
      `/api/person/${personId}/trust-positions`,
    ).then((res) => res.json()),
    fetch<DatabaseTables.GovernmentMembership[]>(
      `/api/person/${personId}/government-memberships`,
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

const fetchPersonVotes = async (personId: number) => {
  const res = await fetch(`/api/person/${personId}/votes`);
  return res.json() as Promise<VotesByPersonType[]>;
};

const fetchPersonSpeeches = async (
  personId: number,
  limit = 50,
  offset = 0,
) => {
  const res = await fetch(
    `/api/person/${personId}/speeches?limit=${limit}&offset=${offset}`,
  );
  return res.json() as Promise<SpeechType[]>;
};

const fetchPersonCommittees = async (personId: number) => {
  const res = await fetch(`/api/person/${personId}/committees`);
  return res.json() as Promise<CommitteeType[]>;
};

const fetchPersonDissents = async (personId: number, limit = 100) => {
  const res = await fetch(`/api/person/${personId}/dissents?limit=${limit}`);
  return res.json() as Promise<DissentType[]>;
};

const displayDate = (date?: string | null) => {
  if (!date) return "edelleen";
  return new Date(date).toLocaleDateString("fi-FI");
};

const calculateAge = (birthDate: string, asOfDate: string) => {
  const birth = new Date(birthDate);
  const asOf = new Date(asOfDate);
  let age = asOf.getFullYear() - birth.getFullYear();
  const m = asOf.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < birth.getDate())) age--;
  return age;
};

/** Info row used in the overview tab */
const InfoRow: React.FC<{
  label: string;
  value: React.ReactNode;
}> = ({ label, value }) => {
  const themedColors = useThemedColors();
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        py: 1,
        borderBottom: `1px solid ${themedColors.dataBorder}`,
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: themedColors.textSecondary, minWidth: 120 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight="600"
        sx={{ color: themedColors.textPrimary, textAlign: "right" }}
      >
        {value}
      </Typography>
    </Box>
  );
};

/** Section heading inside tabs */
const SectionLabel: React.FC<{
  icon: React.ReactNode;
  label: string;
}> = ({ icon, label }) => {
  const themedColors = useThemedColors();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 1.5,
        mt: 2.5,
        "&:first-of-type": { mt: 0 },
      }}
    >
      {icon}
      <Typography
        variant="subtitle2"
        fontWeight="700"
        sx={{ color: themedColors.textPrimary }}
      >
        {label}
      </Typography>
    </Box>
  );
};

// ──────────────────────────── Tab: Yleistiedot ────────────────────────────

const OverviewTab: React.FC<{
  details: Awaited<ReturnType<typeof fetchPersonDetails>>;
}> = ({ details }) => {
  const themedColors = useThemedColors();

  return (
    <Box>
      {/* Basic Info */}
      <SectionLabel
        icon={<PersonIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />}
        label="Perustiedot"
      />
      <Box sx={{ mb: 2 }}>
        {details.representativeDetails?.gender && (
          <InfoRow
            label="Sukupuoli"
            value={details.representativeDetails.gender}
          />
        )}
        {details.representativeDetails?.birth_date && (
          <InfoRow
            label="Syntymaaika"
            value={
              <>
                {displayDate(details.representativeDetails.birth_date)}
                {details.representativeDetails.birth_place &&
                  ` (${details.representativeDetails.birth_place})`}
              </>
            }
          />
        )}
        {details.representativeDetails?.death_date && (
          <InfoRow
            label="Kuolinaika"
            value={
              <>
                {displayDate(details.representativeDetails.death_date)}
                {details.representativeDetails.death_place &&
                  ` (${details.representativeDetails.death_place})`}
                {details.representativeDetails.birth_date &&
                  ` - ${calculateAge(details.representativeDetails.birth_date, details.representativeDetails.death_date)} v`}
              </>
            }
          />
        )}
        {details.representativeDetails?.profession && (
          <InfoRow
            label="Ammatti"
            value={details.representativeDetails.profession}
          />
        )}
      </Box>

      {/* Contact Info */}
      {(details.representativeDetails?.email ||
        details.representativeDetails?.phone ||
        details.representativeDetails?.website) && (
        <>
          <SectionLabel
            icon={
              <EmailIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />
            }
            label="Yhteystiedot"
          />
          <Box sx={{ mb: 2 }}>
            {details.representativeDetails.email && (
              <InfoRow
                label="Sahkoposti"
                value={details.representativeDetails.email}
              />
            )}
            {details.representativeDetails.phone && (
              <InfoRow
                label="Puhelin"
                value={details.representativeDetails.phone}
              />
            )}
            {details.representativeDetails.website && (
              <InfoRow
                label="Verkkosivu"
                value={
                  <a
                    href={details.representativeDetails.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: colors.primaryLight,
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {details.representativeDetails.website}
                  </a>
                }
              />
            )}
          </Box>
        </>
      )}

      {/* Districts */}
      {details.districts && details.districts.length > 0 && (
        <>
          <SectionLabel
            icon={
              <LocationOnIcon
                sx={{ color: colors.primaryLight, fontSize: 20 }}
              />
            }
            label="Vaalipiirit"
          />
          <List dense sx={{ p: 0, mb: 2 }}>
            {details.districts.map((district) => (
              <ListItem key={district.id} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{ color: themedColors.textPrimary }}
                    >
                      {district.district_name}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {displayDate(district.start_date)} -{" "}
                      {displayDate(district.end_date)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Parliamentary Membership */}
      {details.groupMemberships && details.groupMemberships.length > 0 && (
        <>
          <SectionLabel
            icon={
              <HowToVoteIcon
                sx={{ color: colors.primaryLight, fontSize: 20 }}
              />
            }
            label="Eduskuntajasenyys"
          />
          <List dense sx={{ p: 0, mb: 2 }}>
            {details.groupMemberships.map((membership, i) => {
              const leavingRecord = details.leavingRecords?.find((record) => {
                const recordDate = new Date(record.end_date);
                const membershipEndDate = new Date(membership.end_date || "");
                const diffDays = Math.abs(
                  (recordDate.getTime() - membershipEndDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                return diffDays < 30 && membership.end_date;
              });
              return (
                <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ color: themedColors.textPrimary }}
                      >
                        {membership.group_name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ color: themedColors.textSecondary }}
                        >
                          {displayDate(membership.start_date)} -{" "}
                          {displayDate(membership.end_date)}
                          {leavingRecord?.replacement_person &&
                            ` (Seuraaja: ${leavingRecord.replacement_person})`}
                        </Typography>
                        {leavingRecord?.description && (
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{
                              color: themedColors.textTertiary,
                              fontStyle: "italic",
                              mt: 0.25,
                            }}
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
        </>
      )}

      {/* Government Memberships */}
      {details.governmentMemberships &&
        details.governmentMemberships.length > 0 && (
          <>
            <SectionLabel
              icon={
                <AccountBalanceIcon
                  sx={{ color: colors.primaryLight, fontSize: 20 }}
                />
              }
              label="Hallituskoalitioon osallistuminen"
            />
            <List dense sx={{ p: 0 }}>
              {details.governmentMemberships.map((membership, i) => (
                <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight="600"
                          sx={{ color: themedColors.textPrimary }}
                        >
                          {membership.government}
                        </Typography>
                        {membership.ministry && (
                          <Typography
                            variant="body2"
                            sx={{ color: themedColors.textSecondary }}
                          >
                            {membership.ministry}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.25 }}>
                        <Typography
                          variant="caption"
                          fontWeight="600"
                          sx={{ color: colors.primaryLight }}
                        >
                          {membership.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          sx={{ color: themedColors.textSecondary }}
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
          </>
        )}
    </Box>
  );
};

// ──────────────────────────── Tab: Aanestykset ────────────────────────────

const VotesTab: React.FC<{ personId: number }> = ({ personId }) => {
  const themedColors = useThemedColors();
  const [votes, setVotes] = React.useState<VotesByPersonType[] | null>(null);
  const [dissents, setDissents] = React.useState<DissentType[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expandedVotingIds, setExpandedVotingIds] = React.useState<Set<number>>(
    new Set(),
  );
  const [votingDetailsById, setVotingDetailsById] = React.useState<
    Record<number, VotingInlineDetails>
  >({});
  const [loadingVotingDetails, setLoadingVotingDetails] = React.useState<
    Set<number>
  >(new Set());

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPersonVotes(personId),
      fetchPersonDissents(personId),
    ]).then(([v, d]) => {
      setVotes(v);
      setDissents(d);
      setExpandedVotingIds(new Set());
      setVotingDetailsById({});
      setLoadingVotingDetails(new Set());
      setLoading(false);
    });
  }, [personId]);

  const openVoting = (votingId: number, startTime?: string | null) => {
    window.history.pushState(
      {},
      "",
      refs.voting(votingId, undefined, startTime || undefined),
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const fetchVotingDetails = async (votingId: number) => {
    if (votingDetailsById[votingId] || loadingVotingDetails.has(votingId)) return;
    setLoadingVotingDetails((prev) => new Set(prev).add(votingId));
    try {
      const res = await fetch(`/api/votings/${votingId}/details`);
      if (!res.ok) return;
      const data: VotingInlineDetails = await res.json();
      setVotingDetailsById((prev) => ({ ...prev, [votingId]: data }));
    } finally {
      setLoadingVotingDetails((prev) => {
        const next = new Set(prev);
        next.delete(votingId);
        return next;
      });
    }
  };

  const toggleVotingDetails = (votingId: number) => {
    const shouldExpand = !expandedVotingIds.has(votingId);
    setExpandedVotingIds((prev) => {
      const next = new Set(prev);
      if (next.has(votingId)) next.delete(votingId);
      else next.add(votingId);
      return next;
    });
    if (shouldExpand) {
      void fetchVotingDetails(votingId);
    }
  };

  const renderVotingInlineDetails = (votingId: number) => {
    const details = votingDetailsById[votingId];
    const loadingDetails = loadingVotingDetails.has(votingId);
    if (loadingDetails) {
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75 }}>
          <CircularProgress size={12} />
          <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
            Ladataan äänestyksen yksityiskohtia...
          </Typography>
        </Box>
      );
    }
    if (!details) return null;
    return (
      <Box
        sx={{
          mt: 0.75,
          p: 1,
          borderRadius: 1,
          border: `1px solid ${themedColors.dataBorder}60`,
          backgroundColor: `${colors.primaryLight}04`,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          <Chip size="small" label={`Jaa ${details.voting.n_yes}`} sx={{ height: 20 }} />
          <Chip size="small" label={`Ei ${details.voting.n_no}`} sx={{ height: 20 }} />
          <Chip size="small" label={`Tyhjää ${details.voting.n_abstain}`} sx={{ height: 20 }} />
          <Chip size="small" label={`Poissa ${details.voting.n_absent}`} sx={{ height: 20 }} />
        </Box>
        {details.governmentOpposition && (
          <Typography variant="caption" sx={{ color: themedColors.textSecondary }}>
            Hallitus: {details.governmentOpposition.government_yes} jaa / {details.governmentOpposition.government_no} ei, Oppositio: {details.governmentOpposition.opposition_yes} jaa / {details.governmentOpposition.opposition_no} ei
          </Typography>
        )}
        <VotingResultsTable
          partyBreakdown={details.partyBreakdown}
          memberVotes={details.memberVotes}
        />
      </Box>
    );
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  const totalVotes = votes?.length || 0;
  const yesVotes = votes?.filter((v) => v.vote === "Jaa").length || 0;
  const noVotes = votes?.filter((v) => v.vote === "Ei").length || 0;
  const emptyVotes = votes?.filter((v) => v.vote === "Tyhjää").length || 0;
  const absentVotes = votes?.filter((v) => v.vote === "Poissa").length || 0;
  const participationRate =
    totalVotes > 0
      ? (((totalVotes - absentVotes) / totalVotes) * 100).toFixed(1)
      : "0";
  const dissentCount = dissents?.length || 0;

  return (
    <Box>
      {/* Metrics row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {participationRate}%
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            Osallistuminen
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {totalVotes}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            Aanestyksia
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{ fontSize: "1.25rem", fontWeight: 700, color: colors.error }}
          >
            {dissentCount}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            Poikkeamia
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <VoteMarginBar
            yes={yesVotes}
            no={noVotes}
            empty={emptyVotes}
            absent={absentVotes}
            height={6}
            sx={{ mb: 0.5, mt: 0.5 }}
          />
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            {yesVotes} jaa / {noVotes} ei / {emptyVotes} tyhj.
          </Typography>
        </Box>
      </Box>

      {/* Dissent list */}
      {dissents && dissents.length > 0 && (
        <>
          <SectionLabel
            icon={<GavelIcon sx={{ color: colors.error, fontSize: 20 }} />}
            label={`Puolue-enemmistosta poikenneet aanestykset (${dissentCount})`}
          />
          <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
            {dissents.slice(0, 50).map((d) => (
              <Box
                key={d.voting_id}
                sx={{
                  py: 1.5,
                  borderBottom: `1px solid ${themedColors.dataBorder}`,
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 1,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{ color: themedColors.textPrimary }}
                    >
                      {d.title || d.section_title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {new Date(d.start_time).toLocaleDateString("fi-FI")}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                      <Button
                        size="small"
                        sx={{ textTransform: "none", minWidth: 0, px: 1, fontSize: "0.68rem" }}
                        endIcon={
                          <ExpandMoreIcon
                            sx={{
                              fontSize: 14,
                              transform: expandedVotingIds.has(d.voting_id)
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s",
                            }}
                          />
                        }
                        onClick={() => toggleVotingDetails(d.voting_id)}
                      >
                        {expandedVotingIds.has(d.voting_id) ? "Piilota tiedot" : "Näytä tiedot"}
                      </Button>
                      <Button
                        size="small"
                        sx={{ textTransform: "none", minWidth: 0, px: 1, fontSize: "0.68rem" }}
                        endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                      onClick={() => openVoting(d.voting_id, d.start_time)}
                    >
                      Avaa näkymä
                    </Button>
                    </Box>
                    <Collapse in={expandedVotingIds.has(d.voting_id)} timeout="auto" unmountOnExit>
                      {renderVotingInlineDetails(d.voting_id)}
                    </Collapse>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                    <Chip
                      label={d.mp_vote}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor:
                          d.mp_vote === "Jaa"
                            ? "#22C55E20"
                            : d.mp_vote === "Ei"
                              ? "#EF444420"
                              : "#F59E0B20",
                        color:
                          d.mp_vote === "Jaa"
                            ? "#16A34A"
                            : d.mp_vote === "Ei"
                              ? "#DC2626"
                              : "#D97706",
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: themedColors.textTertiary,
                        alignSelf: "center",
                      }}
                    >
                      vs
                    </Typography>
                    <Chip
                      label={d.majority_vote}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        bgcolor: `${themedColors.dataBorder}`,
                        color: themedColors.textSecondary,
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </>
      )}

      {/* Recent votes */}
      {votes && votes.length > 0 && (
        <>
          <SectionLabel
            icon={
              <HowToVoteIcon
                sx={{ color: colors.primaryLight, fontSize: 20 }}
              />
            }
            label="Viimeisimmat aanestykset"
          />
          <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
            {votes.slice(0, 30).map((v) => (
              <Box
                key={`${v.id}-${v.vote}`}
                sx={{
                  py: 1,
                  borderBottom: `1px solid ${themedColors.dataBorder}`,
                  "&:last-child": { borderBottom: "none" },
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: themedColors.textPrimary }}
                  >
                    {v.title || v.section_title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: themedColors.textSecondary }}
                  >
                    {new Date(v.start_time).toLocaleDateString("fi-FI")}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                    <Button
                      size="small"
                      sx={{ textTransform: "none", minWidth: 0, px: 1, fontSize: "0.68rem" }}
                      endIcon={
                        <ExpandMoreIcon
                          sx={{
                            fontSize: 14,
                            transform: expandedVotingIds.has(v.id)
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                            transition: "transform 0.2s",
                          }}
                        />
                      }
                      onClick={() => toggleVotingDetails(v.id)}
                    >
                      {expandedVotingIds.has(v.id) ? "Piilota tiedot" : "Näytä tiedot"}
                    </Button>
                    <Button
                      size="small"
                      sx={{ textTransform: "none", minWidth: 0, px: 1, fontSize: "0.68rem" }}
                      endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                      onClick={() => openVoting(v.id, v.start_time)}
                    >
                      Avaa näkymä
                    </Button>
                  </Box>
                  <Collapse in={expandedVotingIds.has(v.id)} timeout="auto" unmountOnExit>
                    {renderVotingInlineDetails(v.id)}
                  </Collapse>
                </Box>
                <Chip
                  label={v.vote}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    flexShrink: 0,
                    bgcolor:
                      v.vote === "Jaa"
                        ? "#22C55E20"
                        : v.vote === "Ei"
                          ? "#EF444420"
                          : v.vote === "Poissa"
                            ? `${colors.neutral}20`
                            : "#F59E0B20",
                    color:
                      v.vote === "Jaa"
                        ? "#16A34A"
                        : v.vote === "Ei"
                          ? "#DC2626"
                          : v.vote === "Poissa"
                            ? colors.neutral
                            : "#D97706",
                  }}
                />
              </Box>
            ))}
          </Box>
        </>
      )}

      {totalVotes === 0 && (
        <Typography
          variant="body2"
          sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
        >
          Ei aanestystietoja.
        </Typography>
      )}
    </Box>
  );
};

// ──────────────────────────── Tab: Puheenvuorot ────────────────────────────

const SpeechesTab: React.FC<{ personId: number }> = ({ personId }) => {
  const themedColors = useThemedColors();
  const [speeches, setSpeeches] = React.useState<SpeechType[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchPersonSpeeches(personId, 50).then((data) => {
      setSpeeches(data);
      setLoading(false);
    });
  }, [personId]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  const totalWords =
    speeches?.reduce((sum, s) => sum + (s.word_count || 0), 0) || 0;

  return (
    <Box>
      {/* Metrics */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {speeches?.length || 0}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            Puheenvuoroja
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${themedColors.dataBorder}`,
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: themedColors.textPrimary,
            }}
          >
            {totalWords > 1000
              ? `${(totalWords / 1000).toFixed(1)}k`
              : totalWords}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: themedColors.textSecondary }}
          >
            Sanaa yhteensa
          </Typography>
        </Box>
      </Box>

      {/* Speech list */}
      {speeches && speeches.length > 0 ? (
        <Box sx={{ maxHeight: 500, overflowY: "auto" }}>
          {speeches.map((s) => (
            <Box
              key={s.id}
              sx={{
                py: 1.5,
                borderBottom: `1px solid ${themedColors.dataBorder}`,
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 0.5,
                }}
              >
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Typography
                    variant="caption"
                    fontWeight="600"
                    sx={{ color: themedColors.textSecondary }}
                  >
                    {new Date(s.start_time).toLocaleDateString("fi-FI")}
                  </Typography>
                  {s.speech_type && (
                    <Chip
                      label={s.speech_type}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        bgcolor: `${colors.primaryLight}15`,
                        color: colors.primaryLight,
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: themedColors.textTertiary }}
                >
                  {s.word_count} sanaa
                </Typography>
              </Box>
              {s.content && (
                <Typography
                  variant="body2"
                  sx={{
                    color: themedColors.textPrimary,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.5,
                  }}
                >
                  {s.content}
                </Typography>
              )}
              {s.document && (
                <Typography
                  variant="caption"
                  sx={{
                    color: themedColors.textTertiary,
                    mt: 0.25,
                    display: "block",
                  }}
                >
                  {s.document}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      ) : (
        <Typography
          variant="body2"
          sx={{ color: themedColors.textTertiary, textAlign: "center", py: 4 }}
        >
          Ei puheenvuoroja.
        </Typography>
      )}
    </Box>
  );
};

// ──────────────────────── Tab: Luottamustehtavat ──────────────────────────

const PositionsTab: React.FC<{
  personId: number;
  trustPositions: DatabaseTables.TrustPosition[];
  governmentMemberships: DatabaseTables.GovernmentMembership[];
}> = ({ personId, trustPositions, governmentMemberships }) => {
  const themedColors = useThemedColors();
  const [committees, setCommittees] = React.useState<CommitteeType[] | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetchPersonCommittees(personId).then((data) => {
      setCommittees(data);
      setLoading(false);
    });
  }, [personId]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );

  return (
    <Box>
      {/* Committees */}
      {committees && committees.length > 0 && (
        <>
          <SectionLabel
            icon={
              <GroupsIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />
            }
            label={`Valiokunnat (${committees.length})`}
          />
          <List dense sx={{ p: 0, mb: 2 }}>
            {committees.map((c) => (
              <ListItem key={c.id} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ color: themedColors.textPrimary }}
                      >
                        {c.committee_name}
                      </Typography>
                      {c.role && (
                        <Chip
                          label={c.role}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.65rem",
                            bgcolor: `${colors.primaryLight}15`,
                            color: colors.primaryLight,
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {displayDate(c.start_date)} - {displayDate(c.end_date)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Government Memberships */}
      {governmentMemberships && governmentMemberships.length > 0 && (
        <>
          <SectionLabel
            icon={
              <AccountBalanceIcon
                sx={{ color: colors.primaryLight, fontSize: 20 }}
              />
            }
            label={`Hallitustehtavat (${governmentMemberships.length})`}
          />
          <List dense sx={{ p: 0, mb: 2 }}>
            {governmentMemberships.map((gm, i) => (
              <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary={
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight="600"
                        sx={{ color: themedColors.textPrimary }}
                      >
                        {gm.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: themedColors.textSecondary }}
                      >
                        {gm.government}
                        {gm.ministry && ` - ${gm.ministry}`}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {displayDate(gm.start_date)} - {displayDate(gm.end_date)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Trust Positions */}
      {trustPositions && trustPositions.length > 0 && (
        <>
          <SectionLabel
            icon={
              <WorkIcon sx={{ color: colors.primaryLight, fontSize: 20 }} />
            }
            label={`Muut luottamustehtavat (${trustPositions.length})`}
          />
          <List dense sx={{ p: 0 }}>
            {trustPositions.map((tp, i) => (
              <ListItem key={i} sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      sx={{ color: themedColors.textPrimary }}
                    >
                      {tp.name}
                      {tp.position_type && (
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: themedColors.textSecondary, ml: 1 }}
                        >
                          ({tp.position_type})
                        </Typography>
                      )}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="caption"
                      sx={{ color: themedColors.textSecondary }}
                    >
                      {tp.period}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {(!committees || committees.length === 0) &&
        (!governmentMemberships || governmentMemberships.length === 0) &&
        (!trustPositions || trustPositions.length === 0) && (
          <Typography
            variant="body2"
            sx={{
              color: themedColors.textTertiary,
              textAlign: "center",
              py: 4,
            }}
          >
            Ei luottamustehtavia.
          </Typography>
        )}
    </Box>
  );
};

// ──────────────────────────── Main Component ────────────────────────────

export const RepresentativeDetails: React.FC<{
  open: boolean;
  onClose: () => void;
  selectedRepresentative: DatabaseQueries.GetParliamentComposition | null;
  selectedDate: string;
}> = ({ open, onClose, selectedRepresentative, selectedDate }) => {
  const themedColors = useThemedColors();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [tabIndex, setTabIndex] = React.useState(0);

  const [details, setDetails] =
    React.useState<Awaited<ReturnType<typeof fetchPersonDetails>>>();

  React.useEffect(() => {
    if (selectedRepresentative) {
      setDetails(undefined);
      setTabIndex(0);
      fetchPersonDetails(selectedRepresentative.person_id).then(setDetails);
    } else {
      setDetails(undefined);
    }
  }, [selectedRepresentative]);

  if (!selectedRepresentative) return null;

  const currentParty =
    details?.groupMemberships?.[0]?.group_name || "Ei tiedossa";
  const currentDistrict =
    details?.districts?.[0]?.district_name || "Ei tiedossa";

  const selectedDateObj = new Date(selectedDate);
  const deathDateObj = selectedRepresentative.death_date
    ? new Date(selectedRepresentative.death_date)
    : null;
  const wasAliveOnSelectedDate =
    !deathDateObj || selectedDateObj <= deathDateObj;
  const effectiveDate = wasAliveOnSelectedDate
    ? selectedDate
    : selectedRepresentative.death_date!;
  const age = selectedRepresentative.birth_date
    ? calculateAge(selectedRepresentative.birth_date, effectiveDate)
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          maxHeight: isMobile ? "100vh" : "90vh",
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
          {/* Header - clean, no gradient */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              bgcolor: colors.primary,
              borderRadius: isMobile ? 0 : "12px 12px 0 0",
            }}
          >
            <Box sx={{ position: "relative", p: { xs: 2, sm: 2.5 } }}>
              <IconButton
                onClick={onClose}
                sx={{
                  position: "absolute",
                  top: { xs: 8, sm: 12 },
                  right: { xs: 8, sm: 12 },
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.1)",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                }}
              >
                <CloseIcon />
              </IconButton>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1.5, sm: 2 },
                  pr: { xs: 4, sm: 0 },
                }}
              >
                <Avatar
                  sx={{
                    width: { xs: 48, sm: 56 },
                    height: { xs: 48, sm: 56 },
                    background: "rgba(255,255,255,0.15)",
                    color: "white",
                    fontSize: { xs: 18, sm: 22 },
                    fontWeight: 700,
                    border: "2px solid rgba(255,255,255,0.2)",
                    flexShrink: 0,
                  }}
                >
                  {selectedRepresentative.first_name[0]}
                  {selectedRepresentative.last_name[0]}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    fontWeight="700"
                    sx={{ color: "white", lineHeight: 1.3 }}
                  >
                    {selectedRepresentative.first_name}{" "}
                    {selectedRepresentative.last_name}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexWrap: "wrap",
                      alignItems: "center",
                      mt: 0.5,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {currentParty}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      |
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {currentDistrict}
                    </Typography>
                    {age && (
                      <>
                        <Typography
                          variant="body2"
                          sx={{ color: "rgba(255,255,255,0.5)" }}
                        >
                          |
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "rgba(255,255,255,0.85)" }}
                        >
                          {age} v
                        </Typography>
                      </>
                    )}
                    <Chip
                      label={
                        selectedRepresentative.is_in_government === 1
                          ? "Hallitus"
                          : "Oppositio"
                      }
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        bgcolor:
                          selectedRepresentative.is_in_government === 1
                            ? "rgba(76, 175, 80, 0.25)"
                            : "rgba(255, 152, 0, 0.25)",
                        color: "white",
                        border:
                          selectedRepresentative.is_in_government === 1
                            ? "1px solid rgba(76, 175, 80, 0.5)"
                            : "1px solid rgba(255, 152, 0, 0.5)",
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Tabs */}
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 40,
                px: 1,
                "& .MuiTab-root": {
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  minHeight: 40,
                  textTransform: "none",
                  py: 0,
                  "&.Mui-selected": { color: "white" },
                },
                "& .MuiTabs-indicator": {
                  bgcolor: "white",
                  height: 2,
                },
              }}
            >
              <Tab
                label="Yleistiedot"
                icon={<PersonIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                label="Aanestykset"
                icon={<HowToVoteIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                label="Puheenvuorot"
                icon={<MicIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                label="Luottamustehtavat"
                icon={<WorkIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <DialogContent
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: themedColors.backgroundSubtle,
              overflowY: "auto",
            }}
          >
            {tabIndex === 0 && details && <OverviewTab details={details} />}
            {tabIndex === 1 && (
              <VotesTab personId={selectedRepresentative.person_id} />
            )}
            {tabIndex === 2 && (
              <SpeechesTab personId={selectedRepresentative.person_id} />
            )}
            {tabIndex === 3 && details && (
              <PositionsTab
                personId={selectedRepresentative.person_id}
                trustPositions={details.trustPositions || []}
                governmentMemberships={details.governmentMemberships || []}
              />
            )}
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};
