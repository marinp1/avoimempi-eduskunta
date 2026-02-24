import {
  Article as ArticleIcon,
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
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { DataCard } from "#client/theme/components";
import { colors } from "#client/theme/index";
import {
  buildKysymysPdfUrl,
  formatDate,
  getOutcomeColor,
  InlineRelatedSessions,
} from "./shared";

// ─── Written question types and card ───

export interface WrittenQuestionListItem {
  id: number;
  parliament_identifier: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  submission_date: string | null;
  first_signer_first_name: string | null;
  first_signer_last_name: string | null;
  first_signer_party: string | null;
  co_signer_count: number | null;
  answer_minister_first_name: string | null;
  answer_minister_last_name: string | null;
  answer_minister_title: string | null;
  answer_date: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  subjects: string | null;
}

interface WrittenQuestionDetail {
  id: number;
  parliament_identifier: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  submission_date: string | null;
  question_text: string | null;
  question_rich_text: string | null;
  answer_parliament_identifier: string | null;
  answer_minister_title: string | null;
  answer_minister_first_name: string | null;
  answer_minister_last_name: string | null;
  answer_date: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  signers: Array<{
    signer_order: number;
    is_first_signer: number;
    first_name: string | null;
    last_name: string | null;
    party: string | null;
  }>;
  stages: Array<{
    stage_title: string | null;
    stage_code: string | null;
    event_date: string | null;
    event_title: string | null;
    event_description: string | null;
  }>;
  subjects: Array<{ subject_text: string }>;
  response_subjects: Array<{ subject_text: string }>;
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

export interface WrittenQuestionResponseListItem {
  id: number;
  parliament_identifier: string;
  document_number: number | null;
  parliamentary_year: string;
  title: string | null;
  answer_date: string | null;
  minister_title: string | null;
  minister_first_name: string | null;
  minister_last_name: string | null;
  question_id: number;
  question_identifier: string;
  question_title: string | null;
  subjects: string | null;
}

export interface ExpertStatementListItem {
  id: number;
  document_type: string;
  edk_identifier: string;
  bill_identifier: string | null;
  committee_name: string | null;
  meeting_identifier: string | null;
  meeting_date: string | null;
  title: string | null;
  publicity: string | null;
  language: string | null;
}

export interface OralQuestionListItem {
  id: number;
  parliament_identifier: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  question_text: string | null;
  asker_text: string | null;
  submission_date: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  subjects: string | null;
}

interface OralQuestionDetail {
  id: number;
  parliament_identifier: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  question_text: string | null;
  asker_text: string | null;
  submission_date: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  stages: Array<{
    stage_order: number;
    stage_title: string;
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

export function WrittenQuestionResponseCard({
  item,
  onSubjectClick,
}: {
  item: WrittenQuestionResponseListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [questionDetail, setQuestionDetail] = useState<Pick<
    WrittenQuestionDetail,
    "question_text" | "question_rich_text" | "answer_parliament_identifier"
  > | null>(null);
  const [loading, setLoading] = useState(false);

  const subjects = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];
  const displaySubjects = subjects.slice(0, 3);
  const remainingSubjects = subjects.length - 3;

  const ministerName = [item.minister_first_name, item.minister_last_name]
    .filter(Boolean)
    .join(" ");

  const eduskuntaUrl = buildKysymysPdfUrl(item.parliament_identifier);
  const questionEduskuntaUrl = buildKysymysPdfUrl(item.question_identifier);

  const handleExpand = async () => {
    if (!expanded && !questionDetail) {
      setLoading(true);
      try {
        const res = await fetch(`/api/written-questions/${item.question_id}`);
        if (res.ok) setQuestionDetail(await res.json());
      } finally {
        setLoading(false);
      }
    }
    setExpanded((e) => !e);
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
          {/* Identifier + answered chip row */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            gap={0.5}
          >
            <Typography
              variant="caption"
              sx={{ color: colors.textSecondary, fontFamily: "monospace" }}
            >
              {item.parliament_identifier}
            </Typography>
            {item.answer_date && (
              <Chip
                label={`${t("documents.answered", "Vastattu")} ${formatDate(item.answer_date)}`}
                size="small"
                sx={{
                  backgroundColor: colors.success,
                  color: "#fff",
                  fontSize: "0.7rem",
                }}
              />
            )}
          </Stack>

          {/* Title */}
          {item.title ? (
            <Typography
              variant="body1"
              sx={{ fontWeight: 500, color: colors.textPrimary }}
            >
              {item.title}
            </Typography>
          ) : item.question_title ? (
            <Typography
              variant="body1"
              sx={{ fontWeight: 500, color: colors.textPrimary }}
            >
              {item.question_title}
            </Typography>
          ) : null}

          {/* Minister */}
          {ministerName && (
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              {item.minister_title ? `${item.minister_title} ` : ""}
              {ministerName}
            </Typography>
          )}

          {/* Parent question identifier */}
          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
            {t("documents.writtenQuestion", "Kirjallinen kysymys")}:{" "}
            <span style={{ fontFamily: "monospace" }}>
              {item.question_identifier}
            </span>
          </Typography>

          {/* Subject chips */}
          {displaySubjects.length > 0 && (
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

        {/* Expand toggle icon */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
          <ExpandMoreIcon
            sx={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s",
              color: colors.textSecondary,
            }}
          />
        </Box>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2, pt: 0, borderTop: `1px solid ${colors.dataBorder}` }}>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {/* External link buttons */}
          {(eduskuntaUrl || questionEduskuntaUrl) && (
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              gap={0.5}
              sx={{ mb: 2, pt: 2 }}
            >
              {eduskuntaUrl && (
                <EduskuntaSourceLink href={eduskuntaUrl} stopPropagation>
                  {t("documents.viewResponseOnEduskunta", "Vastaus (PDF)")}
                </EduskuntaSourceLink>
              )}
              {questionEduskuntaUrl && (
                <EduskuntaSourceLink
                  href={questionEduskuntaUrl}
                  stopPropagation
                >
                  {t("documents.viewQuestionOnEduskunta", "Kysymys (PDF)")}
                </EduskuntaSourceLink>
              )}
            </Stack>
          )}

          {/* Question text from fetched detail */}
          {!loading && questionDetail?.question_rich_text ? (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ color: colors.textSecondary, mb: 1 }}
              >
                {t("documents.questionText", "Kysymyksen teksti")}
              </Typography>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: colors.backgroundSubtle,
                  borderRadius: 1,
                  borderLeft: `4px solid ${colors.info}`,
                }}
              >
                <RichTextRenderer
                  document={questionDetail.question_rich_text}
                />
              </Box>
            </Box>
          ) : !loading && questionDetail?.question_text ? (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ color: colors.textSecondary, mb: 1 }}
              >
                {t("documents.questionText", "Kysymyksen teksti")}
              </Typography>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: colors.backgroundSubtle,
                  borderRadius: 1,
                  borderLeft: `4px solid ${colors.info}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: colors.textPrimary, whiteSpace: "pre-wrap" }}
                >
                  {questionDetail.question_text}
                </Typography>
              </Box>
            </Box>
          ) : !loading && questionDetail ? (
            <Typography variant="body2" sx={{ color: colors.textSecondary }}>
              {t("documents.noQuestionText", "Kysymyksen teksti ei saatavilla")}
            </Typography>
          ) : null}
        </Box>
      </Collapse>
    </DataCard>
  );
}

export function ExpertStatementCard({
  item,
}: {
  item: ExpertStatementListItem;
}) {
  const { t } = useTranslation();

  const docTypeLabel =
    (
      {
        asiantuntijalausunto: t("documents.expertStatement", "Lausunto"),
        asiantuntijalausunnon_liite: t(
          "documents.expertStatementAttachment",
          "Lausunnon liite",
        ),
        asiantuntijasuunnitelma: t(
          "documents.expertHearingPlan",
          "Kuulemissuunnitelma",
        ),
      } as Record<string, string>
    )[item.document_type] ?? item.document_type;

  return (
    <DataCard>
      <Box sx={{ p: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box sx={{ flex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              gap={0.5}
              sx={{ mb: 0.5 }}
            >
              <Typography
                variant="caption"
                sx={{ color: colors.textSecondary, fontFamily: "monospace" }}
              >
                {item.edk_identifier}
              </Typography>
              <Chip
                label={docTypeLabel}
                size="small"
                sx={{
                  backgroundColor: colors.info,
                  color: "#fff",
                  fontSize: "0.7rem",
                }}
              />
              {item.bill_identifier && (
                <Chip
                  label={item.bill_identifier}
                  size="small"
                  sx={{
                    backgroundColor: colors.primaryLight,
                    color: colors.primary,
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                  }}
                />
              )}
            </Stack>

            {item.title && (
              <Typography
                variant="body1"
                sx={{ fontWeight: 500, color: colors.textPrimary, mb: 0.5 }}
              >
                {item.title}
              </Typography>
            )}

            {item.committee_name && (
              <Typography
                variant="body2"
                sx={{ color: colors.textSecondary, mb: 0.25 }}
              >
                {item.committee_name}
              </Typography>
            )}

            {(item.meeting_date || item.meeting_identifier) && (
              <Typography
                variant="caption"
                sx={{ color: colors.textSecondary }}
              >
                {item.meeting_identifier && `${item.meeting_identifier}`}
                {item.meeting_date && item.meeting_identifier && " · "}
                {item.meeting_date && formatDate(item.meeting_date)}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>
    </DataCard>
  );
}

export function OralQuestionCard({
  item,
  onSubjectClick,
}: {
  item: OralQuestionListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<OralQuestionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionText, setShowQuestionText] = useState(false);

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
        const response = await fetch(`/api/oral-questions/${item.id}`);
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
              {item.title || t("documents.noTitle", "Ei otsikkoa")}
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

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            flexWrap="wrap"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            {item.submission_date && (
              <Typography variant="body2" color={colors.textSecondary}>
                {t("documents.submissionDate", "Jättöpäivä")}:{" "}
                {formatDate(item.submission_date)}
              </Typography>
            )}

            {item.asker_text && (
              <Typography variant="body2" color={colors.textSecondary}>
                {item.asker_text}
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
              {t("documents.loadError", "Virhe ladattaessa tietoja")}: {error}
            </Alert>
          )}

          {detail && (
            <Stack spacing={2}>
              {detail.question_text && (
                <Box>
                  <Button
                    startIcon={<ArticleIcon />}
                    onClick={() => setShowQuestionText(!showQuestionText)}
                    sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
                  >
                    {showQuestionText
                      ? t("documents.hideQuestion", "Piilota kysymys")
                      : t("documents.showQuestion", "Näytä kysymys")}
                  </Button>
                  <Collapse in={showQuestionText}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.info}`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: colors.textPrimary,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {detail.question_text}
                      </Typography>
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

export function WrittenQuestionCard({
  item,
  onSubjectClick,
}: {
  item: WrittenQuestionListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<WrittenQuestionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionText, setShowQuestionText] = useState(false);

  const subjects = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];
  const displaySubjects = subjects.slice(0, 3);
  const remainingSubjects = subjects.length - 3;

  const kkPdfUrl = buildKysymysPdfUrl(item.parliament_identifier);

  const signerName = [item.first_signer_first_name, item.first_signer_last_name]
    .filter(Boolean)
    .join(" ");
  const signerLabel = item.first_signer_party
    ? `${signerName} (${item.first_signer_party})`
    : signerName;

  const answerMinisterName = [
    item.answer_minister_first_name,
    item.answer_minister_last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/written-questions/${item.id}`);
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
              {item.title || t("documents.noTitle", "Ei otsikkoa")}
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
                {t("documents.submissionDate", "Jättöpäivä")}:{" "}
                {formatDate(item.submission_date)}
              </Typography>
            )}

            {signerLabel && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PersonIcon
                  fontSize="small"
                  sx={{ color: colors.textSecondary }}
                />
                <Typography variant="body2" color={colors.textSecondary}>
                  {signerLabel}
                </Typography>
                {item.co_signer_count != null && item.co_signer_count > 0 && (
                  <Typography variant="body2" color={colors.textSecondary}>
                    {` +${item.co_signer_count}`}
                  </Typography>
                )}
              </Stack>
            )}

            {answerMinisterName && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <GavelIcon
                  fontSize="small"
                  sx={{ color: colors.textSecondary }}
                />
                <Typography variant="body2" color={colors.textSecondary}>
                  {item.answer_minister_title
                    ? `${item.answer_minister_title} `
                    : ""}
                  {answerMinisterName}
                  {item.answer_date ? ` (${formatDate(item.answer_date)})` : ""}
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

            {item.answer_date && (
              <Chip
                label={`${t("documents.answered", "Vastattu")} ${formatDate(item.answer_date)}`}
                size="small"
                sx={{
                  backgroundColor: colors.success,
                  color: "#fff",
                  fontWeight: 500,
                }}
              />
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
              {(kkPdfUrl || detail.answer_parliament_identifier) && (
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                  {kkPdfUrl && (
                    <EduskuntaSourceLink href={kkPdfUrl} stopPropagation>
                      {t("documents.viewQuestionPdf", "Kysymys (PDF)")}
                    </EduskuntaSourceLink>
                  )}
                  {(() => {
                    const url = buildKysymysPdfUrl(
                      detail.answer_parliament_identifier,
                    );
                    return url ? (
                      <EduskuntaSourceLink href={url} stopPropagation>
                        {t("documents.viewResponsePdf", "Vastaus (PDF)")}
                      </EduskuntaSourceLink>
                    ) : null;
                  })()}
                </Stack>
              )}

              {detail.signers.length > 0 && (
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
                      {t("documents.signers", "Allekirjoittajat")}
                    </Typography>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>
                            {t("documents.author", "Tekijä")}
                          </TableCell>
                          <TableCell>{t("party", "Puolue")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.signers.map((signer, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                              >
                                {idx + 1}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {[signer.first_name, signer.last_name]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </TableCell>
                            <TableCell>{signer.party || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Answer section */}
              {(detail.answer_date || detail.answer_minister_first_name) && (
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
                      {t("documents.answerMinister", "Vastaaja")}
                    </Typography>
                  </Stack>
                  <Box sx={{ pl: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: colors.textPrimary }}
                    >
                      {detail.answer_minister_title &&
                        `${detail.answer_minister_title} `}
                      {detail.answer_minister_first_name}{" "}
                      {detail.answer_minister_last_name}
                    </Typography>
                    {detail.answer_date && (
                      <Typography
                        variant="caption"
                        sx={{ color: colors.textSecondary }}
                      >
                        {formatDate(detail.answer_date)}
                        {detail.answer_parliament_identifier &&
                          ` — ${detail.answer_parliament_identifier}`}
                      </Typography>
                    )}
                    {detail.response_subjects.length > 0 && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        flexWrap="wrap"
                        gap={0.5}
                        sx={{ mt: 1 }}
                      >
                        {detail.response_subjects.map((s, idx) => (
                          <Chip
                            key={idx}
                            label={s.subject_text}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: colors.dataBorder,
                              color: colors.textSecondary,
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                  </Box>
                </Box>
              )}

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
                      {t("documents.stages", "Käsittelyvaiheet")}
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

              {(detail.question_text || detail.question_rich_text) && (
                <Box>
                  <Button
                    startIcon={<ArticleIcon />}
                    onClick={() => setShowQuestionText(!showQuestionText)}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      mb: 1,
                    }}
                  >
                    {showQuestionText
                      ? t("documents.hideQuestionText", "Piilota kysymysteksti")
                      : t("documents.showQuestionText", "Näytä kysymysteksti")}
                  </Button>
                  <Collapse in={showQuestionText}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.primary}`,
                      }}
                    >
                      <RichTextRenderer
                        document={detail.question_rich_text}
                        fallbackText={detail.question_text}
                        paragraphVariant="body2"
                      />
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* Subjects */}
              {detail.subjects.length > 0 && (
                <Box>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    flexWrap="wrap"
                    gap={0.5}
                  >
                    {detail.subjects.map((s, idx) => (
                      <Chip
                        key={idx}
                        label={s.subject_text}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: colors.dataBorder,
                          color: colors.textSecondary,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              <DocumentLifecycle
                currentIdentifier={item.parliament_identifier}
                directReferenceValues={[
                  detail.answer_parliament_identifier,
                  ...detail.stages.map((stage) => stage.stage_title),
                  ...detail.stages.map((stage) => stage.event_title),
                  ...detail.stages.map((stage) => stage.event_description),
                ]}
                richTextValues={[detail.question_rich_text]}
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
