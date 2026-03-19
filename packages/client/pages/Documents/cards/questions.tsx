import {
  Article as ArticleIcon,
  Gavel as GavelIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  UnfoldMore as UnfoldMoreIcon,
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
import { memo, useEffect, useState } from "react";
import { RelatedVotings } from "#client/components/DocumentCards";
import { DocumentLifecycle } from "#client/components/DocumentLifecycle";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { refs } from "#client/references";
import { DataCard, InlineSpinner } from "#client/theme/components";
import { colors } from "#client/theme/index";
import { apiFetch } from "#client/utils/fetch";
import {
  buildEdkDocumentUrl,
  buildKysymysPdfUrl,
  formatDate,
  getOutcomeColor,
  InlineRelatedSessions,
  parseExpertInfo,
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

type WrittenQuestionDetail = ApiRouteResponse<`/api/written-questions/:id`>;

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

type OralQuestionDetail = ApiRouteResponse<`/api/oral-questions/:id`>;

// ─── WrittenQuestionResponse drawer content ───

function WrittenQuestionResponseDrawerContent({
  item,
}: {
  item: WrittenQuestionResponseListItem;
}) {
  const { t } = useScopedTranslation("documents");

  const [questionDetail, setQuestionDetail] = useState<Pick<
    WrittenQuestionDetail,
    "question_text" | "question_rich_text" | "answer_parliament_identifier"
  > | null>(null);
  const [loading, setLoading] = useState(true);

  const eduskuntaUrl = buildKysymysPdfUrl(item.parliament_identifier);
  const questionEduskuntaUrl = buildKysymysPdfUrl(item.question_identifier);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiFetch(`/api/written-questions/${item.question_id}`)
      .then(async (res) => {
        if (!cancelled && res.ok) {
          setQuestionDetail(await res.json());
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [item.question_id]);

  if (loading) return <InlineSpinner size={24} py={3} />;

  return (
    <Stack spacing={2}>
      {/* External link buttons */}
      {(eduskuntaUrl || questionEduskuntaUrl) && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          gap={0.5}
        >
          {eduskuntaUrl && (
            <EduskuntaSourceLink href={eduskuntaUrl}>
              {t("viewResponseOnEduskunta")}
            </EduskuntaSourceLink>
          )}
          {questionEduskuntaUrl && (
            <EduskuntaSourceLink href={questionEduskuntaUrl}>
              {t("viewQuestionOnEduskunta")}
            </EduskuntaSourceLink>
          )}
        </Stack>
      )}

      {/* Question text from fetched detail */}
      {questionDetail?.question_rich_text ? (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ color: colors.textSecondary, mb: 1 }}
          >
            {t("questionText")}
          </Typography>
          <Box
            sx={{
              p: 2,
              backgroundColor: colors.backgroundSubtle,
              borderRadius: 1,
              borderLeft: `4px solid ${colors.info}`,
            }}
          >
            <RichTextRenderer document={questionDetail.question_rich_text} />
          </Box>
        </Box>
      ) : questionDetail?.question_text ? (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ color: colors.textSecondary, mb: 1 }}
          >
            {t("questionText")}
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
      ) : questionDetail ? (
        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
          {t("noQuestionText")}
        </Typography>
      ) : null}
    </Stack>
  );
}

function WrittenQuestionResponseCardComponent({
  item,
  onSubjectClick,
}: {
  item: WrittenQuestionResponseListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t } = useScopedTranslation("documents");
  const { openRootDrawer } = useOverlayDrawer();

  const subjects = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];
  const displaySubjects = subjects.slice(0, 3);
  const remainingSubjects = subjects.length - 3;

  const ministerName = [item.minister_first_name, item.minister_last_name]
    .filter(Boolean)
    .join(" ");

  const handleOpenDrawer = () => {
    openRootDrawer({
      drawerKey: `wq-response:${item.id}`,
      title: item.parliament_identifier,
      subtitle: item.title || item.question_title || t("noTitle"),
      content: <WrittenQuestionResponseDrawerContent item={item} />,
    });
  };

  return (
    <DataCard sx={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}>
      <Box sx={{ p: 2 }}>
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
                label={t("answeredLine", {
                  value: formatDate(item.answer_date),
                })}
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
            {t("writtenQuestionLine", {
              value: item.question_identifier,
            })}
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
              {t("showDetails")}
            </Button>
          </Box>
        </Stack>
      </Box>
    </DataCard>
  );
}

