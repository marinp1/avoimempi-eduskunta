import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { colors } from "#client/theme/index";

export type DocRef = {
  type:
    | "HE"
    | "VK"
    | "KK"
    | "VM"
    | "LA"
    | "TAA"
    | "LTA"
    | "TPA"
    | "KA"
    | "KAA"
    | "SKT";
  identifier: string;
};

const DOC_PATTERN =
  /\b(HE|VK|KK|LA|TAA|LTA|TPA|KA|KAA|SKT|[A-ZÄÖa-zäö]+V[ML])\s+\d+\/\d+\s*(?:vp)?/g;

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
        const upperType = rawType.toUpperCase();
        const type: DocRef["type"] =
          upperType.endsWith("VM") || upperType.endsWith("VL")
            ? "VM"
            : (upperType as DocRef["type"]);
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

const snippetTextSx = {
  fontSize: "0.72rem",
  color: colors.textSecondary,
  mt: 0.5,
  lineHeight: 1.35,
};

const normalizeSnippet = (text: string | null | undefined) => {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned;
};

const ExpandableSnippet: React.FC<{
  label: string;
  text: string | null | undefined;
  maxLength?: number;
}> = ({ label, text, maxLength = 280 }) => {
  const { t } = useTranslation();
  const normalized = normalizeSnippet(text);
  const [expanded, setExpanded] = useState(false);

  if (!normalized) return null;
  const isLong = normalized.length > maxLength;
  const shownText =
    isLong && !expanded
      ? `${normalized.slice(0, maxLength).trimEnd()}...`
      : normalized;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography sx={snippetTextSx}>
        {label}: {shownText}
      </Typography>
      {isLong && (
        <Button
          size="small"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          sx={{
            mt: 0.25,
            minWidth: 0,
            px: 0,
            fontSize: "0.68rem",
            textTransform: "none",
            color: colors.primary,
          }}
        >
          {expanded ? t("common.showLess") : t("common.showMore")}
        </Button>
      )}
    </Box>
  );
};

const ExpandableRichSnippet: React.FC<{
  label: string;
  text: string | null | undefined;
  richText: string | null | undefined;
  maxLength?: number;
}> = ({ label, text, richText, maxLength = 280 }) => {
  const { t } = useTranslation();
  const normalized = normalizeSnippet(text);
  const [expanded, setExpanded] = useState(false);

  if (!normalized && !richText) return null;

  const isLong = normalized ? normalized.length > maxLength : false;
  const canExpand = isLong || !!richText;
  const shownText =
    isLong && !expanded && normalized
      ? `${normalized.slice(0, maxLength).trimEnd()}...`
      : normalized;

  return (
    <Box sx={{ mt: 0.5 }}>
      {!expanded && (
        <Typography sx={snippetTextSx}>
          {label}: {shownText}
        </Typography>
      )}
      {expanded && (
        <Box>
          <Typography sx={{ ...snippetTextSx, mt: 0 }}>{label}:</Typography>
          <Box sx={{ mt: 0.35 }}>
            <RichTextRenderer
              document={richText}
              fallbackText={normalized}
              paragraphVariant="body2"
              compact
            />
          </Box>
        </Box>
      )}
      {canExpand && (
        <Button
          size="small"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          sx={{
            mt: 0.25,
            minWidth: 0,
            px: 0,
            fontSize: "0.68rem",
            textTransform: "none",
            color: colors.primary,
          }}
        >
          {expanded ? t("common.showLess") : t("common.showMore")}
        </Button>
      )}
    </Box>
  );
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

const renderSubjectChips = (
  subjects: { subject_text: string }[] | undefined,
) => {
  const chips = subjects?.slice(0, 3) ?? [];
  const more = (subjects?.length ?? 0) - 3;
  if (chips.length === 0) return null;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mt: 0.5,
        flexWrap: "wrap",
      }}
    >
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
  const { t } = useTranslation();
  const { data, loading } = useFetchByIdentifier<
    WithAuthor & {
      summary_text: string | null;
      summary_rich_text: string | null;
      proposal_text: string | null;
      proposal_rich_text: string | null;
      justification_text: string | null;
      justification_rich_text: string | null;
    }
  >("/api/government-proposals/by-identifier", identifier);

  if (loading)
    return (
      <LoadingPlaceholder text={t("documents.loadingGovernmentProposal")} />
    );
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);

  return (
    <Box
      sx={cardSx}
      onClick={() => {
        window.location.href = `/asiakirjat?id=${data.id}&type=government-proposals`;
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Chip
          label={data.parliament_identifier}
          size="small"
          sx={identifierChipSx}
        />
        <Typography sx={titleSx}>
          {data.title || t("documents.noTitle")}
        </Typography>
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 0.5,
          flexWrap: "wrap",
        }}
      >
        {data.author && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {data.author}
          </Typography>
        )}
      </Box>
      <ExpandableRichSnippet
        label={t("documents.summary")}
        text={data.summary_text}
        richText={data.summary_rich_text}
        maxLength={280}
      />
      <ExpandableRichSnippet
        label={t("documents.proposalText")}
        text={data.proposal_text}
        richText={data.proposal_rich_text}
        maxLength={220}
      />
      <ExpandableRichSnippet
        label={t("documents.justificationText")}
        text={data.justification_text}
        richText={data.justification_rich_text}
        maxLength={220}
      />
      {renderSubjectChips(data.subjects)}
    </Box>
  );
};

