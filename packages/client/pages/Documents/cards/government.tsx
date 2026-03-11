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
import { RelatedVotings } from "#client/components/DocumentCards";
import { DocumentLifecycle } from "#client/components/DocumentLifecycle";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import { DataCard } from "#client/theme/components";
import { colors } from "#client/theme/index";
import { apiFetch } from "#client/utils/fetch";
import {
  buildEdkDocumentUrl,
  formatDate,
  getOutcomeColor,
  InlineRelatedSessions,
  parseExpertInfo,
} from "./shared";

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

type GovernmentProposalDetail =
  ApiRouteResponse<`/api/government-proposals/:id`>;

export function GovernmentProposalCard({
  item,
  onSubjectClick,
}: {
  item: GovernmentProposalListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<GovernmentProposalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showProposalText, setShowProposalText] = useState(false);
  const [expertStatements, setExpertStatements] = useState<Array<{
    id: number;
    document_type: string;
    edk_identifier: string | null;
    committee_name: string | null;
    meeting_date: string | null;
    title: string | null;
  }> | null>(null);

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
        const response = await apiFetch(`/api/government-proposals/${item.id}`);
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
      apiFetch(
        `/api/expert-statements/by-bill?identifier=${encodeURIComponent(item.parliament_identifier)}`,
      )
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setExpertStatements(data))
        .catch(() => setExpertStatements([]));
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
              {item.title || tDocuments("noTitle")}
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
                {tDocuments("submissionDateLine", {
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
                {tDocuments("latestStageLine", {
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
                      {tDocuments("proposalSignatories")}
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
                          <TableCell>{tCommon("name")}</TableCell>
                          <TableCell>{tDocuments("signatoryTitle")}</TableCell>
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
                      {tDocuments("proposalLaws")}
                    </Typography>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>{tDocuments("lawType")}</TableCell>
                          <TableCell>{tDocuments("lawName")}</TableCell>
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
                      {tDocuments("lawDecisions")}
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
                      {tDocuments("stages")}
                    </Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    {detail.stages.map((stage, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          pl: 2,
                          borderLeft: `3px solid ${colors.primaryLight}`,
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
                      ? tDocuments("summaryToggle", { context: "hide" })
                      : tDocuments("summaryToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showSummary}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `3px solid ${colors.primaryLight}`,
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
                      ? tDocuments("proposalTextToggle", { context: "hide" })
                      : tDocuments("proposalTextToggle", { context: "show" })}
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

              {expertStatements !== null && expertStatements.length > 0 && (
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1.5 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ArticleIcon sx={{ color: colors.info }} />
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, color: colors.textPrimary }}
                      >
                        Asiantuntijalausunnot ({expertStatements.length})
                      </Typography>
                    </Stack>
                    <Typography
                      variant="caption"
                      onClick={() => {
                        const href = refs.documents(
                          "expert-statements",
                          item.parliament_identifier,
                        );
                        window.history.pushState({}, "", href);
                        window.dispatchEvent(new PopStateEvent("popstate"));
                      }}
                      sx={{
                        color: colors.info,
                        cursor: "pointer",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      Näytä kaikki →
                    </Typography>
                  </Stack>
                  <Stack spacing={0.75}>
                    {expertStatements.map((stmt) => {
                      const parsed = parseExpertInfo(stmt.title);
                      const pdfUrl = buildEdkDocumentUrl(stmt.edk_identifier);
                      return (
                        <Box
                          key={stmt.id}
                          sx={{
                            pl: 1.5,
                            py: 0.75,
                            borderLeft: `3px solid ${colors.primaryLight}`,
                            backgroundColor: `${colors.info}06`,
                            borderRadius: "0 4px 4px 0",
                          }}
                        >
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            gap={1}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 500,
                                  color: colors.textPrimary,
                                  lineHeight: 1.35,
                                }}
                              >
                                {parsed?.expert ?? stmt.title ?? "—"}
                              </Typography>
                              {parsed?.organization && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: colors.textSecondary,
                                    display: "block",
                                  }}
                                >
                                  {parsed.organization}
                                </Typography>
                              )}
                              {(stmt.committee_name || stmt.meeting_date) && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: colors.textTertiary,
                                    display: "block",
                                  }}
                                >
                                  {[
                                    stmt.committee_name,
                                    stmt.meeting_date
                                      ? formatDate(stmt.meeting_date)
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </Typography>
                              )}
                            </Box>
                            {pdfUrl && (
                              <EduskuntaSourceLink
                                href={pdfUrl}
                                stopPropagation
                                sx={{ fontSize: "0.7rem", flexShrink: 0 }}
                              >
                                PDF
                              </EduskuntaSourceLink>
                            )}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              <RelatedVotings identifiers={[item.parliament_identifier]} />
            </Stack>
          )}
        </Box>
      </Collapse>
    </DataCard>
  );
}
