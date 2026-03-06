import {
  Article as ArticleIcon,
  Balance as BalanceIcon,
  ExpandMore as ExpandMoreIcon,
  Gavel as GavelIcon,
  Groups as GroupsIcon,
  Person as PersonIcon,
  School as SchoolIcon,
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
import { useScopedTranslation } from "#client/i18n/scoped";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { DataCard } from "#client/theme/components";
import { colors } from "#client/theme/index";
import {
  formatDate,
  getCommitteeReportKind,
  InlineRelatedSessions,
} from "./shared";

// ─── Committee report types and card ───

export interface CommitteeReportListItem {
  id: number;
  parliament_identifier: string;
  report_type_code: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  committee_name: string | null;
  recipient_committee: string | null;
  source_reference: string | null;
  draft_date: string | null;
  signature_date: string | null;
}

interface CommitteeReportDetail {
  id: number;
  parliament_identifier: string;
  report_type_code: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  committee_name: string | null;
  recipient_committee: string | null;
  source_reference: string | null;
  draft_date: string | null;
  signature_date: string | null;
  summary_text: string | null;
  summary_rich_text: string | null;
  general_reasoning_text: string | null;
  general_reasoning_rich_text: string | null;
  detailed_reasoning_text: string | null;
  detailed_reasoning_rich_text: string | null;
  decision_text: string | null;
  decision_rich_text: string | null;
  legislation_amendment_text: string | null;
  legislation_amendment_rich_text: string | null;
  minority_opinion_text: string | null;
  minority_opinion_rich_text: string | null;
  resolution_text: string | null;
  resolution_rich_text: string | null;
  members: Array<{
    member_order: number;
    person_id: number | null;
    first_name: string;
    last_name: string;
    party: string | null;
    role: string | null;
  }>;
  experts: Array<{
    expert_order: number;
    person_id: number | null;
    first_name: string | null;
    last_name: string | null;
    title: string | null;
    organization: string | null;
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

export function CommitteeReportCard({
  item,
}: {
  item: CommitteeReportListItem;
}) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");
  const reportKind = getCommitteeReportKind(item.report_type_code);
  const reportKindLabel =
    reportKind === "report"
      ? tDocuments("committeeReportTypeReport")
      : reportKind === "statement"
        ? tDocuments("committeeReportTypeStatement")
        : item.report_type_code;

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<CommitteeReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showLegislation, setShowLegislation] = useState(false);
  const [showMinority, setShowMinority] = useState(false);

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/committee-reports/${item.id}`);
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
            <Chip
              label={reportKindLabel}
              size="small"
              variant="outlined"
              sx={{
                borderColor: colors.dataBorder,
                color: colors.textSecondary,
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
            {item.draft_date && (
              <Typography variant="body2" color={colors.textSecondary}>
                {tDocuments("submissionDateLine", {
                  value: formatDate(item.draft_date),
                })}
              </Typography>
            )}
            {item.signature_date && (
              <Typography variant="body2" color={colors.textSecondary}>
                {tDocuments("signatureDateLine", {
                  value: formatDate(item.signature_date),
                })}
              </Typography>
            )}

            {item.committee_name && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <GroupsIcon
                  fontSize="small"
                  sx={{ color: colors.textSecondary }}
                />
                <Typography variant="body2" color={colors.textSecondary}>
                  {item.committee_name}
                </Typography>
              </Stack>
            )}
            {item.recipient_committee && (
              <Chip
                label={tDocuments("recipientCommitteeLine", {
                  value: item.recipient_committee,
                })}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: colors.dataBorder,
                  color: colors.textSecondary,
                }}
              />
            )}

            {item.source_reference && (
              <Chip
                label={item.source_reference}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: colors.primaryLight,
                  color: colors.primary,
                  fontWeight: 500,
                }}
              />
            )}
          </Stack>
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
              {/* Members */}
              {detail.members.length > 0 && (
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <GroupsIcon sx={{ color: colors.primary }} />
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, color: colors.textPrimary }}
                    >
                      {tDocuments("committeeMembers")}
                    </Typography>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>{tCommon("name")}</TableCell>
                          <TableCell>{tCommon("party")}</TableCell>
                          <TableCell>{tDocuments("committeeRole")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.members.map((member, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                              {member.first_name} {member.last_name}
                            </TableCell>
                            <TableCell>{member.party || "—"}</TableCell>
                            <TableCell>{member.role || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Experts */}
              {detail.experts.length > 0 && (
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mb: 1.5 }}
                  >
                    <SchoolIcon sx={{ color: colors.primary }} />
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, color: colors.textPrimary }}
                    >
                      {tDocuments("committeeExperts")}
                    </Typography>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>{tCommon("name")}</TableCell>
                          <TableCell>{tDocuments("expertTitle")}</TableCell>
                          <TableCell>
                            {tDocuments("expertOrganization")}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detail.experts.map((expert, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                              {[expert.first_name, expert.last_name]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </TableCell>
                            <TableCell>{expert.title || "—"}</TableCell>
                            <TableCell>{expert.organization || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
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

              {/* Reasoning text */}
              {(detail.general_reasoning_text ||
                detail.general_reasoning_rich_text ||
                detail.detailed_reasoning_text ||
                detail.detailed_reasoning_rich_text) && (
                <Box>
                  <Button
                    startIcon={<ArticleIcon />}
                    onClick={() => setShowReasoning(!showReasoning)}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      mb: 1,
                    }}
                  >
                    {showReasoning
                      ? tDocuments("justificationToggle", { context: "hide" })
                      : tDocuments("justificationToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showReasoning}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.primary}`,
                      }}
                    >
                      <Stack spacing={1.5}>
                        {(detail.general_reasoning_text ||
                          detail.general_reasoning_rich_text) && (
                          <RichTextRenderer
                            document={detail.general_reasoning_rich_text}
                            fallbackText={detail.general_reasoning_text}
                            paragraphVariant="body2"
                          />
                        )}
                        {(detail.detailed_reasoning_text ||
                          detail.detailed_reasoning_rich_text) && (
                          <RichTextRenderer
                            document={detail.detailed_reasoning_rich_text}
                            fallbackText={detail.detailed_reasoning_text}
                            paragraphVariant="body2"
                          />
                        )}
                      </Stack>
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* Decision text */}
              {(detail.decision_text || detail.decision_rich_text) && (
                <Box>
                  <Button
                    startIcon={<GavelIcon />}
                    onClick={() => setShowDecision(!showDecision)}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      mb: 1,
                    }}
                  >
                    {showDecision
                      ? tDocuments("decisionToggle", { context: "hide" })
                      : tDocuments("decisionToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showDecision}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.primary}`,
                      }}
                    >
                      <RichTextRenderer
                        document={detail.decision_rich_text}
                        fallbackText={detail.decision_text}
                        paragraphVariant="body2"
                      />
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* Legislation amendment text */}
              {(detail.legislation_amendment_text ||
                detail.legislation_amendment_rich_text) && (
                <Box>
                  <Button
                    startIcon={<BalanceIcon />}
                    onClick={() => setShowLegislation(!showLegislation)}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      mb: 1,
                    }}
                  >
                    {showLegislation
                      ? tDocuments("legislationToggle", { context: "hide" })
                      : tDocuments("legislationToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showLegislation}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.primary}`,
                      }}
                    >
                      <RichTextRenderer
                        document={detail.legislation_amendment_rich_text}
                        fallbackText={detail.legislation_amendment_text}
                        paragraphVariant="body2"
                      />
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* Minority opinion */}
              {(detail.minority_opinion_text ||
                detail.minority_opinion_rich_text) && (
                <Box>
                  <Button
                    startIcon={<PersonIcon />}
                    onClick={() => setShowMinority(!showMinority)}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      mb: 1,
                    }}
                  >
                    {showMinority
                      ? tDocuments("minorityToggle", { context: "hide" })
                      : tDocuments("minorityToggle", { context: "show" })}
                  </Button>
                  <Collapse in={showMinority}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: colors.backgroundSubtle,
                        borderRadius: 1,
                        borderLeft: `4px solid ${colors.error}`,
                      }}
                    >
                      <RichTextRenderer
                        document={detail.minority_opinion_rich_text}
                        fallbackText={detail.minority_opinion_text}
                        paragraphVariant="body2"
                      />
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* Resolution text */}
              {(detail.resolution_text || detail.resolution_rich_text) && (
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: colors.backgroundSubtle,
                    borderRadius: 1,
                    borderLeft: `4px solid ${colors.primary}`,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, color: colors.textPrimary, mb: 1 }}
                  >
                    {tDocuments("committeeResolution")}
                  </Typography>
                  <RichTextRenderer
                    document={detail.resolution_rich_text}
                    fallbackText={detail.resolution_text}
                    paragraphVariant="body2"
                  />
                </Box>
              )}

              <DocumentLifecycle
                currentIdentifier={item.parliament_identifier}
                directReferenceValues={[
                  item.source_reference,
                  detail.source_reference,
                ]}
                richTextValues={[
                  detail.summary_rich_text,
                  detail.general_reasoning_rich_text,
                  detail.detailed_reasoning_rich_text,
                  detail.decision_rich_text,
                  detail.legislation_amendment_rich_text,
                  detail.minority_opinion_rich_text,
                  detail.resolution_rich_text,
                ]}
              />

              <InlineRelatedSessions sessions={detail.sessions} />

              <RelatedVotings
                identifiers={
                  [item.parliament_identifier, item.source_reference].filter(
                    Boolean,
                  ) as string[]
                }
              />
            </Stack>
          )}
        </Box>
      </Collapse>
    </DataCard>
  );
}
