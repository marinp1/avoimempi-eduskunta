import HowToVoteIcon from "@mui/icons-material/HowToVote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Button, Chip, CircularProgress, Typography } from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, commonStyles } from "#client/theme/index";
import { apiFetch, type IdentifierRouteType } from "#client/utils/fetch";

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
  "&:focus-visible": {
    outline: `2px solid ${colors.primary}`,
    outlineOffset: 2,
  },
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
  ...commonStyles.compactChipSm,
  ...commonStyles.compactTextMd,
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
  ...commonStyles.compactChipXs,
  fontSize: "0.6rem",
  borderColor: `${colors.dataBorder}`,
};

const decisionOutcomeChipSx = {
  ...commonStyles.compactChipSm,
  fontWeight: 600,
};

const metaTextSx = {
  ...commonStyles.compactTextMd,
  color: colors.textSecondary,
};

const secondaryTextSx = {
  ...commonStyles.compactTextLg,
  color: colors.textSecondary,
};

const snippetTextSx = {
  fontSize: "0.72rem",
  color: colors.textSecondary,
  mt: 0.5,
  lineHeight: 1.35,
};

const drawerSectionLabelSx = {
  ...commonStyles.compactTextMd,
  fontWeight: 700,
  color: colors.textTertiary,
  textTransform: "uppercase",
  mb: 0.75,
};

const normalizeSnippet = (text: string | null | undefined) => {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned;
};

const handleActivateOnKeyDown = (
  event: React.KeyboardEvent,
  onActivate: () => void,
) => {
  if (event.currentTarget !== event.target) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
};

const ExpandableSnippet: React.FC<{
  label: string;
  text: string | null | undefined;
  maxLength?: number;
}> = ({ label, text, maxLength = 280 }) => {
  const { t } = useScopedTranslation("common");
  const { openDrawer } = useOverlayDrawer();
  const normalized = normalizeSnippet(text);

  if (!normalized) return null;
  const isLong = normalized.length > maxLength;
  const shownText = isLong
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
            openDrawer({
              drawerKey: `snippet:${label}`,
              title: label,
              content: <DrawerTextContent label={label} text={normalized} />,
            });
          }}
          sx={{
            ...commonStyles.compactInlineTextButton,
            color: colors.primary,
          }}
        >
          {t("openDetails")}
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
  const { t } = useScopedTranslation("common");
  const { openDrawer } = useOverlayDrawer();
  const normalized = normalizeSnippet(text);

  if (!normalized && !richText) return null;

  const isLong = normalized ? normalized.length > maxLength : false;
  const canExpand = isLong || !!richText;
  const shownText =
    isLong && normalized
      ? `${normalized.slice(0, maxLength).trimEnd()}...`
      : normalized;

  return (
    <Box sx={{ mt: 0.5 }}>
      <Typography sx={snippetTextSx}>
        {label}: {shownText || "—"}
      </Typography>
      {canExpand && (
        <Button
          size="small"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openDrawer({
              drawerKey: `snippet:${label}`,
              title: label,
              content: (
                <DrawerTextContent
                  label={label}
                  text={normalized}
                  richText={richText}
                />
              ),
            });
          }}
          sx={{
            ...commonStyles.compactInlineTextButton,
            color: colors.primary,
          }}
        >
          {t("openDetails")}
        </Button>
      )}
    </Box>
  );
};

const DrawerTextContent = ({
  label,
  text,
  richText,
}: {
  label: string;
  text?: string | null;
  richText?: string | null;
}) => (
  <Box>
    <Typography sx={drawerSectionLabelSx}>{label}</Typography>
    <RichTextRenderer
      document={richText}
      fallbackText={text}
      paragraphVariant="body2"
    />
  </Box>
);

function useFetchByIdentifier<
  I extends IdentifierRouteType,
  D extends ApiRouteResponse<`/api/${I}/by-identifier/:id`>,
>(apiPath: `/api/${I}/by-identifier`, identifier: string) {
  const [data, setData] = useState<D | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`${apiPath}/${encodeURIComponent(identifier)}` as const)
      .then((res) => (res.ok ? (res.json() as D) : null))
      .then((json) => {
        if (!cancelled) setData(json as D);
      })
      .catch((err) => {
        if (!cancelled) console.warn("Failed to fetch document card data", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [identifier, apiPath]);

  return { data, loading };
}

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
    <Typography sx={secondaryTextSx}>{text}</Typography>
  </Box>
);

