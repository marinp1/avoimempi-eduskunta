import {
  Article as ArticleIcon,
  Balance as BalanceIcon,
  ExpandMore as ExpandMoreIcon,
  Gavel as GavelIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RelatedVotings } from "#client/components/DocumentCards";
import { DocumentLifecycle } from "#client/components/DocumentLifecycle";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { DataCard } from "#client/theme/components";
import { colors } from "#client/theme/index";
import { formatDate, getOutcomeColor, InlineRelatedSessions } from "./shared";

// ─── Legislative initiative types and card ───

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

interface LegislativeInitiativeDetail {
  id: number;
  initiative_type_code: string;
  parliament_identifier: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  submission_date: string | null;
  first_signer_person_id: number | null;
  first_signer_first_name: string | null;
  first_signer_last_name: string | null;
  first_signer_party: string | null;
  justification_text: string | null;
  justification_rich_text: string | null;
  proposal_text: string | null;
  proposal_rich_text: string | null;
  law_text: string | null;
  law_rich_text: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  signers: Array<{
    signer_order: number;
    person_id: number | null;
    first_name: string;
    last_name: string;
    party: string | null;
    is_first_signer: number;
  }>;
  stages: Array<{
    stage_order: number;
    stage_title: string | null;
    stage_code: string | null;
    event_date: string | null;
    event_title: string | null;
    event_description: string | null;
  }>;
  subjects: Array<{ subject_text: string; yso_uri: string | null }>;
  sessions: Array<{
    session_key: string;
    session_date: string;
    session_type: string;
    session_number: number;
    session_year: string;
    section_title: string | null;
    section_key: string;
  }>;
}

export function LegislativeInitiativeCard({
  item,
  onSubjectClick,
}: {
  item: LegislativeInitiativeListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t } = useTranslation();
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
        const response = await fetch(`/api/legislative-initiatives/${item.id}`);
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
    <DataCard>
      <Box
        sx={{
          cursor: "pointer",
          "&:hover": {
            backgroundColor: colors.backgroundSubtle,
          },
          transition: "background-color 0.2s",
          p: 2,
        }}
        onClick={handleExpand}
      >
        <Stack spacing={1.5}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="flex-start"
            flexWrap="wrap"
          >
            <Typography
              variant="h6"
              sx={{
                flex: 1,
                minWidth: "200px",
                color: colors.textPrimary,
                fontWeight: 500,
              }}
            >
              {item.title || t("documents.noTitle")}
            </Typography>
            <Chip
              label={item.parliament_identifier}
              size="small"
              sx={{
                backgroundColor: colors.primaryLight,
                color: colors.primary,
                fontWeight: 500,
              }}
            />
            <Chip
              label={item.initiative_type_code}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            flexWrap="wrap"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            {item.submission_date && (
              <Typography variant="body2" color={colors.textSecondary}>
                {t("documents.submissionDate")}:{" "}
                {formatDate(item.submission_date)}
              </Typography>
            )}

            {signerWithParty && (
              <Typography variant="body2" color={colors.textSecondary}>
                {signerWithParty}
              </Typography>
            )}

            {item.decision_outcome && (
              <Chip
                label={item.decision_outcome}
                size="small"
                sx={{
                  backgroundColor: getOutcomeColor(item.decision_outcome_code),
                  color: "#fff",
                  fontWeight: 500,
                }}
              />
            )}

            {item.latest_stage_code && !item.decision_outcome && (
              <Typography variant="body2" color={colors.textSecondary}>
                {t("documents.latestStage")}: {item.latest_stage_code}
              </Typography>
            )}
          </Stack>

          {subjects.length > 0 && (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              {displaySubjects.map((subject, idx) => (
                <Chip
                  key={idx}
                  label={subject}
                  size="small"
                  variant="outlined"
                  onClick={
                    onSubjectClick
                      ? (e) => {
                          e.stopPropagation();
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
          )}
        </Stack>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mt: 1,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <ExpandMoreIcon sx={{ color: colors.textSecondary }} />
        </Box>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 2 }}>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t("documents.loadError")}: {error}
            </Alert>
          )}

          {detail && (
            <Stack spacing={2}>
              {(detail.justification_text ||
                detail.justification_rich_text) && (
                <Box>
                  <Button
                    startIcon={<ArticleIcon />}
                    onClick={() => setShowJustification(!showJustification)}
                    sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
                  >
                    {showJustification
                      ? t("documents.justificationToggle", { context: "hide" })
                      : t("documents.justificationToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showJustification}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.info}`,
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
                      ? t("documents.clausesToggle", { context: "hide" })
                      : t("documents.clausesToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showProposalText}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.primary}`,
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
                      ? t("documents.lawTextToggle", { context: "hide" })
                      : t("documents.lawTextToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showLawText}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.success}`,
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
        </Box>
      </Collapse>
    </DataCard>
  );
}