export const InterpellationCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { t } = useTranslation();
  const { data, loading } = useFetchByIdentifier<
    WithSigner & {
      question_text: string | null;
      question_rich_text: string | null;
      resolution_text: string | null;
      resolution_rich_text: string | null;
      stages: {
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      }[];
    }
  >("/api/interpellations/by-identifier", identifier);

  if (loading)
    return <LoadingPlaceholder text={t("documents.loadingInterpellation")} />;
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);
  const signerName = [data.first_signer_first_name, data.first_signer_last_name]
    .filter(Boolean)
    .join(" ");
  const signerLabel = data.first_signer_party
    ? `${signerName} (${data.first_signer_party})`
    : signerName;
  const latestStage = data.stages?.[data.stages.length - 1];

  return (
    <Box
      sx={cardSx}
      onClick={() => {
        window.location.href = `/asiakirjat?id=${data.id}`;
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Chip
          label={data.parliament_identifier}
          size="small"
          sx={identifierChipSx}
        />
        <Typography sx={titleSx}>
          {data.title || t("documents.noTitle")}
        </Typography>
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 0.5,
          flexWrap: "wrap",
        }}
      >
        {signerLabel && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {signerLabel}
          </Typography>
        )}
      </Box>
      <ExpandableRichSnippet
        label={t("documents.question")}
        text={data.question_text}
        richText={data.question_rich_text}
        maxLength={280}
      />
      <ExpandableRichSnippet
        label={t("documents.committeeResolution")}
        text={data.resolution_text}
        richText={data.resolution_rich_text}
        maxLength={220}
      />
      {(latestStage?.event_title ||
        latestStage?.event_description ||
        latestStage?.event_date) && (
        <Box sx={{ mt: 0.5 }}>
          <Typography
            sx={{
              fontSize: "0.72rem",
              color: colors.textSecondary,
              fontWeight: 600,
            }}
          >
            {t("documents.answerProcessingStatus")}
          </Typography>
          {latestStage.event_date && (
            <Typography
              sx={{ fontSize: "0.7rem", color: colors.textSecondary }}
            >
              {new Date(latestStage.event_date).toLocaleDateString("fi-FI")}
            </Typography>
          )}
          {latestStage.event_title && (
            <Typography
              sx={{ fontSize: "0.72rem", color: colors.textSecondary }}
            >
              {latestStage.event_title}
            </Typography>
          )}
          {latestStage.event_description && (
            <ExpandableSnippet
              label={t("documents.additionalInfo")}
              text={latestStage.event_description}
              maxLength={220}
            />
          )}
        </Box>
      )}
      {renderSubjectChips(data.subjects)}
    </Box>
  );
};

