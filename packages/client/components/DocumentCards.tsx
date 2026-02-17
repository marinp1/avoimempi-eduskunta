import HowToVoteIcon from "@mui/icons-material/HowToVote";
import { Box, Chip, CircularProgress, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { colors } from "#client/theme/index";

export type DocRef = { type: "HE" | "VK" | "KK" | "VM"; identifier: string };

const DOC_PATTERN = /\b(HE|VK|KK|[A-ZÄÖa-zäö]+VM)\s+\d+\/\d+\s*(?:vp)?/g;

export const extractDocumentIdentifiers = (
  fields: (string | null | undefined)[],
): DocRef[] => {
  const seen = new Set<string>();
  const results: DocRef[] = [];
  for (const field of fields) {
    if (!field) continue;
    for (const match of field.matchAll(DOC_PATTERN)) {
      const id = match[0].trim();
      if (!seen.has(id)) {
        seen.add(id);
        const rawType = match[1];
        const type: DocRef["type"] = rawType.endsWith("VM") ? "VM" : rawType as DocRef["type"];
        results.push({ type, identifier: id });
      }
    }
  }
  return results;
};

const getDecisionColor = (outcomeCode: string | null | undefined): string => {
  if (!outcomeCode) return colors.textSecondary;
  const normalized = outcomeCode.toLowerCase();
  if (normalized.includes("hyväk") || normalized.includes("passed"))
    return colors.success;
  if (normalized.includes("hylä") || normalized.includes("reject"))
    return colors.error;
  return colors.textSecondary;
};

const cardSx = {
  p: 1.5,
  mt: 1,
  borderRadius: 1,
  border: `1px solid ${colors.primaryLight}30`,
  background: `${colors.primaryLight}06`,
  cursor: "pointer",
  "&:hover": { background: `${colors.primaryLight}12` },
};

const loadingSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  p: 1,
  mt: 1,
  borderRadius: 1,
  border: `1px solid ${colors.primaryLight}30`,
  background: `${colors.primaryLight}08`,
};

const identifierChipSx = {
  height: 20,
  fontSize: "0.7rem",
  fontWeight: 600,
  bgcolor: `${colors.primary}15`,
  color: colors.primary,
};

const titleSx = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: colors.textPrimary,
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const subjectChipSx = {
  height: 18,
  fontSize: "0.6rem",
  borderColor: `${colors.dataBorder}`,
};

function useFetchByIdentifier<T>(apiPath: string, identifier: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${apiPath}/${encodeURIComponent(identifier)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [identifier, apiPath]);

  return { data, loading };
}

type DocCardData = {
  id: number;
  parliament_identifier: string;
  title: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  subjects: { subject_text: string }[];
};

type WithSigner = DocCardData & {
  first_signer_first_name: string | null;
  first_signer_last_name: string | null;
  first_signer_party: string | null;
};

type WithAuthor = DocCardData & {
  author: string | null;
};

const renderSubjectChips = (subjects: { subject_text: string }[] | undefined) => {
  const chips = subjects?.slice(0, 3) ?? [];
  const more = (subjects?.length ?? 0) - 3;
  if (chips.length === 0) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
      {chips.map((s) => (
        <Chip
          key={s.subject_text}
          label={s.subject_text}
          size="small"
          variant="outlined"
          sx={subjectChipSx}
        />
      ))}
      {more > 0 && (
        <Typography sx={{ fontSize: "0.6rem", color: colors.textSecondary }}>
          +{more}
        </Typography>
      )}
    </Box>
  );
};

const LoadingPlaceholder: React.FC<{ text: string }> = ({ text }) => (
  <Box sx={loadingSx}>
    <CircularProgress size={14} />
    <Typography sx={{ fontSize: "0.75rem", color: colors.textSecondary }}>
      {text}
    </Typography>
  </Box>
);

