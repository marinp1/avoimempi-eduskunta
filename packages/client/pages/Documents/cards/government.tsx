import {
  Article as ArticleIcon,
  Balance as BalanceIcon,
  ExpandMore as ExpandMoreIcon,
  Gavel as GavelIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

// ─── Government proposal types and card ───

export interface GovernmentProposalListItem {
  id: number;
  parliament_identifier: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  submission_date: string | null;
  author: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  subjects: string | null;
}

interface GovernmentProposalDetail {
  id: number;
  parliament_identifier: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  submission_date: string | null;
  author: string | null;
  summary_text: string | null;
  summary_rich_text: string | null;
  justification_text: string | null;
  justification_rich_text: string | null;
  proposal_text: string | null;
  proposal_rich_text: string | null;
  appendix_text: string | null;
  appendix_rich_text: string | null;
  signature_date: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  law_decision_text: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  signatories: Array<{
    signatory_order: number;
    first_name: string;
    last_name: string;
    title_text: string | null;
  }>;
  stages: Array<{
    stage_title: string | null;
    stage_code: string | null;
    event_date: string | null;
    event_title: string | null;
    event_description: string | null;
  }>;
  subjects: Array<{ subject_text: string; yso_uri: string | null }>;
  laws: Array<{
    law_order: number;
    law_type: string | null;
    law_name: string | null;
  }>;
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

export function GovernmentProposalCard({
  item,
  onSubjectClick,
}: {
  item: GovernmentProposalListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<GovernmentProposalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showProposalText, setShowProposalText] = useState(false);

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
        const response = await fetch(`/api/government-proposals/${item.id}`);
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
          {/* Title row */}
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
          </Stack>

          {/* Metadata row */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            flexWrap="wrap"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            {item.submission_date && (
              <Typography variant="body2" color={colors.textSecondary}>
                {t("documents.submissionDateLine", {
                  value: formatDate(item.submission_date),
                })}
              </Typography>
            )}

            {item.author && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PersonIcon
                  fontSize="small"
                  sx={{ color: colors.textSecondary }}
                />
                <Typography variant="body2" color={colors.textSecondary}>
                  {item.author}
                </Typography>
              </Stack>
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
                {t("documents.latestStageLine", {
                  value: item.latest_stage_code,
                })}
              </Typography>
            )}
          </Stack>

          {/* Subjects */}
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
          }}
        >
          <ExpandMoreIcon
            sx={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s",
              color: colors.textSecondary,
            }}
          />
        </Box>
      </Box>

      {/* Expanded content */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2, pt: 0, borderTop: `1px solid ${colors.dataBorder}` }}>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {detail && (
            <Stack spacing={3}>
              {/* Signatories */}
              {detail.signatories.length > 0 && (
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <PersonIcon sx={{ color: colors.primary }} />
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, color: colors.textPrimary }}
                    >
                      {t("documents.proposalSignatories")}
                    </Typography>
                  </Stack>
                  {detail.signature_date && (
                    <Typography
                      variant="body2"
                      sx={{ mb: 1, color: colors.textSecondary }}
                    >
                      {detail.signature_date}
                    </Typography>
                  )}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>{t("common.name")}</TableCell>
                          <TableCell>{t("documents.signatoryTitle")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.signatories.map((sig, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                              {sig.first_name} {sig.last_name}
                            </TableCell>
                            <TableCell>{sig.title_text || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Laws */}
              {detail.laws.length > 0 && (
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <BalanceIcon sx={{ color: colors.primary }} />
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, color: colors.textPrimary }}
                    >
                      {t("documents.proposalLaws")}
                    </Typography>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>{t("documents.lawType")}</TableCell>
                          <TableCell>{t("documents.lawName")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.laws.map((law, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{law.law_order}</TableCell>
                            <TableCell>{law.law_type || "—"}</TableCell>
                            <TableCell>{law.law_name || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Law decisions (from KVA variant) */}
              {detail.law_decision_text && (
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <GavelIcon sx={{ color: colors.primary }} />
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, color: colors.textPrimary }}
                    >
                      {t("documents.lawDecisions")}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: colors.backgroundSubtle,
                      borderRadius: 1,
                      borderLeft: `4px solid ${getOutcomeColor(detail.decision_outcome_code)}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: colors.textPrimary,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {detail.law_decision_text}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Stages */}
              {detail.stages.length > 0 && (
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <TimelineIcon sx={{ color: colors.primary }} />
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, color: colors.textPrimary }}
                    >
                      {t("documents.stages")}
                    </Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    {detail.stages.map((stage, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          pl: 2,
                          borderLeft: `3px solid ${colors.primary}`,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: colors.textPrimary }}
                        >
                          {stage.stage_title || "—"}
                        </Typography>
                        {stage.event_date && (
                          <Typography
                            variant="caption"
                            sx={{ color: colors.textSecondary }}
                          >
                            {formatDate(stage.event_date)}
                          </Typography>
                        )}
                        {stage.event_title &&
                          stage.event_title !== stage.stage_title && (
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.25,
                                color: colors.textPrimary,
                                fontWeight: 400,
                              }}
                            >
                              {stage.event_title}
                            </Typography>
                          )}
                        {stage.event_description && (
                          <Typography
                            variant="body2"
                            sx={{ mt: 0.5, color: colors.textSecondary }}
                          >
                            {stage.event_description}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Summary text */}
              {(detail.summary_text || detail.summary_rich_text) && (
                <Box>
                  <Button
                    startIcon={<ArticleIcon />}
                    onClick={() => setShowSummary(!showSummary)}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      mb: 1,
                    }}
                  >
                    {showSummary
                      ? t("documents.summaryToggle", { context: "hide" })
                      : t("documents.summaryToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showSummary}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.primary}`,
                      }}
                    >
                      <RichTextRenderer
                        document={detail.summary_rich_text}
                        fallbackText={detail.summary_text}
                        paragraphVariant="body2"
                      />
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* Proposal text (ponsi) */}
              {(detail.proposal_text || detail.proposal_rich_text) && (
                <Box>
                  <Button
                    startIcon={<GavelIcon />}
                    onClick={() => setShowProposalText(!showProposalText)}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      mb: 1,
                    }}
                  >
                    {showProposalText
                      ? t("documents.proposalTextToggle", { context: "hide" })
                      : t("documents.proposalTextToggle", { context: "show" })}
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

              <DocumentLifecycle
                currentIdentifier={item.parliament_identifier}
                directReferenceValues={[
                  ...detail.stages.map((stage) => stage.stage_title),
                  ...detail.stages.map((stage) => stage.event_title),
                  ...detail.stages.map((stage) => stage.event_description),
                ]}
                richTextValues={[
                  detail.summary_rich_text,
                  detail.justification_rich_text,
                  detail.proposal_rich_text,
                  detail.appendix_rich_text,
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