export const WrittenQuestionResponseCard = memo(
  WrittenQuestionResponseCardComponent,
);

const DocumentPrefixMap = Object.freeze({
  HE: "government-proposals",
  VK: "interpellations",
  KK: "written-questions",
  KKV: "written-questions",
  LA: "legislative-initiatives-law",
  TAA: "legislative-initiatives-budget",
  LTA: "legislative-initiatives-supplementary-budget",
  TPA: "legislative-initiatives-action",
  KA: "legislative-initiatives-discussion",
  KAA: "legislative-initiatives-citizens",
  MIE: "committee-reports",
  MIL: "committee-reports",
  EV: "parliament-answers",
});

const inferDocumentType = (
  identifier: string | null,
): (typeof DocumentPrefixMap)[keyof typeof DocumentPrefixMap] | null => {
  if (!identifier) return null;
  const prefix = identifier.trim().split(/\s+/)[0]?.toUpperCase();
  if (prefix in DocumentPrefixMap)
    return DocumentPrefixMap[prefix as keyof typeof DocumentPrefixMap];
  return null;
};

const BillTypeToApiPath = Object.freeze({
  "government-proposals": "/api/government-proposals/by-identifier",
  interpellations: "/api/interpellations/by-identifier",
  "written-questions": "/api/written-questions/by-identifier",
  "committee-reports": "/api/committee-reports/by-identifier",
  "parliament-answers": "/api/parliament-answers/by-identifier",
  "legislative-initiatives-law": "/api/legislative-initiatives/by-identifier",
  "legislative-initiatives-budget":
    "/api/legislative-initiatives/by-identifier",
  "legislative-initiatives-supplementary-budget":
    "/api/legislative-initiatives/by-identifier",
  "legislative-initiatives-action":
    "/api/legislative-initiatives/by-identifier",
  "legislative-initiatives-discussion":
    "/api/legislative-initiatives/by-identifier",
  "legislative-initiatives-citizens":
    "/api/legislative-initiatives/by-identifier",
});

const getBillApiPath = <T extends keyof typeof BillTypeToApiPath>(
  docType: T,
) => {
  return BillTypeToApiPath[docType as keyof typeof BillTypeToApiPath];
};