export const GovernmentProposalCard: React.FC<{ identifier: string }> = ({
  identifier,
}) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const { data, loading } = useFetchByIdentifier(
    "/api/government-proposals/by-identifier",
    identifier,
  );

  if (loading)
    return (
      <LoadingPlaceholder text={tDocuments("loadingGovernmentProposal")} />
    );
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);
  const openDocument = () => {
    window.location.href = `/asiakirjat?id=${data.id}&type=government-proposals`;
  };

  return (
    <Box
      sx={cardSx}
      role="button"
      tabIndex={0}
      onClick={openDocument}
      onKeyDown={(event) => handleActivateOnKeyDown(event, openDocument)}
      aria-label={`${tCommon("openView")}: ${data.parliament_identifier}`}
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
          {data.title || tDocuments("noTitle")}
        </Typography>
        {data.decision_outcome && (
          <Chip
            label={data.decision_outcome}
            size="small"
            sx={{
              ...decisionOutcomeChipSx,
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
        {data.author && <Typography sx={metaTextSx}>{data.author}</Typography>}
      </Box>
      <ExpandableRichSnippet
        label={tDocuments("summary")}
        text={data.summary_text}
        richText={data.summary_rich_text}
        maxLength={280}
      />
      <ExpandableRichSnippet
        label={tDocuments("proposalText")}
        text={data.proposal_text}
        richText={data.proposal_rich_text}
        maxLength={220}
      />
      <ExpandableRichSnippet
        label={tDocuments("justificationText")}
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
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const { data, loading } = useFetchByIdentifier(
    "/api/interpellations/by-identifier",
    identifier,
  );

  if (loading)
    return <LoadingPlaceholder text={tDocuments("loadingInterpellation")} />;
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);
  const signerName = [data.first_signer_first_name, data.first_signer_last_name]
    .filter(Boolean)
    .join(" ");
  const signerLabel = data.first_signer_party
    ? `${signerName} (${data.first_signer_party})`
    : signerName;
  const latestStage = data.stages?.[data.stages.length - 1];
  const openDocument = () => {
    window.location.href = `/asiakirjat?id=${data.id}`;
  };

  return (
    <Box
      sx={cardSx}
      role="button"
      tabIndex={0}
      onClick={openDocument}
      onKeyDown={(event) => handleActivateOnKeyDown(event, openDocument)}
      aria-label={`${tCommon("openView")}: ${data.parliament_identifier}`}
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
          {data.title || tDocuments("noTitle")}
        </Typography>
        {data.decision_outcome && (
          <Chip
            label={data.decision_outcome}
            size="small"
            sx={{
              ...decisionOutcomeChipSx,
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
        {signerLabel && <Typography sx={metaTextSx}>{signerLabel}</Typography>}
      </Box>
      <ExpandableRichSnippet
        label={tDocuments("question")}
        text={data.question_text}
        richText={data.question_rich_text}
        maxLength={280}
      />
      <ExpandableRichSnippet
        label={tDocuments("committeeResolution")}
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
            {tDocuments("answerProcessingStatus")}
          </Typography>
          {latestStage.event_date && (
            <Typography sx={metaTextSx}>
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
              label={tDocuments("additionalInfo")}
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
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const { data, loading } = useFetchByIdentifier(
    "/api/legislative-initiatives/by-identifier",
    identifier,
  );

  if (loading)
    return (
      <LoadingPlaceholder text={tDocuments("loadingLegislativeInitiative")} />
    );
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);
  const signerName = [data.first_signer_first_name, data.first_signer_last_name]
    .filter(Boolean)
    .join(" ");
  const signerLabel = data.first_signer_party
    ? `${signerName} (${data.first_signer_party})`
    : signerName;
  const openDocument = () => {
    window.location.href = `/asiakirjat?id=${data.id}&type=legislative-initiatives`;
  };

  return (
    <Box
      sx={cardSx}
      role="button"
      tabIndex={0}
      onClick={openDocument}
      onKeyDown={(event) => handleActivateOnKeyDown(event, openDocument)}
      aria-label={`${tCommon("openView")}: ${data.parliament_identifier}`}
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
          {data.title || tDocuments("noTitle")}
        </Typography>
        {data.decision_outcome && (
          <Chip
            label={data.decision_outcome}
            size="small"
            sx={{
              ...decisionOutcomeChipSx,
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
        {signerLabel && <Typography sx={metaTextSx}>{signerLabel}</Typography>}
      </Box>
      <ExpandableRichSnippet
        label={tDocuments("justificationText")}
        text={data.justification_text}
        richText={data.justification_rich_text}
        maxLength={260}
      />
      <ExpandableRichSnippet
        label={tDocuments("clausesText")}
        text={data.proposal_text}
        richText={data.proposal_rich_text}
        maxLength={220}
      />
      <ExpandableRichSnippet
        label={tDocuments("proposalLaws")}
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
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const { data, loading } = useFetchByIdentifier(
    "/api/oral-questions/by-identifier",
    identifier,
  );

  if (loading)
    return <LoadingPlaceholder text={tDocuments("loadingOralQuestion")} />;
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);
  const openDocument = () => {
    window.location.href = `/asiakirjat?id=${data.id}&type=oral-questions`;
  };

  return (
    <Box
      sx={cardSx}
      role="button"
      tabIndex={0}
      onClick={openDocument}
      onKeyDown={(event) => handleActivateOnKeyDown(event, openDocument)}
      aria-label={`${tCommon("openView")}: ${data.parliament_identifier}`}
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
          {data.title || tDocuments("noTitle")}
        </Typography>
        {data.decision_outcome && (
          <Chip
            label={data.decision_outcome}
            size="small"
            sx={{
              ...decisionOutcomeChipSx,
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
          <Typography sx={metaTextSx}>{data.asker_text}</Typography>
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
        label={tDocuments("question")}
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
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const { data, loading } = useFetchByIdentifier(
    "/api/written-questions/by-identifier",
    identifier,
  );

  if (loading)
    return <LoadingPlaceholder text={tDocuments("loadingWrittenQuestion")} />;
  if (!data) return null;

  const decisionColor = getDecisionColor(data.decision_outcome_code);
  const signerName = [data.first_signer_first_name, data.first_signer_last_name]
    .filter(Boolean)
    .join(" ");
  const signerLabel = data.first_signer_party
    ? `${signerName} (${data.first_signer_party})`
    : signerName;
  const openDocument = () => {
    window.location.href = `/asiakirjat?id=${data.id}&type=written-questions`;
  };

  return (
    <Box
      sx={cardSx}
      role="button"
      tabIndex={0}
      onClick={openDocument}
      onKeyDown={(event) => handleActivateOnKeyDown(event, openDocument)}
      aria-label={`${tCommon("openView")}: ${data.parliament_identifier}`}
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
          {data.title || tDocuments("noTitle")}
        </Typography>
        {data.decision_outcome && (
          <Chip
            label={data.decision_outcome}
            size="small"
            sx={{
              ...decisionOutcomeChipSx,
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
        {signerLabel && <Typography sx={metaTextSx}>{signerLabel}</Typography>}
      </Box>
      <ExpandableRichSnippet
        label={tDocuments("question")}
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
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const { data, loading } = useFetchByIdentifier(
    "/api/committee-reports/by-identifier",
    identifier,
  );

  if (loading)
    return <LoadingPlaceholder text={tDocuments("loadingCommitteeReport")} />;
  if (!data) return null;
  const openDocument = () => {
    window.location.href = `/asiakirjat?id=${data.id}&type=committee-reports`;
  };

  return (
    <Box
      sx={cardSx}
      role="button"
      tabIndex={0}
      onClick={openDocument}
      onKeyDown={(event) => handleActivateOnKeyDown(event, openDocument)}
      aria-label={`${tCommon("openView")}: ${data.parliament_identifier}`}
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
          {data.title || tDocuments("noTitle")}
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
          <Typography sx={metaTextSx}>{data.committee_name}</Typography>
        )}
        {data.recipient_committee && (
          <Typography sx={metaTextSx}>{data.recipient_committee}</Typography>
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
        label={tDocuments("summary")}
        text={data.summary_text}
        richText={data.summary_rich_text}
        maxLength={280}
      />
      <ExpandableRichSnippet
        label={tDocuments("decisionProposal")}
        text={data.decision_text}
        richText={data.decision_rich_text}
        maxLength={220}
      />
      <ExpandableRichSnippet
        label={tDocuments("committeeResolution")}
        text={data.resolution_text}
        richText={data.resolution_rich_text}
        maxLength={220}
      />
      <ExpandableRichSnippet
        label={tDocuments("proposalLaws")}
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
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const { openDrawer } = useOverlayDrawer();

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

  const [votings, setVotings] = useState<VotingSummary[]>([]);
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
        apiFetch(`/api/votings/by-document/${encodeURIComponent(id)}`)
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
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, mt: 0.5 }}
      >
        <CircularProgress size={14} />
        <Typography sx={metaTextSx}>{tDocuments("loadingVotings")}</Typography>
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
            ...commonStyles.compactTextLg,
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          {tDocuments("relatedVotings")}
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
                  ...commonStyles.compactTextLg,
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
                  ...commonStyles.compactChipSm,
                  fontWeight: 600,
                  color: passed ? colors.success : colors.error,
                  borderColor: passed ? colors.success : colors.error,
                }}
                variant="outlined"
              />
              <Button
                size="small"
                onClick={() => {
                  openDrawer({
                    drawerKey: `related-voting:${v.id}`,
                    title: tDocuments("relatedVotings"),
                    subtitle:
                      v.context_title ||
                      v.section_title ||
                      tDocuments("noTitle"),
                    meta: (
                      <>
                        <Chip
                          size="small"
                          label={`${v.n_yes} - ${v.n_no}`}
                          sx={{
                            ...commonStyles.compactChipSm,
                            fontWeight: 600,
                            color: passed ? colors.success : colors.error,
                            borderColor: passed ? colors.success : colors.error,
                          }}
                          variant="outlined"
                        />
                        <Typography sx={metaTextSx}>
                          {v.start_time?.substring(0, 10)} — {v.session_key}
                        </Typography>
                      </>
                    ),
                    content: (
                      <RelatedVotingDetailsContent
                        votingId={v.id}
                        summary={v}
                      />
                    ),
                  });
                }}
                sx={{
                  ...commonStyles.compactActionButton,
                  ...commonStyles.compactTextXs,
                }}
              >
                {tCommon("openDetails")}
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
                  ...commonStyles.compactActionButton,
                  ...commonStyles.compactTextXs,
                }}
                endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
              >
                {tCommon("openView")}
              </Button>
            </Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}
            >
              <Typography
                sx={{
                  ...commonStyles.compactTextXs,
                  color: colors.textSecondary,
                }}
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
          </Box>
        );
      })}
    </Box>
  );
};

const DrawerLoadingBlock = ({ text }: { text: string }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      p: 1.25,
      borderRadius: 1,
      border: `1px solid ${colors.primaryLight}24`,
      background: `${colors.primaryLight}08`,
    }}
  >
    <CircularProgress size={16} />
    <Typography sx={metaTextSx}>{text}</Typography>
  </Box>
);

const RelatedVotingDetailsContent = ({
  votingId,
  summary,
}: {
  votingId: number;
  summary: {
    id: number;
    section_title: string | null;
    context_title: string | null;
    start_time: string | null;
    session_key: string | null;
    n_yes: number;
    n_no: number;
    n_total: number;
  };
}) => {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const [details, setDetails] =
    useState<ApiRouteResponse<`/api/votings/:id/details`> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/api/votings/${votingId}/details`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setDetails(json);
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [votingId]);

  if (loading) {
    return <DrawerLoadingBlock text={tCommon("loadingVotingDetails")} />;
  }

  if (!details) {
    return <Typography sx={secondaryTextSx}>{tCommon("noData")}</Typography>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        <Chip
          size="small"
          label={tCommon("yesCount", {
            count: details.voting.n_yes,
          })}
          sx={{
            ...commonStyles.compactChipSm,
            color: colors.success,
            borderColor: colors.success,
          }}
          variant="outlined"
        />
        <Chip
          size="small"
          label={tCommon("noCount", {
            count: details.voting.n_no,
          })}
          sx={{
            ...commonStyles.compactChipSm,
            color: colors.error,
            borderColor: colors.error,
          }}
          variant="outlined"
        />
        <Chip
          size="small"
          label={tCommon("emptyCount", {
            count: details.voting.n_abstain,
          })}
          sx={{ ...commonStyles.compactChipSm }}
        />
        <Chip
          size="small"
          label={tCommon("absentCount", {
            count: details.voting.n_absent,
          })}
          sx={{ ...commonStyles.compactChipSm }}
        />
      </Box>
      <Typography sx={{ fontSize: "0.78rem", color: colors.textSecondary }}>
        {tCommon("votingTargetLine", {
          value:
            details.voting.context_title ||
            details.voting.section_title ||
            details.voting.title ||
            summary.context_title ||
            summary.section_title ||
            tDocuments("noTitle"),
        })}
      </Typography>
      {details.voting.parliamentary_item && (
        <Chip
          size="small"
          variant="outlined"
          label={details.voting.parliamentary_item}
          sx={{
            ...commonStyles.compactChipSm,
            width: "fit-content",
          }}
        />
      )}
      {details.governmentOpposition && (
        <Typography sx={metaTextSx}>
          Hallitus: {details.governmentOpposition.government_yes} jaa /{" "}
          {details.governmentOpposition.government_no} ei, Oppositio:{" "}
          {details.governmentOpposition.opposition_yes} jaa /{" "}
          {details.governmentOpposition.opposition_no} ei
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
              ...commonStyles.compactTextSm,
              color: colors.textSecondary,
            }}
          >
            {tDocuments("relatedVotingsSameSection")}
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
                sx={{ ...commonStyles.compactChipSm }}
              />
            ))}
            {details.relatedVotings.length > 6 && (
              <Typography
                sx={{
                  ...commonStyles.compactTextXs,
                  color: colors.textSecondary,
                }}
              >
                {tDocuments("moreOther", {
                  count: details.relatedVotings.length - 6,
                })}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};
