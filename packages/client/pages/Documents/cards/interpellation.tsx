import {
  Article as ArticleIcon,
  Gavel as GavelIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import {
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
import { memo, useState } from "react";
import { RelatedVotings } from "#client/components/DocumentCards";
import { DocumentLifecycle } from "#client/components/DocumentLifecycle";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors } from "#client/theme/index";
import { apiFetch } from "#client/utils/fetch";
import {
  DocumentCardShell,
  DocumentDetailSection,
  DocumentMetaItem,
} from "../components";
import { formatDate, getOutcomeColor, InlineRelatedSessions } from "./shared";

// ─── Interpellation types and card ───

export interface InterpellationListItem {
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
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  subjects: string | null;
}

type InterpellationDetail = ApiRouteResponse<`/api/interpellations/:id`>;

function InterpellationCardComponent({
  item,
  onSubjectClick,
}: {
  item: InterpellationListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");

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
        const response = await apiFetch(`/api/interpellations/${item.id}`);
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
          {(item.first_signer_first_name || item.first_signer_last_name) && (
            <DocumentMetaItem icon={<PersonIcon />}>
              {[item.first_signer_first_name, item.first_signer_last_name]
                .filter(Boolean)
                .join(" ")}
              {item.first_signer_party && ` (${item.first_signer_party})`}
              {!!item.co_signer_count &&
                item.co_signer_count > 0 &&
                ` +${item.co_signer_count}`}
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
      toggleLabel={tDocuments("showDetails")}
      collapseLabel={tDocuments("hideDetails")}
      loadingState={
        loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        ) : undefined
      }
      error={error}
    >
      {detail && (
        <Stack spacing={3}>
          {detail.signers.length > 0 && (
            <DocumentDetailSection
              title={tDocuments("signers")}
              icon={<PersonIcon />}
            >
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>{tDocuments("author")}</TableCell>
                      <TableCell>{tCommon("party")}</TableCell>
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
            </DocumentDetailSection>
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
                  ? tDocuments("justificationToggle", { context: "hide" })
                  : tDocuments("justificationToggle", { context: "show" })}
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
                  ? tDocuments("clausesToggle", { context: "hide" })
                  : tDocuments("clausesToggle", { context: "show" })}
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
    </DocumentCardShell>
  );
}

export const InterpellationCard = memo(InterpellationCardComponent);
