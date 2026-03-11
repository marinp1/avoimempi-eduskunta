import {
  Article as ArticleIcon,
  Balance as BalanceIcon,
  Gavel as GavelIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Stack,
} from "@mui/material";
import { memo, useState } from "react";
import { RelatedVotings } from "#client/components/DocumentCards";
import { DocumentLifecycle } from "#client/components/DocumentLifecycle";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors } from "#client/theme/index";
import { apiFetch } from "#client/utils/fetch";
import { DocumentCardShell, DocumentMetaItem } from "../components";
import { formatDate, getOutcomeColor, InlineRelatedSessions } from "./shared";

export interface LegislativeInitiativeListItem {
  id: number;
  initiative_type_code: string;
  parliament_identifier: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  submission_date: string | null;
  first_signer_first_name: string | null;
  first_signer_last_name: string | null;
  first_signer_party: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  subjects: string | null;
}

type LegislativeInitiativeDetail =
  ApiRouteResponse<`/api/legislative-initiatives/:id`>;

function LegislativeInitiativeCardComponent({
  item,
  onSubjectClick,
}: {
  item: LegislativeInitiativeListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t } = useScopedTranslation("documents");
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<LegislativeInitiativeDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJustification, setShowJustification] = useState(false);
  const [showProposalText, setShowProposalText] = useState(false);
  const [showLawText, setShowLawText] = useState(false);

  const subjects = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];
  const displaySubjects = subjects.slice(0, 3);
  const remainingSubjects = subjects.length - 3;

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          `/api/legislative-initiatives/${item.id}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    setExpanded(!expanded);
  };

  const signer = [item.first_signer_first_name, item.first_signer_last_name]
    .filter(Boolean)
    .join(" ");
  const signerWithParty = item.first_signer_party
    ? `${signer} (${item.first_signer_party})`
    : signer;

  return (
    <DocumentCardShell
      title={item.title || t("noTitle")}
      identifier={item.parliament_identifier}
      eyebrow={
        <Chip
          label={item.initiative_type_code}
          size="small"
          variant="outlined"
          sx={{ borderColor: colors.dataBorder }}
        />
      }
      status={
        item.decision_outcome ? (
          <Chip
            label={item.decision_outcome}
            size="small"
            sx={{
              backgroundColor: getOutcomeColor(item.decision_outcome_code),
              color: "#fff",
              fontWeight: 700,
            }}
          />
        ) : item.latest_stage_code ? (
          <Chip
            label={item.latest_stage_code}
            size="small"
            variant="outlined"
            sx={{
              borderColor: colors.dataBorder,
              color: colors.textSecondary,
            }}
          />
        ) : null
      }
      meta={
        <>
          {item.submission_date && (
            <DocumentMetaItem icon={<ArticleIcon />}>
              {t("submissionDateLine", {
                value: formatDate(item.submission_date),
              })}
            </DocumentMetaItem>
          )}
          {signerWithParty && (
            <DocumentMetaItem icon={<PersonIcon />}>
              {signerWithParty}
            </DocumentMetaItem>
          )}
        </>
      }
      topics={
        subjects.length > 0 ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
            {displaySubjects.map((subject, idx) => (
              <Chip
                key={idx}
                label={subject}
                size="small"
                variant="outlined"
                onClick={
                  onSubjectClick
                    ? () => {
                        onSubjectClick(subject);
                      }
                    : undefined
                }
                sx={{
                  borderColor: colors.dataBorder,
                  color: colors.textSecondary,
                  cursor: onSubjectClick ? "pointer" : "default",
                }}
              />
            ))}
            {remainingSubjects > 0 && (
              <Chip
                label={`+${remainingSubjects}`}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: colors.dataBorder,
                  color: colors.textSecondary,
                }}
              />
            )}
          </Stack>
        ) : null
      }
      expanded={expanded}
      onToggle={handleExpand}
      toggleLabel={t("showDetails")}
      collapseLabel={t("hideDetails")}
      loadingState={
        loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : undefined
      }
      error={error ? t("loadErrorLine", { value: error }) : null}
    >
      {detail && (
        <Stack spacing={2}>
          {(detail.justification_text || detail.justification_rich_text) && (
            <Box>
              <Button
                startIcon={<ArticleIcon />}
                onClick={() => setShowJustification(!showJustification)}
                sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
              >
                {showJustification
                  ? t("justificationToggle", { context: "hide" })
                  : t("justificationToggle", { context: "show" })}
              </Button>
              <Collapse in={showJustification}>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: colors.backgroundSubtle,
                    borderRadius: 1,
                    borderLeft: `3px solid ${colors.primaryLight}`,
                  }}
                >
                  <RichTextRenderer
                    document={detail.justification_rich_text}
                    fallbackText={detail.justification_text}
                    paragraphVariant="body2"
                  />
                </Box>
              </Collapse>
            </Box>
          )}

          {(detail.proposal_text || detail.proposal_rich_text) && (
            <Box>
              <Button
                startIcon={<GavelIcon />}
                onClick={() => setShowProposalText(!showProposalText)}
                sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
              >
                {showProposalText
                  ? t("clausesToggle", { context: "hide" })
                  : t("clausesToggle", { context: "show" })}
              </Button>
              <Collapse in={showProposalText}>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: colors.backgroundSubtle,
                    borderRadius: 1,
                    borderLeft: `3px solid ${colors.primaryLight}`,
                  }}
                >
                  <RichTextRenderer
                    document={detail.proposal_rich_text}
                    fallbackText={detail.proposal_text}
                    paragraphVariant="body2"
                  />
                </Box>
              </Collapse>
            </Box>
          )}

          {(detail.law_text || detail.law_rich_text) && (
            <Box>
              <Button
                startIcon={<BalanceIcon />}
                onClick={() => setShowLawText(!showLawText)}
                sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
              >
                {showLawText
                  ? t("lawTextToggle", { context: "hide" })
                  : t("lawTextToggle", { context: "show" })}
              </Button>
              <Collapse in={showLawText}>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: colors.backgroundSubtle,
                    borderRadius: 1,
                    borderLeft: `3px solid ${colors.success}`,
                  }}
                >
                  <RichTextRenderer
                    document={detail.law_rich_text}
                    fallbackText={detail.law_text}
                    paragraphVariant="body2"
                  />
                </Box>
              </Collapse>
            </Box>
          )}

          <DocumentLifecycle
            currentIdentifier={item.parliament_identifier}
            directReferenceValues={[
              ...detail.stages.map((stage) => stage.stage_title),
              ...detail.stages.map((stage) => stage.event_title),
              ...detail.stages.map((stage) => stage.event_description),
            ]}
            richTextValues={[
              detail.justification_rich_text,
              detail.proposal_rich_text,
              detail.law_rich_text,
            ]}
          />

          <InlineRelatedSessions sessions={detail.sessions} />

          <RelatedVotings identifiers={[item.parliament_identifier]} />
        </Stack>
      )}
    </DocumentCardShell>
  );
}

export const LegislativeInitiativeCard = memo(
  LegislativeInitiativeCardComponent,
);
