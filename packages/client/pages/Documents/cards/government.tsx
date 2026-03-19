import {
  Article as ArticleIcon,
  Balance as BalanceIcon,
  Gavel as GavelIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { memo, useEffect, useState } from "react";
import { RelatedVotings } from "#client/components/DocumentCards";
import { DocumentLifecycle } from "#client/components/DocumentLifecycle";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import { colors } from "#client/theme/index";
import { InlineSpinner } from "#client/theme/components";
import { apiFetch } from "#client/utils/fetch";
import {
  DocumentCardShell,
  DocumentDetailSection,
  DocumentMetaItem,
} from "../components";
import {
  buildEdkDocumentUrl,
  formatDate,
  getOutcomeColor,
  InlineRelatedSessions,
  parseExpertInfo,
} from "./shared";

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

type ExpertStatementPreview = {
  id: number;
  document_type: string;
  edk_identifier: string | null;
  committee_name: string | null;
  meeting_date: string | null;
  title: string | null;
};

type ParliamentAnswerPreview = {
  id: number;
  parliament_identifier: string;
  title: string | null;
  signature_date: string | null;
  edk_identifier: string | null;
};

// ─── Drawer content component ───

function GovernmentProposalDrawerContent({
  item,
}: {
  item: GovernmentProposalListItem;
}) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");

  const [detail, setDetail] = useState<GovernmentProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showProposalText, setShowProposalText] = useState(false);
  const [expertStatements, setExpertStatements] =
    useState<ExpertStatementPreview[] | null>(null);
  const [parliamentAnswer, setParliamentAnswer] = useState<
    ParliamentAnswerPreview | null | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/government-proposals/${item.id}`)
      .then(async (res) => {
        if (!cancelled) {
          if (res.ok) {
            setDetail(await res.json());
          } else {
            setError(`HTTP ${res.status}`);
          }
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Tuntematon virhe");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    apiFetch(
      `/api/expert-statements/by-bill?identifier=${encodeURIComponent(item.parliament_identifier)}`,
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setExpertStatements(data);
      })
      .catch(() => {
        if (!cancelled) setExpertStatements([]);
      });

    apiFetch(
      `/api/parliament-answers/by-source-reference/${encodeURIComponent(item.parliament_identifier)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setParliamentAnswer(data);
      })
      .catch(() => {
        if (!cancelled) setParliamentAnswer(null);
      });

    return () => {
      cancelled = true;
    };
  }, [item.id, item.parliament_identifier]);

  if (loading) return <InlineSpinner size={24} py={3} />;

  if (error) {
    return (
      <Alert severity="error">{error}</Alert>
    );
  }

  if (!detail) return null;

  return (
    <Stack spacing={3}>
      {detail.signatories.length > 0 && (
        <DocumentDetailSection
          title={tDocuments("proposalSignatories")}
          icon={<PersonIcon />}
        >
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
        </DocumentDetailSection>
      )}

      {detail.laws.length > 0 && (
        <DocumentDetailSection
          title={tDocuments("proposalLaws")}
          icon={<BalanceIcon />}
        >
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
                {detail.laws.map((law) => (
                  <TableRow key={law.law_order}>
                    <TableCell>{law.law_order}</TableCell>
                    <TableCell>{law.law_type || "—"}</TableCell>
                    <TableCell>{law.law_name || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DocumentDetailSection>
      )}

      {detail.law_decision_text && (
        <DocumentDetailSection
          title={tDocuments("lawDecisions")}
          icon={<GavelIcon />}
        >
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
              sx={{ color: colors.textPrimary, whiteSpace: "pre-wrap" }}
            >
              {detail.law_decision_text}
            </Typography>
          </Box>
        </DocumentDetailSection>
      )}

      {detail.stages.length > 0 && (
        <DocumentDetailSection
          title={tDocuments("stages")}
          icon={<TimelineIcon />}
        >
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
        </DocumentDetailSection>
      )}

      {(detail.summary_text || detail.summary_rich_text) && (
        <Box>
          <Button
            startIcon={<ArticleIcon />}
            onClick={() => setShowSummary(!showSummary)}
            sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
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

      {(detail.proposal_text || detail.proposal_rich_text) && (
        <Box>
          <Button
            startIcon={<GavelIcon />}
            onClick={() => setShowProposalText(!showProposalText)}
            sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
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

      {parliamentAnswer && (
        <Box>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <GavelIcon sx={{ color: colors.primary }} />
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: colors.textPrimary }}
            >
              Eduskunnan vastaus
            </Typography>
          </Stack>
          <Box
            sx={{
              pl: 1.5,
              py: 0.75,
              borderLeft: `3px solid ${colors.primaryLight}`,
              backgroundColor: colors.backgroundSubtle,
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
                  sx={{ fontWeight: 500, color: colors.textPrimary }}
                >
                  {parliamentAnswer.parliament_identifier}
                </Typography>
                {parliamentAnswer.title && (
                  <Typography
                    variant="caption"
                    sx={{ color: colors.textSecondary, display: "block" }}
                  >
                    {parliamentAnswer.title}
                  </Typography>
                )}
                {parliamentAnswer.signature_date && (
                  <Typography
                    variant="caption"
                    sx={{ color: colors.textTertiary, display: "block" }}
                  >
                    {formatDate(parliamentAnswer.signature_date)}
                  </Typography>
                )}
              </Box>
              {parliamentAnswer.edk_identifier && (
                <EduskuntaSourceLink
                  href={`https://www.eduskunta.fi/FI/vaski/JulkaisuMetatieto/Documents/${parliamentAnswer.edk_identifier}.pdf`}
                  stopPropagation
                  sx={{ fontSize: "0.7rem", flexShrink: 0 }}
                >
                  PDF
                </EduskuntaSourceLink>
              )}
            </Stack>
          </Box>
        </Box>
      )}

      <RelatedVotings identifiers={[item.parliament_identifier]} />
    </Stack>
  );
}

function GovernmentProposalCardComponent({
  item,
  onSubjectClick,
}: {
  item: GovernmentProposalListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t: tDocuments } = useScopedTranslation("documents");
  const { openRootDrawer } = useOverlayDrawer();

  const subjects = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];
  const displaySubjects = subjects.slice(0, 3);
  const remainingSubjects = subjects.length - 3;

  const handleOpenDrawer = () => {
    openRootDrawer({
      drawerKey: `gov-proposal:${item.id}`,
      title: item.parliament_identifier,
      subtitle: item.title || tDocuments("noTitle"),
      content: <GovernmentProposalDrawerContent item={item} />,
    });
  };

  return (
    <DocumentCardShell
      title={item.title || tDocuments("noTitle")}
      identifier={item.parliament_identifier}
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
              fontWeight: 600,
            }}
          />
        ) : null
      }
      meta={
        <>
          {item.submission_date && (
            <DocumentMetaItem icon={<ArticleIcon />}>
              {tDocuments("submissionDateLine", {
                value: formatDate(item.submission_date),
              })}
            </DocumentMetaItem>
          )}
          {item.author && (
            <DocumentMetaItem icon={<PersonIcon />}>
              {item.author}
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
      onOpenDrawer={handleOpenDrawer}
      toggleLabel={tDocuments("showDetails")}
      collapseLabel={tDocuments("hideDetails")}
    />
  );
}

export const GovernmentProposalCard = memo(GovernmentProposalCardComponent);
