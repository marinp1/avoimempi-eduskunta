import {
  Article as ArticleIcon,
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
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { InlineSpinner } from "#client/theme/components";
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

// ─── Drawer content component ───

function InterpellationDrawerContent({
  item,
}: {
  item: InterpellationListItem;
}) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");

  const [detail, setDetail] = useState<InterpellationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJustification, setShowJustification] = useState(false);
  const [showClauses, setShowClauses] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/interpellations/${item.id}`)
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

    return () => {
      cancelled = true;
    };
  }, [item.id]);

  if (loading) return <InlineSpinner size={24} py={3} />;

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!detail) return null;

  return (
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
                      <Stack direction="row" spacing={0.5} alignItems="center">
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
  );
}

function InterpellationCardComponent({
  item,
  onSubjectClick,
}: {
  item: InterpellationListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t: tDocuments } = useScopedTranslation("documents");
  const { openRootDrawer } = useOverlayDrawer();

  const subjects = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];

  const handleOpenDrawer = () => {
    openRootDrawer({
      drawerKey: `interpellation:${item.id}`,
      title: item.parliament_identifier,
      subtitle: item.title || tDocuments("noTitle"),
      content: <InterpellationDrawerContent item={item} />,
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
              color:
                getOutcomeColor(item.decision_outcome_code) === colors.dataBorder
                  ? colors.textPrimary
                  : "#fff",
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
            {subjects.map((subject, idx) => (
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
          </Stack>
        ) : null
      }
      onOpenDrawer={handleOpenDrawer}
      toggleLabel={tDocuments("showDetails")}
      collapseLabel={tDocuments("hideDetails")}
    />
  );
}

export const InterpellationCard = memo(InterpellationCardComponent);