export const LegislativeInitiativeCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { t } = useTranslation();
  const { data, loading } = useFetchByIdentifier<
    WithSigner & {
      initiative_type_code: string;
      justification_text: string | null;
      justification_rich_text: string | null;
      proposal_text: string | null;
      proposal_rich_text: string | null;
      law_text: string | null;
      law_rich_text: string | null;
    }
  >("/api/legislative-initiatives/by-identifier", identifier);

  if (loading)
    return (
      <LoadingPlaceholder text={t("documents.loadingLegislativeInitiative")} />
    );
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
        window.location.href = `/asiakirjat?id=${data.id}&type=legislative-initiatives`;
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Chip
          label={data.parliament_identifier}
          size="small"
          sx={identifierChipSx}
        />
        <Typography sx={titleSx}>
          {data.title || t("documents.noTitle")}
        </Typography>
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 0.5,
          flexWrap: "wrap",
        }}
      >
        <Chip
          label={data.initiative_type_code}
          size="small"
          variant="outlined"
          sx={subjectChipSx}
        />
        {signerLabel && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {signerLabel}
          </Typography>
        )}
      </Box>
      <ExpandableRichSnippet
        label={t("documents.justificationText")}
        text={data.justification_text}
        richText={data.justification_rich_text}
        maxLength={260}
      />
      <ExpandableRichSnippet
        label={t("documents.clausesText")}
        text={data.proposal_text}
        richText={data.proposal_rich_text}
        maxLength={220}
      />
      <ExpandableRichSnippet
        label={t("documents.proposalLaws")}
        text={data.law_text}
        richText={data.law_rich_text}
        maxLength={220}
      />
      {renderSubjectChips(data.subjects)}
    </Box>
  );
};

export const OralQuestionCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { t } = useTranslation();
  const { data, loading } = useFetchByIdentifier<
    DocCardData & {
      question_text: string | null;
      asker_text: string | null;
      latest_stage_code: string | null;
    }
  >("/api/oral-questions/by-identifier", identifier);

  if (loading)
    return <LoadingPlaceholder text={t("documents.loadingOralQuestion")} />;
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);

  return (
    <Box
      sx={cardSx}
      onClick={() => {
        window.location.href = `/asiakirjat?id=${data.id}&type=oral-questions`;
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Chip
          label={data.parliament_identifier}
          size="small"
          sx={identifierChipSx}
        />
        <Typography sx={titleSx}>
          {data.title || t("documents.noTitle")}
        </Typography>
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 0.5,
          flexWrap: "wrap",
        }}
      >
        {data.asker_text && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {data.asker_text}
          </Typography>
        )}
        {data.latest_stage_code && (
          <Chip
            label={data.latest_stage_code}
            size="small"
            variant="outlined"
            sx={subjectChipSx}
          />
        )}
      </Box>
      <ExpandableSnippet
        label={t("documents.question")}
        text={data.question_text}
        maxLength={260}
      />
      {renderSubjectChips(data.subjects)}
    </Box>
  );
};

export const WrittenQuestionCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { t } = useTranslation();
  const { data, loading } = useFetchByIdentifier<
    WithSigner & {
      answer_minister_title: string | null;
      answer_minister_first_name: string | null;
      answer_minister_last_name: string | null;
      question_text: string | null;
      question_rich_text: string | null;
    }
  >("/api/written-questions/by-identifier", identifier);

  if (loading)
    return <LoadingPlaceholder text={t("documents.loadingWrittenQuestion")} />;
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
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Chip
          label={data.parliament_identifier}
          size="small"
          sx={identifierChipSx}
        />
        <Typography sx={titleSx}>
          {data.title || t("documents.noTitle")}
        </Typography>
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
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 0.5,
          flexWrap: "wrap",
        }}
      >
        {signerLabel && (
          <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
            {signerLabel}
          </Typography>
        )}
      </Box>
      <ExpandableRichSnippet
        label={t("documents.question")}
        text={data.question_text}
        richText={data.question_rich_text}
        maxLength={280}
      />
      {renderSubjectChips(data.subjects)}
    </Box>
  );
};

