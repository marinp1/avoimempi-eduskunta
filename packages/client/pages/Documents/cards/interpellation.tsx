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
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { DataCard } from "#client/theme/components";
import { colors } from "#client/theme/index";
import { formatDate, getOutcomeColor, InlineRelatedSessions } from "./shared";

// ─── Interpellation types and card ───

export interface InterpellationListItem {
  id: number;
  parliament_identifier: string;
  document_number: string;
  parliamentary_year: number;
  title: string | null;
  submission_date: string | null;
  first_signer_first_name: string | null;
  first_signer_last_name: string | null;
  first_signer_party: string | null;
  co_signer_count: number;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  subjects: string | null;
}

interface InterpellationDetail {
  id: number;
  parliament_identifier: string;
  document_number: string;
  parliamentary_year: number;
  title: string | null;
  submission_date: string | null;
  question_text: string | null;
  question_rich_text: string | null;
  resolution_text: string | null;
  resolution_rich_text: string | null;
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

export function InterpellationCard({
  item,
  onSubjectClick,
}: {
  item: InterpellationListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<InterpellationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJustification, setShowJustification] = useState(false);
  const [showClauses, setShowClauses] = useState(false);

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
        const response = await fetch(`/api/interpellations/${item.id}`);
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
                {t("documents.submissionDate")}:{" "}
                {formatDate(item.submission_date)}
              </Typography>
            )}

            {(item.first_signer_first_name || item.first_signer_last_name) && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <PersonIcon
                  fontSize="small"
                  sx={{ color: colors.textSecondary }}
                />
                <Typography variant="body2" color={colors.textSecondary}>
                  {[item.first_signer_first_name, item.first_signer_last_name]
                    .filter(Boolean)
                    .join(" ")}
                  {item.first_signer_party && ` (${item.first_signer_party})`}
                  {item.co_signer_count > 0 && ` +${item.co_signer_count}`}
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
                      {t("documents.signers")}
                    </Typography>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>{t("documents.author")}</TableCell>
                          <TableCell>{t("common.party")}</TableCell>
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

              {(detail.question_text || detail.question_rich_text) && (
                <Box>
                  <Button
                    startIcon={<ArticleIcon />}
                    onClick={() => setShowJustification(!showJustification)}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      mb: 1,
                    }}
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

              {(detail.resolution_text || detail.resolution_rich_text) && (
                <Box>
                  <Button
                    startIcon={<GavelIcon />}
                    onClick={() => setShowClauses(!showClauses)}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      mb: 1,
                    }}
                  >
                    {showClauses
                      ? t("documents.clausesToggle", { context: "hide" })
                      : t("documents.clausesToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showClauses}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${getOutcomeColor(
                          detail.decision_outcome_code,
                        )}`,
                      }}
                    >
                      <RichTextRenderer
                        document={detail.resolution_rich_text}
                        fallbackText={detail.resolution_text}
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
                  detail.question_rich_text,
                  detail.resolution_rich_text,
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