export const GovernmentProposalCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { data, loading } = useFetchByIdentifier<WithAuthor>(
    "/api/government-proposals/by-identifier",
    identifier,
  );

  if (loading) return <LoadingPlaceholder text="Ladataan hallituksen esityksen tietoja..." />;
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);

  return (
    <Box
      sx={cardSx}
      onClick={() => {
        window.location.href = `/asiakirjat?id=${data.id}&type=government-proposals`;
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Chip label={data.parliament_identifier} size="small" sx={identifierChipSx} />
        <Typography sx={titleSx}>{data.title || "Ei otsikkoa"}</Typography>
        {data.decision_outcome && (
          <Chip
            label={data.decision_outcome}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              fontWeight: 600,
              bgcolor: `${decisionColor}15`,
              color: decisionColor,
            }}
          />
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
        {data.author && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {data.author}
          </Typography>
        )}
      </Box>
      {renderSubjectChips(data.subjects)}
    </Box>
  );
};

export const InterpellationCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { data, loading } = useFetchByIdentifier<WithSigner>(
    "/api/interpellations/by-identifier",
    identifier,
  );

  if (loading) return <LoadingPlaceholder text="Ladataan välikysymystietoja..." />;
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);
  const signerName = [data.first_signer_first_name, data.first_signer_last_name]
    .filter(Boolean)
    .join(" ");
  const signerLabel = data.first_signer_party
    ? `${signerName} (${data.first_signer_party})`
    : signerName;

  return (
    <Box
      sx={cardSx}
      onClick={() => {
        window.location.href = `/asiakirjat?id=${data.id}`;
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Chip label={data.parliament_identifier} size="small" sx={identifierChipSx} />
        <Typography sx={titleSx}>{data.title || "Ei otsikkoa"}</Typography>
        {data.decision_outcome && (
          <Chip
            label={data.decision_outcome}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              fontWeight: 600,
              bgcolor: `${decisionColor}15`,
              color: decisionColor,
            }}
          />
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
        {signerLabel && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {signerLabel}
          </Typography>
        )}
      </Box>
      {renderSubjectChips(data.subjects)}
    </Box>
  );
};

export const WrittenQuestionCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { data, loading } = useFetchByIdentifier<
    WithSigner & {
      answer_minister_title: string | null;
      answer_minister_first_name: string | null;
      answer_minister_last_name: string | null;
    }
  >("/api/written-questions/by-identifier", identifier);

  if (loading) return <LoadingPlaceholder text="Ladataan kirjallisen kysymyksen tietoja..." />;
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);
  const signerName = [data.first_signer_first_name, data.first_signer_last_name]
    .filter(Boolean)
    .join(" ");
  const signerLabel = data.first_signer_party
    ? `${signerName} (${data.first_signer_party})`
    : signerName;

  return (
    <Box
      sx={cardSx}
      onClick={() => {
        window.location.href = `/asiakirjat?id=${data.id}&type=written-questions`;
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Chip label={data.parliament_identifier} size="small" sx={identifierChipSx} />
        <Typography sx={titleSx}>{data.title || "Ei otsikkoa"}</Typography>
        {data.decision_outcome && (
          <Chip
            label={data.decision_outcome}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.65rem",
              fontWeight: 600,
              bgcolor: `${decisionColor}15`,
              color: decisionColor,
            }}
          />
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
        {signerLabel && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {signerLabel}
          </Typography>
        )}
      </Box>
      {renderSubjectChips(data.subjects)}
    </Box>
  );
};

export const CommitteeReportCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { data, loading } = useFetchByIdentifier<{
    id: number;
    parliament_identifier: string;
    report_type_code: string;
    title: string | null;
    committee_name: string | null;
    recipient_committee: string | null;
    source_reference: string | null;
  }>("/api/committee-reports/by-identifier", identifier);

  if (loading) return <LoadingPlaceholder text="Ladataan valiokunnan mietinnön tietoja..." />;
  if (!data) return null;

  return (
    <Box
      sx={cardSx}
      onClick={() => {
        window.location.href = `/asiakirjat?id=${data.id}&type=committee-reports`;
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Chip label={data.parliament_identifier} size="small" sx={identifierChipSx} />
        <Chip
          label={data.report_type_code}
          size="small"
          variant="outlined"
          sx={subjectChipSx}
        />
        <Typography sx={titleSx}>{data.title || "Ei otsikkoa"}</Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
        {data.committee_name && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {data.committee_name}
          </Typography>
        )}
        {data.recipient_committee && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {data.recipient_committee}
          </Typography>
        )}
        {data.source_reference && (
          <Chip
            label={data.source_reference}
            size="small"
            variant="outlined"
            sx={subjectChipSx}
          />
        )}
      </Box>
    </Box>
  );
};