export const CommitteeReportCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { t } = useTranslation();
  const { data, loading } = useFetchByIdentifier<{
    id: number;
    parliament_identifier: string;
    report_type_code: string;
    title: string | null;
    committee_name: string | null;
    recipient_committee: string | null;
    source_reference: string | null;
    summary_text: string | null;
    summary_rich_text: string | null;
    decision_text: string | null;
    decision_rich_text: string | null;
    resolution_text: string | null;
    resolution_rich_text: string | null;
    legislation_amendment_text: string | null;
    legislation_amendment_rich_text: string | null;
  }>("/api/committee-reports/by-identifier", identifier);

  if (loading)
    return <LoadingPlaceholder text={t("documents.loadingCommitteeReport")} />;
  if (!data) return null;

  return (
    <Box
      sx={cardSx}
      onClick={() => {
        window.location.href = `/asiakirjat?id=${data.id}&type=committee-reports`;
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
      >
        <Chip
          label={data.parliament_identifier}
          size="small"
          sx={identifierChipSx}
        />
        <Chip
          label={data.report_type_code}
          size="small"
          variant="outlined"
          sx={subjectChipSx}
        />
        <Typography sx={titleSx}>
          {data.title || t("documents.noTitle")}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 0.5,
          flexWrap: "wrap",
        }}
      >
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
      <ExpandableRichSnippet
        label={t("documents.summary")}
        text={data.summary_text}
        richText={data.summary_rich_text}
        maxLength={280}
      />
      <ExpandableRichSnippet
        label={t("documents.decisionProposal")}
        text={data.decision_text}
        richText={data.decision_rich_text}
        maxLength={220}
      />
      <ExpandableRichSnippet
        label={t("documents.committeeResolution")}
        text={data.resolution_text}
        richText={data.resolution_rich_text}
        maxLength={220}
      />
      <ExpandableRichSnippet
        label={t("documents.proposalLaws")}
        text={data.legislation_amendment_text}
        richText={data.legislation_amendment_rich_text}
        maxLength={220}
      />
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
    case "LA":
      return <LegislativeInitiativeCard identifier={docRef.identifier} />;
    case "TAA":
      return <LegislativeInitiativeCard identifier={docRef.identifier} />;
    case "LTA":
      return <LegislativeInitiativeCard identifier={docRef.identifier} />;
    case "TPA":
      return <LegislativeInitiativeCard identifier={docRef.identifier} />;
    case "KA":
      return <LegislativeInitiativeCard identifier={docRef.identifier} />;
    case "KAA":
      return <LegislativeInitiativeCard identifier={docRef.identifier} />;
    case "SKT":
      return <OralQuestionCard identifier={docRef.identifier} />;
    case "VM":
      return <CommitteeReportCard identifier={docRef.identifier} />;
  }
};

