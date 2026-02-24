import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import EventIcon from "@mui/icons-material/Event";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GroupsIcon from "@mui/icons-material/Groups";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PieChartIcon from "@mui/icons-material/PieChart";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  IconButton,
  Link,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DocumentCard,
  RelatedVotings,
  extractDocumentIdentifiers,
} from "#client/components/DocumentCards";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { refs } from "#client/references";
import { commonStyles, spacing } from "#client/theme";
import {
  DataCard,
  MetricCard,
  PageHeader,
  VoteMarginBar,
} from "#client/theme/components";
import { colors } from "#client/theme/index";
import { useThemedColors } from "#client/theme/ThemeContext";

type SessionWithSections = {
  id: number;
  key: string;
  date: string;
  state?: string;
  description?: string;
  agenda_title?: string;
  agenda_state?: string;
  section_count: number;
  voting_count: number;
  sections?: Section[];
  notices?: SessionNotice[];
  minutes_items?: SessionMinutesItem[];
  minutes_attachments?: SessionMinutesAttachment[];
};

type Section = {
  id: number;
  key: string;
  ordinal: number;
  title: string;
  note?: string | null;
  processing_title?: string;
  identifier?: string;
  resolution?: string;
  session_key?: string;
  agenda_key?: string;
  modified_datetime?: string;
  vaski_id?: number;
  vaski_document_id?: number | null;
  voting_count?: number;
  speech_count?: number;
  speaker_count?: number;
  party_count?: number;
  vaski_document_type_name?: string | null;
  vaski_document_type_code?: string | null;
  vaski_eduskunta_tunnus?: string | null;
  vaski_document_number?: number | null;
  vaski_parliamentary_year?: string | null;
  vaski_title?: string | null;
  vaski_summary?: string | null;
  vaski_author_first_name?: string | null;
  vaski_author_last_name?: string | null;
  vaski_author_role?: string | null;
  vaski_author_organization?: string | null;
  vaski_creation_date?: string | null;
  vaski_status?: string | null;
  vaski_source_reference?: string | null;
  vaski_subjects?: string | null;
  minutes_entry_kind?: string | null;
  minutes_entry_order?: number | null;
  minutes_item_identifier?: number | null;
  minutes_parent_item_identifier?: string | null;
  minutes_item_number?: string | null;
  minutes_item_order?: number | null;
  minutes_item_title?: string | null;
  minutes_related_document_identifier?: string | null;
  minutes_related_document_type?: string | null;
  minutes_processing_phase_code?: string | null;
  minutes_general_processing_phase_code?: string | null;
  minutes_content_text?: string | null;
  minutes_match_mode?: string | null;
};

type SessionNotice = {
  id: number;
  session_key: string;
  section_key?: string | null;
  notice_type?: string | null;
  text_fi?: string | null;
  valid_until?: string | null;
  sent_at?: string | null;
  created_datetime?: string | null;
  modified_datetime?: string | null;
};

type SessionMinutesItem = {
  id: number;
  session_key: string;
  minutes_document_id: number;
  item_type: string;
  ordinal?: number | null;
  title?: string | null;
  identifier_text?: string | null;
  processing_title?: string | null;
  note?: string | null;
  source_item_id?: number | null;
  source_parent_item_id?: number | null;
  section_id?: number | null;
  section_key?: string | null;
};

type SessionMinutesAttachment = {
  id: number;
  session_key: string;
  minutes_document_id: number;
  minutes_item_id?: number | null;
  title?: string | null;
  related_document_tunnus?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  native_id?: string | null;
};

type SectionDocumentLink = {
  id: number;
  section_key: string;
  label?: string | null;
  url?: string | null;
  document_tunnus?: string | null;
  document_id?: number | null;
  document_type_name?: string | null;
  document_type_code?: string | null;
  document_title?: string | null;
  document_created_at?: string | null;
  source_type?: string | null;
};

type RollCallReport = {
  id: number;
  parliament_identifier: string;
  session_date: string;
  roll_call_start_time?: string | null;
  roll_call_end_time?: string | null;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
  edk_identifier: string;
  source_path: string;
  attachment_group_id?: number | null;
  entry_count: number;
  absent_count: number;
  late_count: number;
};

type RollCallEntry = {
  roll_call_id: number;
  entry_order: number;
  person_id?: number | null;
  first_name: string;
  last_name: string;
  party?: string | null;
  entry_type: "absent" | "late";
  absence_reason?: string | null;
  arrival_time?: string | null;
};

type SectionRollCallData = {
  report: RollCallReport;
  entries: RollCallEntry[];
};

type SubSection = {
  id: number;
  session_key: string;
  section_key: string;
  entry_order: number;
  entry_kind: "asiakohta" | "muu_asiakohta";
  item_identifier: number;
  parent_item_identifier?: string | null;
  item_number?: string | null;
  item_order?: number | null;
  item_title?: string | null;
  related_document_identifier?: string | null;
  related_document_type?: string | null;
  processing_phase_code?: string | null;
  general_processing_phase_code?: string | null;
  content_text?: string | null;
  match_mode: "direct" | "parent_fallback";
  minutes_document_id: number;
};

type MinutesContentReference = {
  vaskiId: number | null;
  code: string | null;
};

type Speech = {
  id: number;
  ordinal: number;
  ordinal_number?: number;
  first_name: string;
  last_name: string;
  party_abbreviation?: string;
  speech_type?: string;
  content?: string;
  start_time?: string;
  end_time?: string;
};

type Voting = {
  id: number;
  number: number;
  title: string;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
};

type VotingInlineDetails = {
  voting: Voting & {
    n_abstain: number;
    n_absent: number;
    context_title?: string | null;
    parliamentary_item?: string | null;
    section_key?: string | null;
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
    government_abstain: number;
    government_absent: number;
    government_total: number;
    opposition_yes: number;
    opposition_no: number;
    opposition_abstain: number;
    opposition_absent: number;
    opposition_total: number;
  } | null;
  relatedVotings: {
    id: number;
    number: number | null;
    start_time: string | null;
    context_title: string;
    n_yes: number;
    n_no: number;
    n_abstain: number;
    n_absent: number;
    n_total: number;
    session_key: string | null;
  }[];
};

type SpeechData = {
  speeches: Speech[];
  total: number;
  page: number;
  totalPages: number;
};

const SPEECH_PAGE_SIZE = 20;

type Member = {
  person_id: number;
  first_name: string;
  last_name: string;
  party_name?: string;
  is_in_government?: number;
  gender?: string;
  profession?: string;
};