export const DocumentCard: React.FC<{ docRef: DocRef }> = ({ docRef }) => {
  switch (docRef.type) {
    case "HE":
      return <GovernmentProposalCard identifier={docRef.identifier} />;
    case "VK":
      return <InterpellationCard identifier={docRef.identifier} />;
    case "KK":
      return <WrittenQuestionCard identifier={docRef.identifier} />;
    case "VM":
      return <CommitteeReportCard identifier={docRef.identifier} />;
  }
};

export const RelatedVotings: React.FC<{ identifiers: string[] }> = ({
  identifiers,
}) => {
  const [votings, setVotings] = useState<
    {
      id: number;
      section_title: string | null;
      context_title: string | null;
      start_time: string | null;
      session_key: string | null;
      n_yes: number;
      n_no: number;
      n_total: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const refKey = identifiers.join(",");

  useEffect(() => {
    if (identifiers.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all(
      identifiers.map((id) =>
        fetch(`/api/votings/by-document/${encodeURIComponent(id)}`)
          .then((res) => (res.ok ? res.json() : []))
          .catch(() => []),
      ),
    ).then((results) => {
      if (cancelled) return;
      const seen = new Set<number>();
      const merged: typeof votings = [];
      for (const list of results) {
        for (const v of list) {
          if (!seen.has(v.id)) {
            seen.add(v.id);
            merged.push(v);
          }
        }
      }
      setVotings(merged);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [refKey]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, mt: 0.5 }}>
        <CircularProgress size={14} />
        <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
          Ladataan äänestyksiä...
        </Typography>
      </Box>
    );
  }

  if (votings.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        <HowToVoteIcon sx={{ fontSize: 16, color: colors.primary }} />
        <Typography
          sx={{ fontSize: "0.75rem", fontWeight: 600, color: colors.textPrimary }}
        >
          Liittyvät äänestykset
        </Typography>
      </Box>
      {votings.map((v) => {
        const passed = v.n_yes > v.n_no;
        const yesRatio = v.n_total > 0 ? (v.n_yes / v.n_total) * 100 : 0;
        const noRatio = v.n_total > 0 ? (v.n_no / v.n_total) * 100 : 0;
        return (
          <Box
            key={v.id}
            sx={{
              pl: 1.5,
              py: 0.5,
              borderLeft: `3px solid ${passed ? colors.success : colors.error}`,
              cursor: "pointer",
              "&:hover": { backgroundColor: `${colors.primaryLight}08` },
              borderRadius: 1,
              mb: 0.5,
            }}
            onClick={() => {
              window.history.pushState({}, "", `/aanestykset?voting=${v.id}`);
              window.dispatchEvent(new PopStateEvent("popstate"));
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
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: colors.textPrimary,
                  flex: 1,
                  minWidth: 100,
                }}
              >
                {v.context_title || v.section_title}
              </Typography>
              <Chip
                size="small"
                label={`${v.n_yes} - ${v.n_no}`}
                sx={{
                  fontWeight: 600,
                  fontSize: "0.65rem",
                  height: 20,
                  color: passed ? colors.success : colors.error,
                  borderColor: passed ? colors.success : colors.error,
                }}
                variant="outlined"
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
              <Typography sx={{ fontSize: "0.65rem", color: colors.textSecondary }}>
                {v.start_time?.substring(0, 10)} — {v.session_key}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  maxWidth: 100,
                  height: 3,
                  borderRadius: 2,
                  overflow: "hidden",
                  display: "flex",
                  backgroundColor: `${colors.dataBorder}40`,
                }}
              >
                <Box
                  sx={{
                    width: `${yesRatio}%`,
                    backgroundColor: colors.success,
                    height: "100%",
                  }}
                />
                <Box
                  sx={{
                    width: `${noRatio}%`,
                    backgroundColor: colors.error,
                    height: "100%",
                  }}
                />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