function ExpertStatementCardComponent({
  item,
}: {
  item: ExpertStatementListItem;
}) {
  const { t } = useScopedTranslation("documents");

  const [showBillPreview, setShowBillPreview] = useState(false);
  const [billPreview, setBillPreview] = useState<{
    title: string | null;
    submission_date?: string | null;
    decision_outcome?: string | null;
    parliament_identifier: string;
  } | null>(null);
  const [billPreviewLoading, setBillPreviewLoading] = useState(false);

  const docTypeLabel =
    (
      {
        asiantuntijalausunto: t("expertStatement"),
        asiantuntijalausunnon_liite: t("expertStatementAttachment"),
        asiantuntijasuunnitelma: t("expertHearingPlan"),
      } as Record<string, string>
    )[item.document_type] ?? item.document_type;

  // Only parse for statement types, not hearing plans (which have filename-style titles)
  const expertInfo =
    item.document_type !== "asiantuntijasuunnitelma"
      ? parseExpertInfo(item.title)
      : null;

  const isNonPublic = item.publicity === "Ei julkinen";

  return (
    <DataCard sx={{ contentVisibility: "auto", containIntrinsicSize: "300px" }}>
      <Box sx={{ p: 2 }}>
        {/* Top row: chips + date */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: expertInfo || item.title ? 0.75 : 0,
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
            <Chip
              label={docTypeLabel}
              size="small"
              sx={{
                backgroundColor: `${colors.info}18`,
                color: colors.info,
                fontSize: "0.7rem",
                fontWeight: 500,
              }}
            />
            {item.bill_identifier &&
              (() => {
                const docType = inferDocumentType(item.bill_identifier);
                return (
                  <Chip
                    label={item.bill_identifier}
                    size="small"
                    clickable={!!docType}
                    onClick={
                      docType
                        ? async (e: React.MouseEvent) => {
                            e.preventDefault();
                            const next = !showBillPreview;
                            setShowBillPreview(next);
                            if (next && !billPreview) {
                              const apiPath = getBillApiPath(docType);
                              if (apiPath) {
                                setBillPreviewLoading(true);
                                try {
                                  const r = await apiFetch(
                                    `${apiPath}/${encodeURIComponent(item.bill_identifier!)}`,
                                  );
                                  if (r.ok) {
                                    const content = await r.json();
                                    setBillPreview(content);
                                  }
                                } finally {
                                  setBillPreviewLoading(false);
                                }
                              }
                            }
                          }
                        : undefined
                    }
                    sx={{
                      backgroundColor: showBillPreview
                        ? `${colors.primary}20`
                        : `${colors.primary}12`,
                      color: colors.primary,
                      fontFamily: "monospace",
                      fontSize: "0.7rem",
                      cursor: docType ? "pointer" : "default",
                      "&:hover": docType
                        ? { backgroundColor: `${colors.primary}20` }
                        : {},
                    }}
                  />
                );
              })()}
            {isNonPublic && (
              <Chip
                label={t("nonPublic")}
                size="small"
                sx={{
                  backgroundColor: `${colors.error}15`,
                  color: colors.error,
                  fontSize: "0.7rem",
                }}
              />
            )}
          </Stack>
          {item.meeting_date && (
            <Typography
              variant="caption"
              sx={{ color: colors.textTertiary, flexShrink: 0 }}
            >
              {formatDate(item.meeting_date)}
            </Typography>
          )}
        </Box>

        {/* Expert identity (parsed from title) */}
        {expertInfo ? (
          <>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                color: colors.textPrimary,
                lineHeight: 1.35,
              }}
            >
              {expertInfo.expert}
            </Typography>
            {expertInfo.organization && (
              <Typography
                variant="body2"
                sx={{ color: colors.textSecondary, mt: 0.25 }}
              >
                {expertInfo.organization}
              </Typography>
            )}
          </>
        ) : (
          item.title && (
            <Typography
              variant="body2"
              sx={{ color: colors.textSecondary, fontStyle: "italic" }}
            >
              {item.title}
            </Typography>
          )
        )}

        {/* Footer: committee + meeting + external link */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            mt: 0.75,
            gap: 1,
          }}
        >
          {(item.committee_name || item.meeting_identifier) && (
            <Typography variant="caption" sx={{ color: colors.textTertiary }}>
              {[item.committee_name, item.meeting_identifier]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          )}
          {buildEdkDocumentUrl(item.edk_identifier) && (
            <EduskuntaSourceLink
              href={buildEdkDocumentUrl(item.edk_identifier) as string}
              stopPropagation
              sx={{ fontSize: "0.7rem", flexShrink: 0 }}
            >
              PDF
            </EduskuntaSourceLink>
          )}
        </Box>

        {/* Inline bill preview (toggled by chip click) */}
        <Collapse in={showBillPreview} timeout="auto" unmountOnExit>
          <Box
            sx={{
              mt: 1,
              p: 1.5,
              backgroundColor: `${colors.primary}08`,
              borderRadius: 1,
              borderLeft: `3px solid ${colors.primary}`,
            }}
          >
            {billPreviewLoading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={14} />
                <Typography
                  variant="caption"
                  sx={{ color: colors.textSecondary }}
                >
                  Ladataan...
                </Typography>
              </Box>
            )}
            {billPreview && (
              <Stack spacing={0.5}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: colors.textPrimary,
                    lineHeight: 1.35,
                  }}
                >
                  {billPreview.title || item.bill_identifier}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  gap={0.5}
                >
                  {billPreview.submission_date && (
                    <Typography
                      variant="caption"
                      sx={{ color: colors.textSecondary }}
                    >
                      {formatDate(billPreview.submission_date)}
                    </Typography>
                  )}
                  {billPreview.decision_outcome && (
                    <Typography
                      variant="caption"
                      sx={{ color: colors.textSecondary }}
                    >
                      · {billPreview.decision_outcome}
                    </Typography>
                  )}
                </Stack>
                {item.bill_identifier &&
                  (() => {
                    const docType = inferDocumentType(item.bill_identifier);
                    if (!docType) return null;
                    const href = refs.documents(docType, item.bill_identifier);
                    return (
                      <Typography
                        variant="caption"
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.pushState({}, "", href);
                          window.dispatchEvent(new PopStateEvent("popstate"));
                        }}
                        sx={{
                          color: colors.primary,
                          cursor: "pointer",
                          "&:hover": { textDecoration: "underline" },
                          display: "inline-block",
                          mt: 0.25,
                        }}
                      >
                        Avaa asiakirjaluettelossa →
                      </Typography>
                    );
                  })()}
              </Stack>
            )}
            {!billPreviewLoading && !billPreview && (
              <Typography
                variant="caption"
                sx={{ color: colors.textSecondary }}
              >
                Ei lisätietoja saatavilla.
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>
    </DataCard>
  );
}