const Home = () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();

  const [sessions, setSessions] = useState<SessionWithSections[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingComposition, setLoadingComposition] = useState(true);
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [vaskiLatestSpeechDate, setVaskiLatestSpeechDate] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(),
  );
  const [sectionSpeechData, setSectionSpeechData] = useState<
    Record<number, SpeechData>
  >({});
  const [sectionVotings, setSectionVotings] = useState<
    Record<number, Voting[]>
  >({});
  const [sectionLinks, setSectionLinks] = useState<
    Record<string, SectionDocumentLink[]>
  >({});
  const [sectionRollCalls, setSectionRollCalls] = useState<
    Record<number, SectionRollCallData | null>
  >({});
  const [sectionSubSections, setSectionSubSections] = useState<
    Record<number, SubSection[]>
  >({});
  const [loadingSpeeches, setLoadingSpeeches] = useState<Set<number>>(
    new Set(),
  );
  const [loadingVotings, setLoadingVotings] = useState<Set<number>>(new Set());
  const [loadingLinks, setLoadingLinks] = useState<Set<string>>(new Set());
  const [loadingRollCalls, setLoadingRollCalls] = useState<Set<number>>(
    new Set(),
  );
  const [loadingSubSections, setLoadingSubSections] = useState<Set<number>>(
    new Set(),
  );
  const [loadingMoreSpeeches, setLoadingMoreSpeeches] = useState<Set<number>>(
    new Set(),
  );
  const [expandedVotingIds, setExpandedVotingIds] = useState<Set<number>>(
    new Set(),
  );
  const [votingDetailsById, setVotingDetailsById] = useState<
    Record<number, VotingInlineDetails>
  >({});
  const [loadingVotingDetails, setLoadingVotingDetails] = useState<Set<number>>(
    new Set(),
  );
  const [expandedMinutesSessions, setExpandedMinutesSessions] = useState<
    Set<string>
  >(new Set());
  const [expandedAttachmentSessions, setExpandedAttachmentSessions] = useState<
    Set<string>
  >(new Set());

  // Fetch latest session date, then load that session
  useEffect(() => {
    const fetchLatestSession = async () => {
      try {
        setLoadingSessions(true);
        const datesRes = await fetch("/api/session-dates/completed");
        if (!datesRes.ok) throw new Error("Failed to fetch dates");
        const dates: { date: string }[] = await datesRes.json();
        if (dates.length === 0) {
          setSessions([]);
          setLoadingSessions(false);
          return;
        }
        const latest = dates.sort((a, b) => b.date.localeCompare(a.date))[0]
          .date;
        setLatestDate(latest);

        const sessionsRes = await fetch(`/api/day/${latest}/sessions`);
        if (!sessionsRes.ok) throw new Error("Failed to fetch sessions");
        const payload: {
          sessions: SessionWithSections[];
          vaskiLatestSpeechDate?: string | null;
        } = await sessionsRes.json();
        setSessions(payload.sessions || []);
        setVaskiLatestSpeechDate(payload.vaskiLatestSpeechDate ?? null);
      } catch {
        setError(t("home.loadingError"));
      } finally {
        setLoadingSessions(false);
      }
    };
    fetchLatestSession();
  }, [t]);

  // Fetch current composition
  useEffect(() => {
    const fetchComposition = async () => {
      try {
        setLoadingComposition(true);
        const today = new Date().toISOString().split("T")[0];
        const res = await fetch(`/api/composition/${today}`);
        if (!res.ok) throw new Error("Failed to fetch composition");
        const data: Member[] = await res.json();
        setMembers(data);
      } catch {
        // Non-critical - just won't show composition
      } finally {
        setLoadingComposition(false);
      }
    };
    fetchComposition();
  }, []);

  // Composition stats
  const stats = React.useMemo(() => {
    const totalMembers = members.length;
    const inGovernment = members.filter((m) => m.is_in_government === 1).length;
    const inOpposition = totalMembers - inGovernment;

    const partyGroups = members.reduce(
      (acc, m) => {
        const party = m.party_name || "Tuntematon";
        if (!acc[party]) acc[party] = { total: 0, inGovernment: 0 };
        acc[party].total++;
        if (m.is_in_government === 1) acc[party].inGovernment++;
        return acc;
      },
      {} as Record<string, { total: number; inGovernment: number }>,
    );

    const sortedParties = Object.entries(partyGroups).sort(
      ([, a], [, b]) => b.total - a.total,
    );

    return {
      totalMembers,
      inGovernment,
      inOpposition,
      partyGroups: sortedParties,
    };
  }, [members]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("fi-FI", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateTime?: string) => {
    if (!dateTime) return "-";
    const normalized = dateTime.includes("T")
      ? dateTime
      : dateTime.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleTimeString("fi-FI", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateTime?: string) => {
    if (!dateTime) return "-";
    const normalized = dateTime.includes("T")
      ? dateTime
      : dateTime.replace(" ", "T");
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("fi-FI", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSpeechTimeRange = (speech: Speech) => {
    const start = formatTime(speech.start_time);
    if (start === "-") return null;
    const end = formatTime(speech.end_time);
    return end !== "-" ? `${start} - ${end}` : start;
  };

  const parseVaskiSubjects = (subjects?: string | null) => {
    if (!subjects) return [];
    return subjects
      .split(" | ")
      .map((subject) => subject.trim())
      .filter(Boolean);
  };

  const formatVaskiAuthor = (section: Section) => {
    const name = [
      section.vaski_author_first_name,
      section.vaski_author_last_name,
    ]
      .filter(Boolean)
      .join(" ");
    const parts = [
      name,
      section.vaski_author_role,
      section.vaski_author_organization,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" • ") : null;
  };

  const getSectionOrderLabel = (section: Section) => {
    const identifier = section.identifier?.trim();
    if (identifier) return identifier;
    return String(section.ordinal);
  };

  const buildValtiopaivaAsiakirjaUrl = (tunnus?: string | null) => {
    if (!tunnus || !tunnus.trim()) return null;
    const normalized = tunnus.trim();
    const match = normalized.match(
      /^([A-Za-zÅÄÖåäö_]+)\s+(\d+)\s*\/\s*(\d{4})(?:\s+vp)?$/i,
    );
    if (match) {
      const [, code, number, year] = match;
      const slug = `${code.toUpperCase()}_${Number.parseInt(number, 10)}+${year}`;
      return `https://www.eduskunta.fi/FI/vaski/KasittelytiedotValtiopaivaasia/Sivut/${slug}.aspx`;
    }
    return null;
  };

  const isRollCallSection = (section?: Section) => {
    if (!section) return false;
    const documentType = (section.minutes_related_document_type || "").toLowerCase();
    const sectionTitle = (section.title || "").toLowerCase();
    const processingTitle = (section.processing_title || "").toLowerCase();
    return (
      documentType.includes("nimenhuuto") ||
      sectionTitle.includes("nimenhuuto") ||
      processingTitle.includes("nimenhuuto")
    );
  };

  const splitPipeValues = (value?: string | null) =>
    value
      ? value
          .split(" | ")
          .map((part) => part.trim())
          .filter(Boolean)
      : [];

  const buildFallbackSubSections = (section: Section): SubSection[] => {
    const numbers = splitPipeValues(section.minutes_item_number);
    const titles = splitPipeValues(section.minutes_item_title);
    const documentIdentifiers = splitPipeValues(
      section.minutes_related_document_identifier,
    );
    const documentTypes = splitPipeValues(section.minutes_related_document_type);
    const maxLength = Math.max(
      numbers.length,
      titles.length,
      documentIdentifiers.length,
      0,
    );

    if (maxLength <= 1) return [];

    return Array.from({ length: maxLength }, (_, index) => ({
      id: -(index + 1),
      session_key: section.session_key || "",
      section_key: section.key,
      entry_order: index + 1,
      entry_kind: (section.minutes_entry_kind || "asiakohta") as
        | "asiakohta"
        | "muu_asiakohta",
      item_identifier: section.minutes_item_identifier || 0,
      parent_item_identifier: section.minutes_parent_item_identifier || null,
      item_number: numbers[index] || null,
      item_order:
        typeof section.minutes_item_order === "number"
          ? section.minutes_item_order + index
          : null,
      item_title: titles[index] || null,
      related_document_identifier: documentIdentifiers[index] || null,
      related_document_type:
        documentTypes[index] || section.minutes_related_document_type || null,
      processing_phase_code: section.minutes_processing_phase_code || null,
      general_processing_phase_code:
        section.minutes_general_processing_phase_code || null,
      content_text: null,
      match_mode:
        section.minutes_match_mode === "parent_fallback"
          ? "parent_fallback"
          : "direct",
      minutes_document_id: section.vaski_document_id || 0,
    }));
  };

  const getSectionSubSectionRows = (section: Section): SubSection[] => {
    const fromDb = sectionSubSections[section.id] || [];
    if (fromDb.length > 0) return fromDb;
    return buildFallbackSubSections(section);
  };

  const isMinutesReferenceId = (value: string) => /^\d{5,}$/.test(value);

  const isMinutesReferenceCode = (value: string) =>
    /^[A-ZÅÄÖ]{1,8}(?:_[A-ZÅÄÖ0-9]+)+$/i.test(value);

  const parseMinutesContent = (content?: string | null) => {
    const blocks = (content || "")
      .split(/\n\s*\n+/)
      .map((block) => block.trim())
      .filter(Boolean);

    const references: MinutesContentReference[] = [];
    const narrativeBlocks: string[] = [];

    for (let index = 0; index < blocks.length; index++) {
      const current = blocks[index];
      const next = blocks[index + 1];

      if (isMinutesReferenceId(current) && next && isMinutesReferenceCode(next)) {
        references.push({
          vaskiId: Number.parseInt(current, 10),
          code: next,
        });
        index += 1;
        continue;
      }

      if (isMinutesReferenceId(current)) {
        references.push({
          vaskiId: Number.parseInt(current, 10),
          code: null,
        });
        continue;
      }

      if (isMinutesReferenceCode(current)) {
        references.push({
          vaskiId: null,
          code: current,
        });
        continue;
      }

      narrativeBlocks.push(current);
    }

    const dedupedReferences: MinutesContentReference[] = [];
    const seenKeys = new Set<string>();
    for (const reference of references) {
      const key = `${reference.vaskiId ?? "null"}::${reference.code ?? "null"}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      dedupedReferences.push(reference);
    }

    return {
      narrativeBlocks,
      references: dedupedReferences,
    };
  };

  const extractSectionDocRefs = (section: Section) =>
    extractDocumentIdentifiers([
      section.minutes_related_document_identifier,
      section.title,
      section.minutes_item_title,
    ]);

  const fetchSpeeches = async (
    sectionId: number,
    sectionKey: string,
    offset = 0,
  ) => {
    const res = await fetch(
      `/api/sections/${sectionKey}/speeches?limit=${SPEECH_PAGE_SIZE}&offset=${offset}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SpeechData;
  };

  const fetchSectionLinks = async (sectionKey: string) => {
    const res = await fetch(`/api/sections/${sectionKey}/links`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SectionDocumentLink[];
  };

  const fetchSectionSubSections = async (sectionKey: string) => {
    const res = await fetch(`/api/sections/${sectionKey}/subsections`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SubSection[];
  };

  const fetchSectionRollCall = async (sectionKey: string) => {
    const res = await fetch(`/api/sections/${sectionKey}/roll-call`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SectionRollCallData | null;
  };

  const toggleSection = async (sectionId: number, sectionKey: string) => {
    const isExpanding = !expandedSections.has(sectionId);

    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });

    if (isExpanding) {
      const section = sessions
        .flatMap((session) => session.sections || [])
        .find((candidate) => candidate.id === sectionId || candidate.key === sectionKey);

      if (!sectionSpeechData[sectionId]) {
        setLoadingSpeeches((prev) => new Set(prev).add(sectionId));
        try {
          const data = await fetchSpeeches(sectionId, sectionKey);
          setSectionSpeechData((prev) => ({ ...prev, [sectionId]: data }));
        } finally {
          setLoadingSpeeches((prev) => {
            const next = new Set(prev);
            next.delete(sectionId);
            return next;
          });
        }
      }

      if (!sectionVotings[sectionId]) {
        setLoadingVotings((prev) => new Set(prev).add(sectionId));
        try {
          const res = await fetch(`/api/sections/${sectionKey}/votings`);
          if (res.ok) {
            const votings: Voting[] = await res.json();
            setSectionVotings((prev) => ({ ...prev, [sectionId]: votings }));
          }
        } finally {
          setLoadingVotings((prev) => {
            const next = new Set(prev);
            next.delete(sectionId);
            return next;
          });
        }
      }

      if (!sectionLinks[sectionKey]) {
        setLoadingLinks((prev) => new Set(prev).add(sectionKey));
        try {
          const links = await fetchSectionLinks(sectionKey);
          setSectionLinks((prev) => ({ ...prev, [sectionKey]: links }));
        } finally {
          setLoadingLinks((prev) => {
            const next = new Set(prev);
            next.delete(sectionKey);
            return next;
          });
        }
      }

      const hasSubSectionsData = Object.prototype.hasOwnProperty.call(
        sectionSubSections,
        sectionId,
      );
      if (!hasSubSectionsData) {
        setLoadingSubSections((prev) => new Set(prev).add(sectionId));
        try {
          const subSections = await fetchSectionSubSections(sectionKey);
          setSectionSubSections((prev) => ({ ...prev, [sectionId]: subSections }));
        } finally {
          setLoadingSubSections((prev) => {
            const next = new Set(prev);
            next.delete(sectionId);
            return next;
          });
        }
      }

      const hasRollCallData = Object.prototype.hasOwnProperty.call(
        sectionRollCalls,
        sectionId,
      );
      if (isRollCallSection(section) && !hasRollCallData) {
        setLoadingRollCalls((prev) => new Set(prev).add(sectionId));
        try {
          const rollCall = await fetchSectionRollCall(sectionKey);
          setSectionRollCalls((prev) => ({ ...prev, [sectionId]: rollCall }));
        } finally {
          setLoadingRollCalls((prev) => {
            const next = new Set(prev);
            next.delete(sectionId);
            return next;
          });
        }
      }
    }
  };

  const loadMoreSpeeches = async (sectionId: number, sectionKey: string) => {
    const current = sectionSpeechData[sectionId];
    if (!current || current.page >= current.totalPages) return;

    setLoadingMoreSpeeches((prev) => new Set(prev).add(sectionId));
    try {
      const nextOffset = current.page * SPEECH_PAGE_SIZE;
      const data = await fetchSpeeches(sectionId, sectionKey, nextOffset);
      setSectionSpeechData((prev) => ({
        ...prev,
        [sectionId]: {
          ...data,
          speeches: [...(prev[sectionId]?.speeches || []), ...data.speeches],
        },
      }));
    } finally {
      setLoadingMoreSpeeches((prev) => {
        const next = new Set(prev);
        next.delete(sectionId);
        return next;
      });
    }
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
    const nextExpanded = !expandedVotingIds.has(votingId);
    setExpandedVotingIds((prev) => {
      const next = new Set(prev);
      if (next.has(votingId)) next.delete(votingId);
      else next.add(votingId);
      return next;
    });
    if (nextExpanded) {
      void fetchVotingDetails(votingId);
    }
  };

  const toggleSessionMinutes = (sessionKey: string) => {
    setExpandedMinutesSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionKey)) next.delete(sessionKey);
      else next.add(sessionKey);
      return next;
    });
  };

  const toggleSessionAttachments = (sessionKey: string) => {
    setExpandedAttachmentSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionKey)) next.delete(sessionKey);
      else next.add(sessionKey);
      return next;
    });
  };

  const renderVaskiInfo = (section: Section, compact = false) => {
    const hasAny =
      section.vaski_title ||
      section.vaski_document_type_name ||
      section.vaski_summary ||
      section.vaski_subjects ||
      section.vaski_author_first_name ||
      section.vaski_author_last_name ||
      section.vaski_eduskunta_tunnus;

    if (!hasAny) return null;

    const authorLine = formatVaskiAuthor(section);
    const subjects = parseVaskiSubjects(section.vaski_subjects);
    const docNumber =
      typeof section.vaski_document_number === "number" &&
      !Number.isNaN(section.vaski_document_number) &&
      section.vaski_parliamentary_year
        ? `${section.vaski_document_number}/${section.vaski_parliamentary_year}`
        : null;

    return (
      <Box
        sx={{
          mt: 0.75,
          p: 1,
          borderRadius: 1,
          border: `1px solid ${colors.primaryLight}25`,
          background: `${colors.primaryLight}08`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: colors.textTertiary,
            textTransform: "uppercase",
          }}
        >
          {t("sessions.vaskiDocument")}
        </Typography>
        {(section.vaski_document_type_name ||
          section.vaski_document_type_code ||
          section.vaski_eduskunta_tunnus ||
          docNumber ||
          section.vaski_status ||
          section.vaski_creation_date) && (
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}>
            {(section.vaski_document_type_name ||
              section.vaski_document_type_code) && (
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiType")}:{" "}
                {section.vaski_document_type_name ||
                  section.vaski_document_type_code}
              </Typography>
            )}
            {section.vaski_eduskunta_tunnus && (
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiTunnus")}: {section.vaski_eduskunta_tunnus}
              </Typography>
            )}
            {docNumber && (
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiDocNumber")}: {docNumber}
              </Typography>
            )}
            {section.vaski_status && (
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiStatus")}: {section.vaski_status}
              </Typography>
            )}
            {section.vaski_creation_date && (
              <Typography
                sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
              >
                {t("sessions.vaskiCreated")}: {section.vaski_creation_date}
              </Typography>
            )}
          </Box>
        )}
        {section.vaski_title && (
          <Typography
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: colors.textPrimary,
              mt: 0.5,
            }}
          >
            {section.vaski_title}
          </Typography>
        )}
        {authorLine && (
          <Typography
            sx={{ fontSize: "0.75rem", color: colors.textSecondary, mt: 0.25 }}
          >
            {t("sessions.vaskiAuthor")}: {authorLine}
          </Typography>
        )}
        {section.vaski_source_reference && (
          <Typography
            sx={{ fontSize: "0.75rem", color: colors.textTertiary, mt: 0.25 }}
          >
            {t("sessions.vaskiSourceReference")}:{" "}
            {section.vaski_source_reference}
          </Typography>
        )}
        {section.vaski_summary && (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: colors.textSecondary,
              mt: 0.5,
              ...(compact
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }
                : {}),
            }}
          >
            {t("sessions.vaskiSummary")}: {section.vaski_summary}
          </Typography>
        )}
        {subjects.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
            <Typography
              sx={{ fontSize: "0.75rem", color: colors.textSecondary, mr: 0.5 }}
            >
              {t("sessions.vaskiSubjects")}:
            </Typography>
            {subjects.map((subject) => (
              <Chip
                key={subject}
                label={subject}
                size="small"
                sx={{ fontSize: "0.625rem", height: 20 }}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderMinutesInfo = (section: Section, _compact = false) => {
    const isMergedValue = (value?: string | null) =>
      typeof value === "string" && value.includes(" | ");

    const minutesItemTitle = isMergedValue(section.minutes_item_title)
      ? null
      : section.minutes_item_title;
    const hasAny =
      minutesItemTitle ||
      section.minutes_processing_phase_code ||
      section.minutes_general_processing_phase_code;

    if (!hasAny) return null;

    return (
      <Box
        sx={{
          mt: 0.75,
          p: 1,
          borderRadius: 1,
          border: `1px solid ${colors.primaryLight}25`,
          background: `${colors.primaryLight}08`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: colors.textTertiary,
            textTransform: "uppercase",
          }}
        >
          {t("sessions.minutesMetadata", { defaultValue: "Pöytäkirjatiedot" })}
        </Typography>
        {minutesItemTitle && minutesItemTitle !== section.title && (
          <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>
            {t("sessions.minutesItemTitle", {
              defaultValue: "Pöytäkirjan otsikko",
            })}
            : {minutesItemTitle}
          </Typography>
        )}
        {(section.minutes_processing_phase_code ||
          section.minutes_general_processing_phase_code) && (
          <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>
            {t("sessions.minutesProcessingCodes", {
              defaultValue: "Käsittelykoodit",
            })}
            :{" "}
            {[
              section.minutes_processing_phase_code,
              section.minutes_general_processing_phase_code,
            ]
              .filter(Boolean)
              .join(" / ")}
          </Typography>
        )}
      </Box>
    );
  };

  const renderSectionMinutesContent = (section: Section) => {
    const subSectionRows = getSectionSubSectionRows(section);
    if (subSectionRows.length > 1) return null;

    const parsed = parseMinutesContent(section.minutes_content_text);
    const references: MinutesContentReference[] = [...parsed.references];
    const relatedDocument = section.minutes_related_document_identifier?.trim();
    if (
      relatedDocument &&
      !references.some(
        (reference) => reference.code === relatedDocument && reference.vaskiId === null,
      )
    ) {
      references.unshift({ vaskiId: null, code: relatedDocument });
    }

    if (parsed.narrativeBlocks.length === 0 && references.length === 0) return null;

    const normalizeIdentifier = (value?: string | null) =>
      value?.trim().toLowerCase() || null;
    const rollCallData = sectionRollCalls[section.id];
    const knownRollCallIdentifiers = new Set<string>(
      [
        section.minutes_related_document_identifier,
        rollCallData?.report?.edk_identifier,
        rollCallData?.report?.parliament_identifier,
      ]
        .map((value) => normalizeIdentifier(value))
        .filter((value): value is string => value !== null),
    );
    const isReferenceMigratedAsRollCall = (reference: MinutesContentReference) => {
      const normalizedCode = normalizeIdentifier(reference.code);
      if (!normalizedCode) return false;
      if (!isRollCallSection(section)) return false;
      return knownRollCallIdentifiers.has(normalizedCode);
    };

    return (
      <Box
        sx={{
          mt: 1.5,
          p: 1.5,
          borderRadius: 1,
          border: `1px solid ${colors.primaryLight}25`,
          background: `${colors.primaryLight}08`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 0.75,
          }}
        >
          {t("sessions.minutesContent", { defaultValue: "Pöytäkirjateksti" })}
        </Typography>

        {parsed.narrativeBlocks.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {parsed.narrativeBlocks.map((block, index) => (
              <Box
                key={`${section.key}-minutes-block-${index}`}
                sx={{
                  p: 0.75,
                  borderRadius: 1,
                  background: colors.backgroundDefault,
                  borderLeft: `3px solid ${colors.primaryLight}55`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    color: colors.textSecondary,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {block}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {references.length > 0 && (
          <Box sx={{ mt: parsed.narrativeBlocks.length > 0 ? 1 : 0 }}>
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: colors.textSecondary,
                textTransform: "uppercase",
                mb: 0.5,
              }}
            >
              {t("sessions.minutesDocumentReferences", {
                defaultValue: "Asiakirjaviitteet",
              })}
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
              <Box
                component="table"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.75rem",
                  "& th, & td": {
                    textAlign: "left",
                    borderBottom: `1px solid ${colors.dataBorder}`,
                    px: 0.75,
                    py: 0.5,
                    verticalAlign: "top",
                  },
                  "& th": {
                    color: colors.textSecondary,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  },
                  "& td": {
                    color: colors.textPrimary,
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>
                      {t("sessions.minutesReferenceId", {
                        defaultValue: "Vaski ID",
                      })}
                    </th>
                    <th>
                      {t("sessions.minutesReferenceCode", {
                        defaultValue: "Tunniste",
                      })}
                    </th>
                    <th>
                      {t("sessions.minutesReferenceStatus", {
                        defaultValue: "Tila",
                      })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {references.map((reference, index) => {
                    const href = buildValtiopaivaAsiakirjaUrl(reference.code);
                    const migratedAsRollCall =
                      isReferenceMigratedAsRollCall(reference);
                    return (
                      <tr
                        key={`${section.key}-minutes-reference-${reference.vaskiId ?? "null"}-${reference.code ?? "null"}-${index}`}
                      >
                        <td>{reference.vaskiId ?? "-"}</td>
                        <td>
                          {reference.code ? (
                            href ? (
                              <Link
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                underline="hover"
                                sx={{
                                  fontSize: "0.75rem",
                                  color: colors.primaryLight,
                                  fontFamily: "monospace",
                                }}
                              >
                                {reference.code}
                              </Link>
                            ) : (
                              <Box component="span" sx={{ fontFamily: "monospace" }}>
                                {reference.code}
                              </Box>
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {migratedAsRollCall
                            ? t("sessions.minutesReferenceMigratedRollCall", {
                                defaultValue: "Migroitu: nimenhuutoraportti.",
                              })
                            : t("sessions.minutesReferenceNotMigrated", {
                                defaultValue:
                                  "Asiakirja havaittu, sisältöä ei ole vielä migroitu.",
                              })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const renderSectionSubSections = (section: Section) => {
    const loading = loadingSubSections.has(section.id);
    const rows = getSectionSubSectionRows(section);

    if (loading) {
      return (
        <Box sx={{ mt: 1.5, py: 1, textAlign: "center" }}>
          <CircularProgress size={18} sx={{ color: themedColors.primary }} />
        </Box>
      );
    }

    if (rows.length <= 1) return null;

    return (
      <Box
        sx={{
          mt: 1.5,
          p: 1.5,
          borderRadius: 1,
          border: `1px solid ${colors.primaryLight}25`,
          background: `${colors.primaryLight}08`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 0.75,
          }}
        >
          {t("sessions.subSections", { defaultValue: "Alakohdat" })}
        </Typography>
        <Box sx={{ overflowX: "auto" }}>
          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.75rem",
              "& th, & td": {
                textAlign: "left",
                borderBottom: `1px solid ${colors.dataBorder}`,
                px: 0.75,
                py: 0.5,
                verticalAlign: "top",
              },
              "& th": {
                color: colors.textSecondary,
                fontWeight: 700,
                whiteSpace: "nowrap",
              },
              "& td": {
                color: colors.textPrimary,
              },
            }}
          >
            <thead>
              <tr>
                <th>{t("sessions.subSectionNumber", { defaultValue: "Kohta" })}</th>
                <th>{t("sessions.subSectionTitle", { defaultValue: "Otsikko" })}</th>
                <th>{t("sessions.subSectionDocument", { defaultValue: "Asiakirja" })}</th>
                <th>{t("sessions.subSectionType", { defaultValue: "Tyyppi" })}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = buildValtiopaivaAsiakirjaUrl(
                  row.related_document_identifier,
                );
                return (
                  <tr key={`${row.section_key}-${row.entry_order}-${row.id}`}>
                    <td>{row.item_number || row.entry_order}</td>
                    <td>{row.item_title || "-"}</td>
                    <td>
                      {row.related_document_identifier ? (
                        href ? (
                          <Link
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            underline="hover"
                            sx={{ fontSize: "0.75rem", color: colors.primaryLight }}
                          >
                            {row.related_document_identifier}
                          </Link>
                        ) : (
                          row.related_document_identifier
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{row.related_document_type || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderSessionNotices = (session: SessionWithSections) => {
    const notices = (session.notices || []).filter(
      (notice) => !notice.section_key,
    );
    if (notices.length === 0) return null;

    return (
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.dataBorder}` }}>
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 1,
          }}
        >
          {t("sessions.sessionNotices")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {notices.map((notice) => (
            <Box
              key={notice.id}
              sx={{
                p: 1.5,
                borderRadius: 1,
                border: `1px solid ${colors.warning}30`,
                background: `${colors.warning}08`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  flexWrap: "wrap",
                  mb: notice.text_fi ? 0.5 : 0,
                }}
              >
                {notice.notice_type && (
                  <Chip
                    label={notice.notice_type}
                    size="small"
                    sx={{
                      fontSize: "0.625rem",
                      height: 20,
                      background: `${colors.warning}40`,
                      color: colors.textPrimary,
                    }}
                  />
                )}
                {notice.sent_at && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                  >
                    {t("sessions.noticeSent")}: {formatDateTime(notice.sent_at)}
                  </Typography>
                )}
                {notice.valid_until && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                  >
                    {t("sessions.noticeValidUntil")}:{" "}
                    {formatDateTime(notice.valid_until)}
                  </Typography>
                )}
              </Box>
              {notice.text_fi && (
                <Typography
                  sx={{ fontSize: "0.8125rem", color: colors.textPrimary }}
                >
                  {notice.text_fi}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderSectionNotices = (
    session: SessionWithSections,
    sectionKey: string,
  ) => {
    const notices = (session.notices || []).filter(
      (notice) => notice.section_key === sectionKey,
    );
    if (notices.length === 0) return null;

    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 0.75,
          }}
        >
          {t("sessions.sectionNotices")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {notices.map((notice) => (
            <Box
              key={notice.id}
              sx={{
                p: 1.25,
                borderRadius: 1,
                border: `1px solid ${colors.warning}30`,
                background: `${colors.warning}08`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  flexWrap: "wrap",
                  mb: notice.text_fi ? 0.5 : 0,
                }}
              >
                {notice.notice_type && (
                  <Chip
                    label={notice.notice_type}
                    size="small"
                    sx={{
                      fontSize: "0.625rem",
                      height: 20,
                      background: `${colors.warning}40`,
                      color: colors.textPrimary,
                    }}
                  />
                )}
                {notice.sent_at && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                  >
                    {t("sessions.noticeSent")}: {formatDateTime(notice.sent_at)}
                  </Typography>
                )}
                {notice.valid_until && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                  >
                    {t("sessions.noticeValidUntil")}:{" "}
                    {formatDateTime(notice.valid_until)}
                  </Typography>
                )}
              </Box>
              {notice.text_fi && (
                <Typography
                  sx={{ fontSize: "0.8125rem", color: colors.textPrimary }}
                >
                  {notice.text_fi}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const parseIdentifierForSort = (
    identifier?: string | null,
  ): number[] | null => {
    if (!identifier) return null;
    const normalized = identifier.trim();
    if (!/^\d+(\.\d+)*$/.test(normalized)) return null;
    const parts = normalized
      .split(".")
      .map((part) => Number.parseInt(part, 10))
      .filter((part) => !Number.isNaN(part));
    return parts.length > 0 ? parts : null;
  };

  const compareMinutesItems = (
    a: SessionMinutesItem,
    b: SessionMinutesItem,
  ) => {
    const aParts = parseIdentifierForSort(a.identifier_text);
    const bParts = parseIdentifierForSort(b.identifier_text);

    if (aParts && bParts) {
      const maxLen = Math.max(aParts.length, bParts.length);
      for (let i = 0; i < maxLen; i++) {
        const aVal = aParts[i] ?? -1;
        const bVal = bParts[i] ?? -1;
        if (aVal !== bVal) return aVal - bVal;
      }
    } else if (aParts) {
      return -1;
    } else if (bParts) {
      return 1;
    }

    const aOrdinal =
      typeof a.ordinal === "number" ? a.ordinal : Number.MAX_SAFE_INTEGER;
    const bOrdinal =
      typeof b.ordinal === "number" ? b.ordinal : Number.MAX_SAFE_INTEGER;
    if (aOrdinal !== bOrdinal) return aOrdinal - bOrdinal;

    return a.id - b.id;
  };

  const renderSessionMinutesOutline = (session: SessionWithSections) => {
    const items = (session.minutes_items || [])
      .slice()
      .sort(compareMinutesItems);
    if (items.length === 0) return null;
    const isExpanded = expandedMinutesSessions.has(session.key);

    return (
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.dataBorder}` }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: colors.textSecondary,
              textTransform: "uppercase",
            }}
          >
            {t("sessions.minutesOutline")}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toggleSessionMinutes(session.key)}
            sx={{
              textTransform: "none",
              borderColor: colors.primaryLight,
              color: colors.primaryLight,
              fontSize: "0.75rem",
            }}
          >
            {isExpanded ? t("sessions.hideMinutes") : t("sessions.showMinutes")}
          </Button>
        </Box>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  border: `1px solid ${colors.dataBorder}`,
                  background: colors.backgroundSubtle,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  {typeof item.ordinal === "number" && (
                    <Chip
                      label={item.ordinal}
                      size="small"
                      sx={{
                        fontSize: "0.625rem",
                        height: 18,
                        background: colors.primary,
                        color: "#fff",
                      }}
                    />
                  )}
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      color: colors.textPrimary,
                    }}
                  >
                    {item.title ||
                      item.processing_title ||
                      t("sessions.noTitle")}
                  </Typography>
                </Box>
                <Box
                  sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}
                >
                  {item.identifier_text && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.identifier")}: {item.identifier_text}
                    </Typography>
                  )}
                  {item.processing_title &&
                    item.processing_title !== item.title && (
                      <Typography
                        sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                      >
                        {t("sessions.processing")}: {item.processing_title}
                      </Typography>
                    )}
                  {item.note && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
                    >
                      {item.note}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderSessionAttachments = (session: SessionWithSections) => {
    const attachments = session.minutes_attachments || [];
    if (attachments.length === 0) return null;
    const isExpanded = expandedAttachmentSessions.has(session.key);

    return (
      <Box sx={{ p: 2, borderBottom: `1px solid ${colors.dataBorder}` }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: colors.textSecondary,
              textTransform: "uppercase",
            }}
          >
            {t("sessions.minutesAttachments")}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toggleSessionAttachments(session.key)}
            sx={{
              textTransform: "none",
              borderColor: colors.primaryLight,
              color: colors.primaryLight,
              fontSize: "0.75rem",
            }}
          >
            {isExpanded
              ? t("sessions.hideAttachments")
              : t("sessions.showAttachments")}
          </Button>
        </Box>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {attachments.map((attachment) => (
              <Box
                key={attachment.id}
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  border: `1px solid ${colors.dataBorder}`,
                  background: colors.backgroundSubtle,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    color: colors.textPrimary,
                  }}
                >
                  {attachment.title ||
                    attachment.file_name ||
                    t("sessions.attachment")}
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}
                >
                  {attachment.related_document_tunnus && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.relatedDocument")}:{" "}
                      {attachment.related_document_tunnus}
                    </Typography>
                  )}
                  {attachment.file_name && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.fileName")}: {attachment.file_name}
                    </Typography>
                  )}
                  {attachment.native_id && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.nativeId")}: {attachment.native_id}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderSectionLinks = (section: Section) => {
    const links = sectionLinks[section.key] || [];
    if (loadingLinks.has(section.key)) {
      return (
        <Box sx={{ py: 1, textAlign: "center" }}>
          <CircularProgress size={18} sx={{ color: themedColors.primary }} />
        </Box>
      );
    }
    if (links.length === 0) return null;

    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
            mb: 0.75,
          }}
        >
          {t("sessions.sectionDocuments")}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {links.map((link) => (
            <Box
              key={link.id}
              sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={link.url || "#"}
                  underline="hover"
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  {link.label || link.document_title || link.url}
                </Link>
                {link.document_tunnus && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                  >
                    {link.document_tunnus}
                  </Typography>
                )}
                {link.source_type && (
                  <Chip
                    label={link.source_type}
                    size="small"
                    sx={{
                      fontSize: "0.625rem",
                      height: 18,
                      background: `${colors.primaryLight}20`,
                      color: colors.primaryLight,
                    }}
                  />
                )}
              </Box>
              {(link.document_type_name ||
                link.document_type_code ||
                link.document_created_at) && (
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  {(link.document_type_name || link.document_type_code) && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
                    >
                      {link.document_type_name || link.document_type_code}
                    </Typography>
                  )}
                  {link.document_created_at && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {t("sessions.vaskiCreated")}: {link.document_created_at}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderSectionRollCall = (section: Section) => {
    const loading = loadingRollCalls.has(section.id);
    const rollCallData = sectionRollCalls[section.id];

    if (!loading && !rollCallData && !isRollCallSection(section)) return null;

    if (loading) {
      return (
        <Box sx={{ mt: 1.5, py: 1, textAlign: "center" }}>
          <CircularProgress size={18} sx={{ color: themedColors.primary }} />
        </Box>
      );
    }

    if (!rollCallData) return null;

    const { report, entries } = rollCallData;
    const documentIdentifier = report.edk_identifier || report.parliament_identifier;
    const documentUrl = `https://www.parliament.fi/valtiopaivaasiakirjat/${encodeURIComponent(documentIdentifier)}`;

    const formatEntryType = (entryType: RollCallEntry["entry_type"]) =>
      entryType === "late"
        ? t("sessions.rollCallLate", { defaultValue: "Myöhässä" })
        : t("sessions.rollCallAbsent", { defaultValue: "Poissaolijat" });

    const formatAbsenceReason = (reasonCode?: string | null) => {
      if (!reasonCode) return "-";
      const code = reasonCode.toLowerCase();
      if (code === "e") {
        return t("sessions.rollCallReasonE", {
          defaultValue: "eduskuntatyöhön liittyvä tehtävä",
        });
      }
      if (code === "h") {
        return t("sessions.rollCallReasonH", {
          defaultValue: "henkilökohtainen syy",
        });
      }
      return t("sessions.rollCallReasonUnknown", { defaultValue: "selite puuttuu" });
    };

    const unknownReasonCodes = Array.from(
      new Set(
        entries
          .map((entry) => entry.absence_reason?.toLowerCase())
          .filter((code): code is string => !!code && !["e", "h"].includes(code)),
      ),
    );

    return (
      <Box
        sx={{
          mt: 1.5,
          p: 1.5,
          borderRadius: 1,
          border: `1px solid ${colors.primaryLight}25`,
          background: `${colors.primaryLight}08`,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: colors.textSecondary,
            textTransform: "uppercase",
          }}
        >
          {t("sessions.rollCallReport")}
        </Typography>
        {report.title && (
          <Typography
            sx={{ fontSize: "0.8125rem", fontWeight: 600, color: colors.textPrimary }}
          >
            {report.title}
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}>
          <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>
            {t("sessions.rollCallDocument")}: {report.edk_identifier}
          </Typography>
          <Link
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            sx={{ fontSize: "0.75rem", fontWeight: 600, color: colors.primaryLight }}
          >
            {t("sessions.rollCallOpenDocument", {
              defaultValue: "Avaa valtiopäiväasiakirja",
            })}
          </Link>
          {report.roll_call_start_time && (
            <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>
              {t("sessions.rollCallStart")}: {formatTime(report.roll_call_start_time)}
            </Typography>
          )}
          {report.roll_call_end_time && (
            <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>
              {t("sessions.rollCallEnd")}: {formatTime(report.roll_call_end_time)}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.75 }}>
          <Chip
            label={`${t("sessions.rollCallAbsent")}: ${report.absent_count}`}
            size="small"
            sx={{
              fontSize: "0.6875rem",
              height: 20,
              background: `${themedColors.error}15`,
              color: themedColors.error,
            }}
          />
          <Chip
            label={`${t("sessions.rollCallLate")}: ${report.late_count}`}
            size="small"
            sx={{
              fontSize: "0.6875rem",
              height: 20,
              background: `${themedColors.warning}15`,
              color: themedColors.warning,
            }}
          />
        </Box>

        {entries.length === 0 && (
          <Typography sx={{ mt: 0.75, fontSize: "0.75rem", color: colors.textTertiary }}>
            {t("sessions.rollCallNoEntries")}
          </Typography>
        )}

        {entries.length > 0 && (
          <Box sx={{ mt: 1, overflowX: "auto" }}>
            <Box
              component="table"
              sx={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.75rem",
                "& th, & td": {
                  textAlign: "left",
                  borderBottom: `1px solid ${colors.dataBorder}`,
                  px: 0.75,
                  py: 0.5,
                  verticalAlign: "top",
                },
                "& th": {
                  color: colors.textSecondary,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                },
                "& td": {
                  color: colors.textPrimary,
                },
              }}
            >
              <thead>
                <tr>
                  <th>{t("sessions.rollCallTableNumber", { defaultValue: "#" })}</th>
                  <th>{t("sessions.rollCallTableName", { defaultValue: "Nimi" })}</th>
                  <th>{t("sessions.rollCallTableParty", { defaultValue: "Puolue" })}</th>
                  <th>{t("sessions.rollCallTableType", { defaultValue: "Merkintä" })}</th>
                  <th>{t("sessions.rollCallTableCode", { defaultValue: "Koodi" })}</th>
                  <th>{t("sessions.rollCallTableReason", { defaultValue: "Selite" })}</th>
                  <th>{t("sessions.rollCallTableArrival", { defaultValue: "Saapumisaika" })}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.roll_call_id}-${entry.entry_order}`}>
                    <td>{entry.entry_order}</td>
                    <td>{entry.first_name} {entry.last_name}</td>
                    <td>{entry.party ? entry.party.toUpperCase() : "-"}</td>
                    <td>{formatEntryType(entry.entry_type)}</td>
                    <td>{entry.absence_reason ? `(${entry.absence_reason})` : "-"}</td>
                    <td>{formatAbsenceReason(entry.absence_reason)}</td>
                    <td>{entry.arrival_time || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
        )}

        <Box
          sx={{
            mt: 1,
            p: 1,
            borderRadius: 1,
            background: colors.backgroundDefault,
            border: `1px solid ${colors.dataBorder}`,
          }}
        >
          <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>
            {t("sessions.rollCallReasonLegend", { defaultValue: "Koodiselitteet" })}
            :{" "}
            <strong>(e)</strong>{" "}
            {t("sessions.rollCallReasonE", {
              defaultValue: "eduskuntatyöhön liittyvä tehtävä",
            })}
            ; <strong>(h)</strong>{" "}
            {t("sessions.rollCallReasonH", {
              defaultValue: "henkilökohtainen syy",
            })}
          </Typography>
          {unknownReasonCodes.length > 0 && (
            <Typography sx={{ mt: 0.5, fontSize: "0.75rem", color: colors.textTertiary }}>
              {t("sessions.rollCallUnknownCodes", {
                defaultValue: "Muut datassa olevat koodit ilman selitettä",
              })}
              : {unknownReasonCodes.map((code) => `(${code})`).join(", ")}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderSectionVotings = (votings: Voting[], session: SessionWithSections) => {
    if (votings.length === 0) return null;

    return (
      <Box
        sx={{
          mt: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: colors.textSecondary,
            textTransform: "uppercase",
          }}
        >
          {t("sessions.votings")} ({votings.length})
        </Typography>
        {votings.map((voting) => {
          const isPassed = voting.n_yes > voting.n_no;
          const isExpanded = expandedVotingIds.has(voting.id);
          const details = votingDetailsById[voting.id];
          const detailsLoading = loadingVotingDetails.has(voting.id);
          return (
            <Box
              key={voting.id}
              sx={{
                p: 1.25,
                borderRadius: 1,
                border: `1px solid ${isPassed ? `${themedColors.success}40` : `${themedColors.error}40`}`,
                background: isPassed
                  ? `${themedColors.success}08`
                  : `${themedColors.error}08`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 0.75,
                  flexWrap: "wrap",
                }}
              >
                <HowToVoteIcon
                  sx={{
                    fontSize: 16,
                    color: isPassed
                      ? themedColors.success
                      : themedColors.error,
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                    flex: 1,
                    minWidth: 0,
                    color: colors.textPrimary,
                  }}
                >
                  {voting.title}
                </Typography>
                <Button
                  size="small"
                  onClick={() => toggleVotingDetails(voting.id)}
                  sx={{ textTransform: "none", fontSize: "0.7rem", minWidth: 0, px: 1 }}
                  endIcon={
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 14,
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  }
                >
                  {isExpanded ? "Piilota tiedot" : "Näytä tiedot"}
                </Button>
                <Button
                  size="small"
                  sx={{ textTransform: "none", fontSize: "0.7rem", minWidth: 0, px: 1 }}
                  endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                  href={refs.voting(voting.id, session.key, session.date)}
                >
                  Avaa näkymä
                </Button>
              </Box>
              <VoteMarginBar
                yes={voting.n_yes}
                no={voting.n_no}
                empty={voting.n_abstain}
                absent={voting.n_absent}
                height={8}
              />
              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <Box
                  sx={{
                    mt: 0.75,
                    p: 1,
                    borderRadius: 1,
                    border: `1px solid ${colors.dataBorder}60`,
                    backgroundColor: `${colors.primaryLight}04`,
                  }}
                >
                  {detailsLoading && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={12} />
                      <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
                        Ladataan äänestyksen yksityiskohtia...
                      </Typography>
                    </Box>
                  )}
                  {!detailsLoading && details && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        <Chip
                          size="small"
                          label={`Jaa ${details.voting.n_yes}`}
                          sx={{ height: 20, color: colors.success, borderColor: colors.success }}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`Ei ${details.voting.n_no}`}
                          sx={{ height: 20, color: colors.error, borderColor: colors.error }}
                          variant="outlined"
                        />
                        <Chip size="small" label={`Tyhjää ${details.voting.n_abstain}`} sx={{ height: 20 }} />
                        <Chip size="small" label={`Poissa ${details.voting.n_absent}`} sx={{ height: 20 }} />
                      </Box>
                      {details.governmentOpposition && (
                        <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
                          Hallitus: {details.governmentOpposition.government_yes} jaa / {details.governmentOpposition.government_no} ei, Oppositio: {details.governmentOpposition.opposition_yes} jaa / {details.governmentOpposition.opposition_no} ei
                        </Typography>
                      )}
                      <VotingResultsTable
                        partyBreakdown={details.partyBreakdown}
                        memberVotes={details.memberVotes}
                      />
                      {details.relatedVotings.length > 0 && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {details.relatedVotings.slice(0, 6).map((related) => (
                            <Chip
                              key={related.id}
                              size="small"
                              variant="outlined"
                              label={`${related.id}: ${related.n_yes}-${related.n_no}`}
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          ))}
                          {details.relatedVotings.length > 6 && (
                            <Typography sx={{ fontSize: "0.65rem", color: colors.textSecondary }}>
                              +{details.relatedVotings.length - 6} muuta
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <Box>
      <PageHeader title={t("home.title")} subtitle={t("home.subtitle")} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ─── Parliament Composition ─── */}
      {loadingComposition ? (
        <Box sx={{ ...commonStyles.centeredFlex, py: 4 }}>
          <CircularProgress size={28} sx={{ color: themedColors.primary }} />
        </Box>
      ) : (
        stats.totalMembers > 0 && (
          <Box sx={{ mb: 4 }}>
            {/* Summary row */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
              <Grid size={{ xs: 4 }}>
                <MetricCard
                  label={t("home.totalMPs")}
                  value={stats.totalMembers}
                  icon={<GroupsIcon fontSize="small" />}
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <MetricCard
                  label={t("home.government")}
                  value={stats.inGovernment}
                  icon={<AccountBalanceIcon fontSize="small" />}
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <MetricCard
                  label={t("home.opposition")}
                  value={stats.inOpposition}
                  icon={<PieChartIcon fontSize="small" />}
                />
              </Grid>
            </Grid>

            {/* Party breakdown */}
            <DataCard sx={{ p: 0, overflow: "hidden" }}>
              <Box
                sx={{ p: 2.5, borderBottom: `1px solid ${colors.dataBorder}` }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: colors.textPrimary,
                    fontSize: "1rem",
                  }}
                >
                  {t("home.partyBreakdown")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0 }}>
                {stats.partyGroups.map(([party, data]) => (
                  <Box
                    key={party}
                    sx={{
                      flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 1px)" },
                      p: 2,
                      borderBottom: `1px solid ${colors.dataBorder}`,
                      borderRight: { sm: `1px solid ${colors.dataBorder}` },
                      "&:nth-of-type(2n)": { borderRight: { sm: "none" } },
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          color: colors.textPrimary,
                        }}
                      >
                        {party}
                      </Typography>
                      {data.inGovernment > 0 ? (
                        <Chip
                          label={t("home.governmentChip")}
                          size="small"
                          sx={{
                            fontSize: "0.625rem",
                            height: 18,
                            background: `${themedColors.success}20`,
                            color: themedColors.success,
                            fontWeight: 600,
                          }}
                        />
                      ) : (
                        <Chip
                          label={t("home.oppositionChip")}
                          size="small"
                          sx={{
                            fontSize: "0.625rem",
                            height: 18,
                            background: `${themedColors.warning}20`,
                            color: themedColors.warning,
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                    <Chip
                      label={`${data.total} ${t("home.seats")}`}
                      size="small"
                      sx={{
                        background: colors.primaryLight,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </DataCard>
          </Box>
        )
      )}

      {/* ─── Latest Session ─── */}
      <DataCard sx={{ p: 0, overflow: "hidden" }}>
        <Box sx={{ p: 2.5, borderBottom: `1px solid ${colors.dataBorder}` }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
            <EventIcon sx={{ fontSize: 20, color: colors.primaryLight }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: colors.textPrimary,
                fontSize: "1rem",
              }}
            >
              {t("home.latestCompletedSession")}
            </Typography>
          </Box>
          {latestDate && (
            <Typography
              sx={{ fontSize: "0.8125rem", color: colors.textSecondary }}
            >
              {formatDate(latestDate)}
            </Typography>
          )}
        </Box>

        {loadingSessions ? (
          <Box sx={{ ...commonStyles.centeredFlex, py: 4 }}>
            <CircularProgress size={24} sx={{ color: themedColors.primary }} />
          </Box>
        ) : sessions.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography sx={{ color: colors.textSecondary }}>
              {t("home.noData")}
            </Typography>
          </Box>
        ) : (
          sessions.map((session) => (
            <Box key={session.id}>
              {/* Session header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${colors.dataBorder}`,
                  background: colors.backgroundSubtle,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Link
                  href={refs.session(session.key, session.date)}
                  underline="hover"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                    color: colors.textPrimary,
                  }}
                >
                  {session.key}
                </Link>
                <Box
                  sx={{
                    flex: "1 1 100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  {session.agenda_title && (
                    <Typography
                      sx={{
                        fontSize: "0.8125rem",
                        color: colors.textSecondary,
                      }}
                    >
                      {session.agenda_title}
                    </Typography>
                  )}
                  {session.description && (
                    <Typography
                      sx={{ fontSize: "0.75rem", color: colors.textTertiary }}
                    >
                      {session.description}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Session summary */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${colors.dataBorder}`,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  alignItems: "center",
                  background: "#fff",
                }}
              >
                {session.section_count > 0 && (
                  <Chip
                    label={`${session.section_count} ${t("home.sections")}`}
                    size="small"
                    sx={{
                      fontSize: "0.6875rem",
                      height: 22,
                      background: `${colors.primaryLight}20`,
                      color: colors.primaryLight,
                    }}
                  />
                )}
                {session.voting_count > 0 && (
                  <Chip
                    icon={<HowToVoteIcon sx={{ fontSize: 14 }} />}
                    label={`${session.voting_count} ${t("home.votings")}`}
                    size="small"
                    sx={{
                      fontSize: "0.6875rem",
                      height: 22,
                      background: `${themedColors.success}15`,
                      color: themedColors.success,
                    }}
                  />
                )}
                {session.agenda_state && (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: colors.textSecondary }}
                  >
                    {t("sessions.agendaState")}: {session.agenda_state}
                  </Typography>
                )}
              </Box>

              {renderSessionNotices(session)}
              {renderSessionMinutesOutline(session)}
              {renderSessionAttachments(session)}

              {vaskiLatestSpeechDate &&
                new Date(session.date).getTime() >
                  new Date(vaskiLatestSpeechDate).getTime() && (
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: `1px solid ${colors.dataBorder}`,
                    }}
                  >
                    <Alert severity="info" sx={{ alignItems: "center" }}>
                      <Typography sx={{ fontSize: "0.8125rem" }}>
                        {t("sessions.speechContentPending")}
                      </Typography>
                      <Typography sx={{ fontSize: "0.8125rem" }}>
                        {t("sessions.speechContentLatest", {
                          date: formatDate(vaskiLatestSpeechDate),
                          defaultValue: "",
                        })}
                      </Typography>
                    </Alert>
                  </Box>
                )}

              {/* Sections list */}
              {session.sections?.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const speechData = sectionSpeechData[section.id];
                const speeches = speechData?.speeches || [];
                const hasSpeechContent = speeches.some(
                  (speech) => speech.content,
                );
                const votings = sectionVotings[section.id] || [];

                return (
                  <Box
                    key={section.id}
                    id={`session-section-${section.key}`}
                    sx={{ borderBottom: `1px solid ${colors.dataBorder}` }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                        "&:hover": { background: colors.backgroundSubtle },
                        transition: "background 0.15s",
                      }}
                      onClick={() => toggleSection(section.id, section.key)}
                    >
                      <Chip
                        label={getSectionOrderLabel(section)}
                        size="small"
                        sx={{
                          background: colors.primary,
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          height: 22,
                          minWidth: 28,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: colors.textPrimary,
                            wordBreak: "break-word",
                          }}
                        >
                          {section.title ||
                            section.processing_title ||
                            t("sessions.noTitle")}
                        </Typography>
                        {section.minutes_item_order != null && (
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              color: colors.textTertiary,
                            }}
                          >
                            {t("sessions.minutesOrder", {
                              defaultValue: "järjestys",
                            })}{" "}
                            {section.minutes_item_order}
                          </Typography>
                        )}
                        {section.note && (
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              color: colors.textSecondary,
                            }}
                          >
                            {section.note}
                          </Typography>
                        )}
                        {section.processing_title &&
                          section.processing_title !== section.title && (
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                color: colors.textTertiary,
                              }}
                            >
                              {t("sessions.processing")}:{" "}
                              {section.processing_title}
                            </Typography>
                          )}
                        {section.resolution && (
                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              color: colors.textTertiary,
                            }}
                          >
                            {t("sessions.resolution")}: {section.resolution}
                          </Typography>
                        )}
                        {renderVaskiInfo(section, true)}
                        {renderMinutesInfo(section, true)}
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                            mt: 0.75,
                          }}
                        >
                          <Chip
                            label={`${t("sessions.votings")}: ${section.voting_count ?? 0}`}
                            size="small"
                            sx={{
                              fontSize: "0.6875rem",
                              height: 20,
                              background: `${themedColors.success}15`,
                              color: themedColors.success,
                            }}
                          />
                          <Chip
                            label={`${t("sessions.speeches")}: ${section.speech_count ?? 0}`}
                            size="small"
                            sx={{
                              fontSize: "0.6875rem",
                              height: 20,
                              background: `${colors.primaryLight}20`,
                              color: colors.primaryLight,
                            }}
                          />
                          <Chip
                            label={`${t("sessions.speakers")}: ${section.speaker_count ?? 0}`}
                            size="small"
                            sx={{ fontSize: "0.6875rem", height: 20 }}
                          />
                          <Chip
                            label={`${t("sessions.parties")}: ${section.party_count ?? 0}`}
                            size="small"
                            sx={{ fontSize: "0.6875rem", height: 20 }}
                          />
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        sx={{ color: colors.primaryLight, flexShrink: 0 }}
                      >
                        {isExpanded ? (
                          <KeyboardArrowUpIcon />
                        ) : (
                          <KeyboardArrowDownIcon />
                        )}
                      </IconButton>
                    </Box>

                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box
                        sx={{
                          px: 2,
                          pb: 2,
                          borderTop: `1px solid ${colors.dataBorder}`,
                        }}
                      >
                        {renderVaskiInfo(section, false)}
                        {renderMinutesInfo(section, false)}
                        {renderSectionSubSections(section)}
                        {renderSectionMinutesContent(section)}
                        {(() => {
                          const docRefs = extractSectionDocRefs(section);
                          return (
                            <>
                              {docRefs.map((ref) => (
                                <DocumentCard key={ref.identifier} docRef={ref} />
                              ))}
                              {docRefs.length > 0 && section.voting_count === 0 && (
                                <RelatedVotings identifiers={docRefs.map((r) => r.identifier)} />
                              )}
                            </>
                          );
                        })()}
                        {renderSectionLinks(section)}
                        {renderSectionNotices(session, section.key)}
                        {renderSectionRollCall(section)}

                        {/* Votings */}
                        {loadingVotings.has(section.id) ? (
                          <Box sx={{ py: 2, textAlign: "center" }}>
                            <CircularProgress
                              size={20}
                              sx={{ color: themedColors.primary }}
                            />
                          </Box>
                        ) : (
                          renderSectionVotings(votings, session)
                        )}

                        {/* Speeches */}
                        {loadingSpeeches.has(section.id) ? (
                          <Box sx={{ py: 2, textAlign: "center" }}>
                            <CircularProgress
                              size={20}
                              sx={{ color: themedColors.primary }}
                            />
                          </Box>
                        ) : speeches.length > 0 ? (
                          <Box
                            sx={{
                              mt: 1.5,
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.75,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: colors.textSecondary,
                                textTransform: "uppercase",
                              }}
                            >
                              {t("sessions.speeches")} (
                              {speechData?.total ?? speeches.length})
                            </Typography>
                            {!hasSpeechContent && (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: colors.textTertiary,
                                }}
                              >
                                {t("sessions.speechContentPending")}
                              </Typography>
                            )}
                            {!hasSpeechContent && vaskiLatestSpeechDate && (
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  color: colors.textTertiary,
                                }}
                              >
                                {t("sessions.speechContentLatest", {
                                  date: formatDate(vaskiLatestSpeechDate),
                                  defaultValue: "",
                                })}
                              </Typography>
                            )}
                            {speeches.map((speech) => {
                              const speechTime = formatSpeechTimeRange(speech);
                              return (
                                <Box
                                  key={speech.id}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: 1,
                                    background: colors.backgroundSubtle,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      mb: speech.content ? 1 : 0,
                                    }}
                                  >
                                    <Chip
                                      label={
                                        speech.ordinal_number ?? speech.ordinal
                                      }
                                      size="small"
                                      sx={{
                                        background: `${colors.primaryLight}30`,
                                        color: colors.primaryLight,
                                        fontWeight: 600,
                                        fontSize: "0.625rem",
                                        height: 18,
                                        minWidth: 24,
                                      }}
                                    />
                                    <Typography
                                      sx={{
                                        fontWeight: 600,
                                        fontSize: "0.8125rem",
                                        flex: 1,
                                      }}
                                    >
                                      {speech.first_name} {speech.last_name}
                                    </Typography>
                                    {speech.party_abbreviation && (
                                      <Chip
                                        label={speech.party_abbreviation}
                                        size="small"
                                        sx={{ fontSize: "0.625rem", height: 18 }}
                                      />
                                    )}
                                    {speech.speech_type && (
                                      <Typography
                                        sx={{
                                          fontSize: "0.6875rem",
                                          color: colors.textTertiary,
                                        }}
                                      >
                                        {speech.speech_type}
                                      </Typography>
                                    )}
                                    {speechTime && (
                                      <Typography
                                        sx={{
                                          fontSize: "0.6875rem",
                                          color: colors.textTertiary,
                                        }}
                                      >
                                        {speechTime}
                                      </Typography>
                                    )}
                                  </Box>
                                  {speech.content && (
                                    <Box
                                      sx={{
                                        p: 1.5,
                                        borderRadius: 1,
                                        borderLeft: `3px solid ${colors.primaryLight}`,
                                        background: colors.backgroundDefault,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: "0.8125rem",
                                          color: colors.textPrimary,
                                          whiteSpace: "pre-wrap",
                                          lineHeight: 1.6,
                                        }}
                                      >
                                        {speech.content}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              );
                            })}
                            {/* Load more button */}
                            {speechData &&
                              speechData.page < speechData.totalPages && (
                                <Box sx={{ textAlign: "center", mt: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void loadMoreSpeeches(
                                        section.id,
                                        section.key,
                                      );
                                    }}
                                    disabled={loadingMoreSpeeches.has(
                                      section.id,
                                    )}
                                    sx={{
                                      textTransform: "none",
                                      borderColor: colors.primaryLight,
                                      color: colors.primaryLight,
                                      fontSize: "0.8125rem",
                                    }}
                                  >
                                    {loadingMoreSpeeches.has(section.id) ? (
                                      <CircularProgress
                                        size={16}
                                        sx={{ mr: 1 }}
                                      />
                                    ) : null}
                                    {t("sessions.loadMore")} (
                                    {speeches.length}/{speechData.total})
                                  </Button>
                                </Box>
                              )}
                          </Box>
                        ) : null}

                        {!loadingSpeeches.has(section.id) &&
                          !loadingVotings.has(section.id) &&
                          speeches.length === 0 &&
                          votings.length === 0 && (
                            <Typography
                              sx={{
                                py: 2,
                                textAlign: "center",
                                fontSize: "0.8125rem",
                                color: colors.textTertiary,
                              }}
                            >
                              {t("sessions.noSpeeches")}
                            </Typography>
                          )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          ))
        )}
      </DataCard>
    </Box>
  );
};

export default Home;