export const RelatedVotings: React.FC<{ identifiers: string[] }> = ({
  identifiers,
}) => {
  const { t } = useTranslation();
  type VotingSummary = {
    id: number;
    section_title: string | null;
    context_title: string | null;
    start_time: string | null;
    session_key: string | null;
    n_yes: number;
    n_no: number;
    n_total: number;
  };

  type VotingDetails = {
    voting: VotingSummary & {
      n_abstain: number;
      n_absent: number;
      title: string | null;
      parliamentary_item: string | null;
      section_key: string | null;
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

  const [votings, setVotings] = useState<VotingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVotingId, setExpandedVotingId] = useState<number | null>(null);
  const [detailsById, setDetailsById] = useState<Record<number, VotingDetails>>(
    {},
  );
  const [detailLoadingById, setDetailLoadingById] = useState<
    Record<number, boolean>
  >({});

  const refKey = identifiers.join(",");

  const fetchVotingDetails = (id: number) => {
    if (detailsById[id] || detailLoadingById[id]) return;
    setDetailLoadingById((prev) => ({ ...prev, [id]: true }));
    fetch(`/api/votings/${id}/details`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        setDetailsById((prev) => ({ ...prev, [id]: json }));
      })
      .catch(() => {})
      .finally(() => {
        setDetailLoadingById((prev) => ({ ...prev, [id]: false }));
      });
  };

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
      setExpandedVotingId(null);
      setDetailsById({});
      setDetailLoadingById({});
    });

    return () => {
      cancelled = true;
    };
  }, [refKey]);

  if (loading) {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, mt: 0.5 }}
      >
        <CircularProgress size={14} />
        <Typography sx={{ fontSize: "0.7rem", color: colors.textSecondary }}>
          {t("documents.loadingVotings")}
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
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          {t("documents.relatedVotings")}
        </Typography>
      </Box>
      {votings.map((v) => {
        const isExpanded = expandedVotingId === v.id;
        const details = detailsById[v.id];
        const isDetailLoading = !!detailLoadingById[v.id];
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
              borderRadius: 1,
              mb: 0.5,
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
              <Button
                size="small"
                onClick={() => {
                  const nextExpanded = isExpanded ? null : v.id;
                  setExpandedVotingId(nextExpanded);
                  if (nextExpanded === v.id) fetchVotingDetails(v.id);
                }}
                sx={{
                  minWidth: 0,
                  px: 1,
                  fontSize: "0.65rem",
                  textTransform: "none",
                }}
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
                {isExpanded
                  ? t("common.detailsToggle", { context: "hide" })
                  : t("common.detailsToggle", { context: "show" })}
              </Button>
              <Button
                size="small"
                onClick={() => {
                  window.history.pushState(
                    {},
                    "",
                    `/aanestykset?voting=${v.id}`,
                  );
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }}
                sx={{
                  minWidth: 0,
                  px: 1,
                  fontSize: "0.65rem",
                  textTransform: "none",
                }}
                endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
              >
                {t("common.openView")}
              </Button>
            </Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}
            >
              <Typography
                sx={{ fontSize: "0.65rem", color: colors.textSecondary }}
              >
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
                {isDetailLoading && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={12} />
                    <Typography
                      sx={{ fontSize: "0.7rem", color: colors.textSecondary }}
                    >
                      {t("common.loadingVotingDetails")}
                    </Typography>
                  </Box>
                )}
                {!isDetailLoading && details && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        label={t("common.yesCount", {
                          count: details.voting.n_yes,
                        })}
                        sx={{
                          height: 20,
                          color: colors.success,
                          borderColor: colors.success,
                        }}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={t("common.noCount", {
                          count: details.voting.n_no,
                        })}
                        sx={{
                          height: 20,
                          color: colors.error,
                          borderColor: colors.error,
                        }}
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={t("common.emptyCount", {
                          count: details.voting.n_abstain,
                        })}
                        sx={{ height: 20 }}
                      />
                      <Chip
                        size="small"
                        label={t("common.absentCount", {
                          count: details.voting.n_absent,
                        })}
                        sx={{ height: 20 }}
                      />
                    </Box>
                    <Typography
                      sx={{ fontSize: "0.72rem", color: colors.textSecondary }}
                    >
                      {t("common.votingTargetLine", {
                        value:
                          details.voting.context_title ||
                          details.voting.section_title ||
                          details.voting.title ||
                          t("documents.noTitle"),
                      })}
                    </Typography>
                    {details.voting.parliamentary_item && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={details.voting.parliamentary_item}
                        sx={{
                          height: 20,
                          fontSize: "0.65rem",
                          width: "fit-content",
                        }}
                      />
                    )}
                    {details.governmentOpposition && (
                      <Typography
                        sx={{ fontSize: "0.7rem", color: colors.textSecondary }}
                      >
                        Hallitus: {details.governmentOpposition.government_yes}{" "}
                        jaa / {details.governmentOpposition.government_no} ei,
                        Oppositio: {details.governmentOpposition.opposition_yes}{" "}
                        jaa / {details.governmentOpposition.opposition_no} ei
                      </Typography>
                    )}
                    <VotingResultsTable
                      partyBreakdown={details.partyBreakdown}
                      memberVotes={details.memberVotes}
                    />
                    <Box>
                      {extractDocumentIdentifiers([
                        details.voting.parliamentary_item,
                        details.voting.context_title,
                        details.voting.section_title,
                        details.voting.title,
                      ]).map((ref) => (
                        <DocumentCard
                          key={`${details.voting.id}-${ref.identifier}`}
                          docRef={ref}
                        />
                      ))}
                    </Box>
                    {details.relatedVotings.length > 0 && (
                      <Box>
                        <Typography
                          sx={{
                            fontSize: "0.68rem",
                            color: colors.textSecondary,
                          }}
                        >
                          {t("documents.relatedVotingsSameSection")}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                            mt: 0.25,
                          }}
                        >
                          {details.relatedVotings.slice(0, 6).map((related) => (
                            <Chip
                              key={related.id}
                              size="small"
                              label={`${related.id}: ${related.n_yes}-${related.n_no}`}
                              variant="outlined"
                              sx={{ height: 20, fontSize: "0.65rem" }}
                            />
                          ))}
                          {details.relatedVotings.length > 6 && (
                            <Typography
                              sx={{
                                fontSize: "0.65rem",
                                color: colors.textSecondary,
                              }}
                            >
                              {t("documents.moreOther", {
                                count: details.relatedVotings.length - 6,
                              })}
                            </Typography>
                          )}
                        </Box>
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