export const ExpertStatementCard = memo(ExpertStatementCardComponent);

// ─── OralQuestion drawer content ───

function OralQuestionDrawerContent({
  item,
}: {
  item: OralQuestionListItem;
}) {
  const { t } = useScopedTranslation("documents");

  const [detail, setDetail] = useState<OralQuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionText, setShowQuestionText] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/oral-questions/${item.id}`)
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
    return (
      <Alert severity="error">
        {t("loadErrorLine", { value: error })}
      </Alert>
    );
  }

  if (!detail) return null;

  return (
    <Stack spacing={2}>
      {detail.question_text && (
        <Box>
          <Button
            startIcon={<ArticleIcon />}
            onClick={() => setShowQuestionText(!showQuestionText)}
            sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
          >
            {showQuestionText
              ? t("questionToggle", { context: "hide" })
              : t("questionToggle", { context: "show" })}
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
  );
}

function OralQuestionCardComponent({
  item,
  onSubjectClick,
}: {
  item: OralQuestionListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t } = useScopedTranslation("documents");
  const { openRootDrawer } = useOverlayDrawer();

  const subjects = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];
  const displaySubjects = subjects.slice(0, 3);
  const remainingSubjects = subjects.length - 3;

  const handleOpenDrawer = () => {
    openRootDrawer({
      drawerKey: `oral-question:${item.id}`,
      title: item.parliament_identifier,
      subtitle: item.title || t("noTitle"),
      content: <OralQuestionDrawerContent item={item} />,
    });
  };

  return (
    <DataCard sx={{ contentVisibility: "auto", containIntrinsicSize: "380px" }}>
      <Box sx={{ p: 2 }}>
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
              {item.title || t("noTitle")}
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
                {t("submissionDateLine", {
                  value: formatDate(item.submission_date),
                })}
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
              {t("showDetails")}
            </Button>
          </Box>
        </Stack>
      </Box>
    </DataCard>
  );
}

export const OralQuestionCard = memo(OralQuestionCardComponent);

// ─── WrittenQuestion drawer content ───

function WrittenQuestionDrawerContent({
  item,
}: {
  item: WrittenQuestionListItem;
}) {
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tDocuments } = useScopedTranslation("documents");

  const [detail, setDetail] = useState<WrittenQuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionText, setShowQuestionText] = useState(false);

  const kkPdfUrl = buildKysymysPdfUrl(item.parliament_identifier);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/written-questions/${item.id}`)
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
      {(kkPdfUrl || detail.answer_parliament_identifier) && (
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
          {kkPdfUrl && (
            <EduskuntaSourceLink href={kkPdfUrl}>
              {tDocuments("viewQuestionPdf")}
            </EduskuntaSourceLink>
          )}
          {(() => {
            const url = buildKysymysPdfUrl(
              detail.answer_parliament_identifier,
            );
            return url ? (
              <EduskuntaSourceLink href={url}>
                {tDocuments("viewResponsePdf")}
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
              {tDocuments("signers")}
            </Typography>
          </Stack>
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
              {tDocuments("answerMinister")}
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
              {tDocuments("stages")}
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
              ? tDocuments("questionTextToggle", { context: "hide" })
              : tDocuments("questionTextToggle", { context: "show" })}
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
  );
}

function WrittenQuestionCardComponent({
  item,
  onSubjectClick,
}: {
  item: WrittenQuestionListItem;
  onSubjectClick?: (subject: string) => void;
}) {
  const { t: tDocuments } = useScopedTranslation("documents");
  const { openRootDrawer } = useOverlayDrawer();

  const subjects = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];
  const displaySubjects = subjects.slice(0, 3);
  const remainingSubjects = subjects.length - 3;

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

  const handleOpenDrawer = () => {
    openRootDrawer({
      drawerKey: `written-question:${item.id}`,
      title: item.parliament_identifier,
      subtitle: item.title || tDocuments("noTitle"),
      content: <WrittenQuestionDrawerContent item={item} />,
    });
  };

  return (
    <DataCard sx={{ contentVisibility: "auto", containIntrinsicSize: "400px" }}>
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
                label={tDocuments("answeredLine", {
                  value: formatDate(item.answer_date),
                })}
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

export const WrittenQuestionCard = memo(WrittenQuestionCardComponent);
