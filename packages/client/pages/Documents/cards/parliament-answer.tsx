import {
  Article as ArticleIcon,
  Balance as BalanceIcon,
  Gavel as GavelIcon,
  HowToVote as HowToVoteIcon,
  UnfoldMore as UnfoldMoreIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";
import { memo, useEffect, useState } from "react";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import { DataCard, InlineSpinner } from "#client/theme/components";
import { colors } from "#client/theme/index";
import { apiFetch } from "#client/utils/fetch";
import { buildEdkDocumentUrl, formatDate } from "./shared";

export interface ParliamentAnswerListItem {
  id: number;
  parliament_identifier: string;
  document_number: number;
  parliamentary_year: string;
  title: string | null;
  source_reference: string | null;
  committee_report_reference: string | null;
  submission_date: string | null;
  signature_date: string | null;
  signatory_count: number;
  subjects: string | null;
}

type ParliamentAnswerDetail = ApiRouteResponse<`/api/parliament-answers/:id`>;

// ─── Drawer content component ───

function ParliamentAnswerDrawerContent({
  item,
}: {
  item: ParliamentAnswerListItem;
}) {
  const { t: tDocuments } = useScopedTranslation("documents");

  const [detail, setDetail] = useState<ParliamentAnswerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDecision, setShowDecision] = useState(false);
  const [showLegislation, setShowLegislation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/parliament-answers/${item.id}`)
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
      {/* Decision section */}
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
                borderLeft: `3px solid ${colors.primaryLight}`,
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

      {/* Legislation section */}
      {(detail.legislation_text || detail.legislation_rich_text) && (
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
                borderLeft: `3px solid ${colors.primaryLight}`,
              }}
            >
              <RichTextRenderer
                document={detail.legislation_rich_text}
                fallbackText={detail.legislation_text}
                paragraphVariant="body2"
              />
            </Box>
          </Collapse>
        </Box>
      )}

      {/* PDF link */}
      {detail.edk_identifier && (
        <Box>
          <EduskuntaSourceLink
            href={buildEdkDocumentUrl(detail.edk_identifier) ?? "#"}
            sx={{ fontSize: "0.85rem" }}
          >
            <ArticleIcon fontSize="small" sx={{ mr: 0.5 }} />
            PDF
          </EduskuntaSourceLink>
        </Box>
      )}
    </Stack>
  );
}

function ParliamentAnswerCardComponent({
  item,
  onSubjectClick,
}: {
  item: ParliamentAnswerListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t: tDocuments } = useScopedTranslation("documents");
  const { openRootDrawer } = useOverlayDrawer();

  const subjects = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];
  const displaySubjects = subjects.slice(0, 3);
  const remainingSubjects = subjects.length - 3;

  const navigateTo = (href: string) => {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const handleOpenDrawer = () => {
    openRootDrawer({
      drawerKey: `parliament-answer:${item.id}`,
      title: item.parliament_identifier,
      subtitle: item.title || tDocuments("noTitle"),
      content: <ParliamentAnswerDrawerContent item={item} />,
    });
  };

  return (
    <DataCard sx={{ contentVisibility: "auto", containIntrinsicSize: "320px" }}>
      <Box sx={{ p: 2 }}>
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
              label={tDocuments("parliamentAnswerTypeLabel")}
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
            {item.signature_date && (
              <Typography variant="body2" color={colors.textSecondary}>
                {tDocuments("signatureDateLine", {
                  value: formatDate(item.signature_date),
                })}
              </Typography>
            )}
            {item.signatory_count > 0 && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <HowToVoteIcon
                  fontSize="small"
                  sx={{ color: colors.textSecondary }}
                />
                <Typography variant="body2" color={colors.textSecondary}>
                  {item.signatory_count}
                </Typography>
              </Stack>
            )}

            {/* Cross-link chips */}
            {item.source_reference && (
              <Chip
                label={`${tDocuments("parliamentAnswerSourceRef")}: ${item.source_reference}`}
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateTo(
                    refs.documents(
                      "government-proposals",
                      item.source_reference!,
                    ),
                  );
                }}
                sx={{
                  borderColor: colors.primaryLight,
                  color: colors.primary,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              />
            )}
            {item.committee_report_reference && (
              <Chip
                label={`${tDocuments("parliamentAnswerCommitteeRef")}: ${item.committee_report_reference}`}
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateTo(
                    refs.documents(
                      "committee-reports",
                      item.committee_report_reference!,
                    ),
                  );
                }}
                sx={{
                  borderColor: colors.dataBorder,
                  color: colors.textSecondary,
                  cursor: "pointer",
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

          {/* Open drawer button */}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<UnfoldMoreIcon />}
              aria-haspopup="dialog"
              onClick={handleOpenDrawer}
              sx={{ minWidth: 140 }}
            >
              {tDocuments("showDetails")}
            </Button>
          </Box>
        </Stack>
      </Box>
    </DataCard>
  );
}

export const ParliamentAnswerCard = memo(ParliamentAnswerCardComponent);
