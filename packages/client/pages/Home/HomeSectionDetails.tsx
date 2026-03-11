import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Link,
  Tooltip,
  Typography,
} from "@mui/material";
import { DocumentCard, RelatedVotings } from "#client/components/DocumentCards";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import {
  MinutesContentBlock,
  type MinutesContentReferenceChip,
} from "#client/components/MinutesContentBlock";
import { SourceText } from "#client/components/SourceText";
import { VotingResultsTable } from "#client/components/VotingResultsTable";
import { useScopedTranslation } from "#client/i18n/scoped";
import type {
  MinutesContentReference,
  RollCallEntry,
  SectionDocumentLink,
  SectionRollCallData,
  Speech,
  SpeechData,
  SubSection,
  Voting,
  VotingInlineDetails,
} from "#client/pages/Sessions/shared/types";
import {
  buildFallbackSubSections,
  buildValtiopaivaAsiakirjaUrl,
  extractSectionDocRefs,
  formatVaskiAuthor,
  isRollCallSection,
  parseMinutesContent,
  parseVaskiSubjects,
} from "#client/pages/Sessions/shared/utils";
import { refs } from "#client/references";
import { colors, commonStyles } from "#client/theme";
import { VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import { formatDateLongFi, formatTimeFi } from "#client/utils/date-time";
import {
  isEduskuntaOfficialUrl,
  toEduskuntaUrl,
} from "#client/utils/eduskunta-links";
import type { HomeSection, HomeSession } from "./types";

type CommonTranslation = ReturnType<typeof useScopedTranslation<"common">>["t"];
type SessionsTranslation = ReturnType<
  typeof useScopedTranslation<"sessions">
>["t"];

type SectionLoadErrorKey =
  | "speeches"
  | "votings"
  | "links"
  | "subSections"
  | "rollCall";

type HomeSectionDetailsProps = {
  session: HomeSession;
  section: HomeSection;
  speechData?: SpeechData;
  votings: Voting[];
  links: SectionDocumentLink[];
  rollCallData?: SectionRollCallData | null;
  subSections?: SubSection[];
  notices: NonNullable<HomeSession["notices"]>;
  loadingSpeeches: boolean;
  loadingMoreSpeeches: boolean;
  loadingVotings: boolean;
  loadingLinks: boolean;
  loadingRollCalls: boolean;
  loadingSubSections: boolean;
  sectionErrors?: Partial<Record<SectionLoadErrorKey, string>>;
  expandedVotingIds: Set<number>;
  votingDetailsById: Record<number, VotingInlineDetails>;
  loadingVotingDetails: Set<number>;
  vaskiLatestSpeechDate: string | null;
  onRetry: () => void;
  onLoadMoreSpeeches: () => void;
  onToggleVotingDetails: (votingId: number) => void;
};

export const HomeSectionDetails = ({
  session,
  section,
  speechData,
  votings,
  links,
  rollCallData,
  subSections,
  notices,
  loadingSpeeches,
  loadingMoreSpeeches,
  loadingVotings,
  loadingLinks,
  loadingRollCalls,
  loadingSubSections,
  sectionErrors,
  expandedVotingIds,
  votingDetailsById,
  loadingVotingDetails,
  vaskiLatestSpeechDate,
  onRetry,
  onLoadMoreSpeeches,
  onToggleVotingDetails,
}: HomeSectionDetailsProps) => {
  const { t: tApp } = useScopedTranslation("app");
  const { t: tCommon } = useScopedTranslation("common");
  const { t: tErrors } = useScopedTranslation("errors");
  const { t: tSessions } = useScopedTranslation("sessions");
  const themedColors = useThemedColors();
  const speeches = speechData?.speeches || [];
  const hasSpeechContent = speeches.some((speech) => speech.content);
  const sectionLoadErrorLabels: Record<SectionLoadErrorKey, string> = {
    speeches: tSessions("loadErrorSpeeches"),
    votings: tSessions("loadErrorVotings"),
    links: tSessions("loadErrorLinks"),
    subSections: tSessions("loadErrorSubSections"),
    rollCall: tSessions("loadErrorRollCall"),
  };
  const errorReasons = (sectionErrors ? Object.entries(sectionErrors) : [])
    .filter((entry): entry is [SectionLoadErrorKey, string] =>
      Boolean(entry[1]),
    )
    .map(([key, reason]) => `${sectionLoadErrorLabels[key]} (${reason})`);
  const docRefs = extractSectionDocRefs(section);
  const allNotices = (notices || []).filter(
    (notice) => notice.section_key === section.key,
  );
  const sectionSubSections = getSectionSubSectionRows(section, subSections);

  return (
    <Box>
      {errorReasons.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mt: 1.5 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={onRetry}
              sx={{ ...commonStyles.compactTextMd, textTransform: "none" }}
            >
              {tCommon("retry")}
            </Button>
          }
        >
          {tErrors("loadFailedWithReason", {
            reason: errorReasons.join(", "),
          })}
        </Alert>
      )}

      {renderVaskiInfo(section, tSessions)}
      {renderMinutesInfo(section, tSessions)}
      {renderSectionNotices(allNotices, tSessions)}
      {renderSectionMinutesContent(
        section,
        sectionSubSections,
        rollCallData ?? null,
        tSessions,
        themedColors.success,
      )}
      {renderSectionSubSections(
        sectionSubSections,
        loadingSubSections,
        tSessions,
      )}
      {docRefs.map((ref) => (
        <DocumentCard key={ref.identifier} docRef={ref} />
      ))}
      {docRefs.length > 0 && section.voting_count === 0 && (
        <RelatedVotings identifiers={docRefs.map((ref) => ref.identifier)} />
      )}
      {renderSectionLinks(links, loadingLinks, tApp("loading"), tSessions)}
      {renderSectionRollCall(
        section,
        rollCallData ?? null,
        loadingRollCalls,
        tApp("loading"),
        tSessions,
        themedColors,
      )}

      {loadingVotings ? (
        <LoadingBlock label={tApp("loading")} />
      ) : (
        renderSectionVotings(
          votings,
          session,
          expandedVotingIds,
          votingDetailsById,
          loadingVotingDetails,
          onToggleVotingDetails,
          tCommon,
          tSessions,
          themedColors,
        )
      )}

      {loadingSpeeches ? (
        <LoadingBlock label={tApp("loading")} />
      ) : speeches.length > 0 ? (
        <Box
          sx={{
            mt: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          <Typography
            sx={{
              ...commonStyles.compactTextLg,
              fontWeight: 700,
              color: colors.textSecondary,
              textTransform: "uppercase",
            }}
          >
            {tSessions("speeches")} ({speechData?.total ?? speeches.length})
          </Typography>
          {!hasSpeechContent && (
            <Typography
              sx={{ ...commonStyles.compactTextLg, color: colors.textTertiary }}
            >
              {tSessions("speechContentPending")}
            </Typography>
          )}
          {!hasSpeechContent && vaskiLatestSpeechDate && (
            <Typography
              sx={{ ...commonStyles.compactTextLg, color: colors.textTertiary }}
            >
              {tSessions("speechContentLatest", {
                date: formatDateLongFi(vaskiLatestSpeechDate),
              })}
            </Typography>
          )}
          {speeches.map((speech) => (
            <SpeechCard key={speech.id} speech={speech} />
          ))}
          {speechData && speechData.page < speechData.totalPages && (
            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={onLoadMoreSpeeches}
                disabled={loadingMoreSpeeches}
                sx={{ ...commonStyles.compactOutlinedPrimaryButton }}
              >
                {loadingMoreSpeeches ? (
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                ) : null}
                {tSessions("loadMoreProgress", {
                  loaded: speeches.length,
                  total: speechData.total,
                })}
              </Button>
            </Box>
          )}
        </Box>
      ) : null}
    </Box>
  );
};

const LoadingBlock = ({ label }: { label: string }) => (
  <Box sx={{ py: 2, textAlign: "center" }} role="status" aria-live="polite">
    <CircularProgress size={20} />
    <Typography
      sx={{ ...commonStyles.compactTextXs, color: colors.textTertiary }}
    >
      {label}
    </Typography>
  </Box>
);

const SpeechCard = ({ speech }: { speech: Speech }) => {
  const timeRange = formatSpeechTimeRange(speech);

  return (
    <Box
      sx={{ p: 1.5, borderRadius: 1.5, background: colors.backgroundSubtle }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          mb: speech.content ? 1 : 0,
        }}
      >
        <Chip
          label={speech.ordinal_number ?? speech.ordinal}
          size="small"
          sx={{
            background: `${colors.primaryLight}22`,
            color: colors.primaryLight,
            fontWeight: 700,
            ...commonStyles.compactChipXs,
          }}
        />
        <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", flex: 1 }}>
          {speech.first_name} {speech.last_name}
        </Typography>
        {speech.party_abbreviation && (
          <Chip
            label={speech.party_abbreviation}
            size="small"
            sx={{ ...commonStyles.compactChipXs }}
          />
        )}
        {speech.speech_type && (
          <Typography
            sx={{ ...commonStyles.compactTextXs, color: colors.textTertiary }}
          >
            {speech.speech_type}
          </Typography>
        )}
        {timeRange && (
          <Typography
            sx={{ ...commonStyles.compactTextXs, color: colors.textTertiary }}
          >
            {timeRange}
          </Typography>
        )}
      </Box>
      {speech.content && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            borderLeft: `3px solid ${colors.primaryLight}`,
            background: colors.backgroundPaper,
          }}
        >
          <SourceText
            sx={{
              fontSize: "0.8125rem",
              color: colors.textPrimary,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {speech.content}
          </SourceText>
        </Box>
      )}
    </Box>
  );
};

const renderSectionVotings = (
  votings: Voting[],
  session: HomeSession,
  expandedVotingIds: Set<number>,
  votingDetailsById: Record<number, VotingInlineDetails>,
  loadingVotingDetails: Set<number>,
  onToggleVotingDetails: (votingId: number) => void,
  tCommon: CommonTranslation,
  tSessions: SessionsTranslation,
  themedColors: { success: string; error: string },
) => {
  if (votings.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography
        sx={{
          ...commonStyles.compactTextLg,
          fontWeight: 700,
          color: colors.textSecondary,
          textTransform: "uppercase",
        }}
      >
        {tSessions("votingsLabel", { count: votings.length })}
      </Typography>
      {votings.map((voting) => {
        const isPassed = voting.n_yes > voting.n_no;
        const isExpanded = expandedVotingIds.has(voting.id);
        const details = votingDetailsById[voting.id];
        const detailsLoading = loadingVotingDetails.has(voting.id);
        const collapseId = `home-voting-details-${voting.id}`;

        return (
          <Box
            key={voting.id}
            sx={{
              p: 1.25,
              borderRadius: 1.5,
              border: `1px solid ${isPassed ? `${themedColors.success}40` : `${themedColors.error}40`}`,
              background: isPassed
                ? `${themedColors.success}08`
                : `${themedColors.error}08`,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                mb: 0.75,
              }}
            >
              <Typography
                sx={{ fontWeight: 700, fontSize: "0.82rem", flex: 1 }}
              >
                {voting.title}
              </Typography>
              <Button
                size="small"
                onClick={() => onToggleVotingDetails(voting.id)}
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      fontSize: 14,
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                }
                sx={{
                  ...commonStyles.compactActionButton,
                  textTransform: "none",
                }}
              >
                {isExpanded
                  ? tCommon("detailsToggle", { context: "hide" })
                  : tCommon("detailsToggle", { context: "show" })}
              </Button>
              <Button
                size="small"
                href={refs.voting(voting.id, session.key, session.date)}
                endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                sx={{
                  ...commonStyles.compactActionButton,
                  textTransform: "none",
                }}
              >
                {tCommon("openView")}
              </Button>
            </Box>
            <VoteMarginBar
              yes={voting.n_yes}
              no={voting.n_no}
              empty={voting.n_abstain}
              absent={voting.n_absent}
              height={9}
            />
            <Collapse
              id={collapseId}
              in={isExpanded}
              timeout="auto"
              unmountOnExit
            >
              <Box
                sx={{
                  mt: 0.75,
                  p: 1,
                  borderRadius: 1,
                  border: `1px solid ${colors.dataBorder}`,
                  background: `${colors.primaryLight}04`,
                }}
              >
                {detailsLoading && (
                  <LoadingBlock label={tCommon("loadingVotingDetails")} />
                )}
                {!detailsLoading && details && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      <Chip
                        label={`Jaa ${details.voting.n_yes}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          ...commonStyles.compactChipSm,
                          color: colors.success,
                          borderColor: colors.success,
                        }}
                      />
                      <Chip
                        label={`Ei ${details.voting.n_no}`}
                        size="small"
                        variant="outlined"
                        sx={{
                          ...commonStyles.compactChipSm,
                          color: colors.error,
                          borderColor: colors.error,
                        }}
                      />
                      <Chip
                        label={tCommon("emptyCount", {
                          count: details.voting.n_abstain,
                        })}
                        size="small"
                        sx={{ ...commonStyles.compactChipSm }}
                      />
                      <Chip
                        label={`Poissa ${details.voting.n_absent}`}
                        size="small"
                        sx={{ ...commonStyles.compactChipSm }}
                      />
                    </Box>
                    <VotingResultsTable
                      partyBreakdown={details.partyBreakdown}
                      memberVotes={details.memberVotes}
                    />
                  </Box>
                )}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
};

const renderSectionLinks = (
  links: SectionDocumentLink[],
  loadingLinks: boolean,
  loadingLabel: string,
  tSessions: SessionsTranslation,
) => {
  if (loadingLinks) return <LoadingBlock label={loadingLabel} />;
  if (links.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography
        sx={{
          ...commonStyles.compactTextLg,
          fontWeight: 700,
          color: colors.textSecondary,
          textTransform: "uppercase",
          mb: 0.75,
        }}
      >
        {tSessions("sectionDocuments")}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {links.map((link) => (
          <Box
            key={link.id}
            sx={{ display: "flex", flexDirection: "column", gap: 0.2 }}
          >
            {isEduskuntaOfficialUrl(link.url) ? (
              <EduskuntaSourceLink
                href={link.url as string}
                sx={{ fontSize: "0.8125rem", color: colors.textPrimary }}
              >
                {link.label || link.document_title || link.url}
              </EduskuntaSourceLink>
            ) : (
              <Link
                href={link.url || "#"}
                underline="hover"
                target="_blank"
                rel="noreferrer"
                sx={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: colors.textPrimary,
                }}
              >
                {link.label || link.document_title || link.url}
              </Link>
            )}
            {(link.document_type_name ||
              link.document_created_at ||
              link.document_tunnus) && (
              <Typography
                sx={{
                  ...commonStyles.compactTextLg,
                  color: colors.textTertiary,
                }}
              >
                {[
                  link.document_tunnus,
                  link.document_type_name,
                  link.document_created_at,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const renderVaskiInfo = (
  section: HomeSection,
  tSessions: SessionsTranslation,
) => {
  const hasAny =
    section.vaski_title ||
    section.vaski_document_type_name ||
    section.vaski_summary ||
    section.vaski_subjects ||
    section.vaski_author_first_name ||
    section.vaski_author_last_name ||
    section.vaski_eduskunta_tunnus;

  if (!hasAny) return null;

  const authorLine = formatVaskiAuthor(section);
  const subjects = parseVaskiSubjects(section.vaski_subjects);
  const docNumber =
    typeof section.vaski_document_number === "number" &&
    !Number.isNaN(section.vaski_document_number) &&
    section.vaski_parliamentary_year
      ? `${section.vaski_document_number}/${section.vaski_parliamentary_year}`
      : null;

  return (
    <Box sx={infoBoxSx}>
      <SectionInfoTitle>{tSessions("vaskiDocument")}</SectionInfoTitle>
      {(section.vaski_document_type_name ||
        section.vaski_eduskunta_tunnus ||
        docNumber ||
        section.vaski_status) && (
        <Typography
          sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}
        >
          {[
            section.vaski_document_type_name,
            section.vaski_eduskunta_tunnus,
            docNumber,
            section.vaski_status,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
      )}
      {section.vaski_title && (
        <Typography sx={{ fontSize: "0.84rem", fontWeight: 700, mt: 0.5 }}>
          {section.vaski_title}
        </Typography>
      )}
      {authorLine && (
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            color: colors.textSecondary,
            mt: 0.35,
          }}
        >
          {tSessions("vaskiAuthorLine", { value: authorLine })}
        </Typography>
      )}
      {section.vaski_summary && (
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            color: colors.textSecondary,
            mt: 0.5,
          }}
        >
          {tSessions("vaskiSummaryLine", { value: section.vaski_summary })}
        </Typography>
      )}
      {subjects.length > 0 && (
        <Box sx={{ mt: 0.75, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {subjects.map((subject) => (
            <Chip
              key={subject}
              label={subject}
              size="small"
              sx={{ ...commonStyles.compactChipXs }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const renderMinutesInfo = (
  section: HomeSection,
  tSessions: SessionsTranslation,
) => {
  const hasAny =
    section.minutes_item_title ||
    section.minutes_processing_phase_code ||
    section.minutes_general_processing_phase_code;
  if (!hasAny) return null;

  return (
    <Box sx={infoBoxSx}>
      <SectionInfoTitle>{tSessions("minutesMetadata")}</SectionInfoTitle>
      {section.minutes_item_title && (
        <Typography
          sx={{ ...commonStyles.compactTextLg, color: colors.textSecondary }}
        >
          {tSessions("minutesItemTitleLine", {
            value: section.minutes_item_title,
          })}
        </Typography>
      )}
      {(section.minutes_processing_phase_code ||
        section.minutes_general_processing_phase_code) && (
        <Typography
          sx={{
            ...commonStyles.compactTextLg,
            color: colors.textSecondary,
            mt: 0.35,
          }}
        >
          {tSessions("minutesProcessingCodesLine", {
            value: [
              section.minutes_processing_phase_code,
              section.minutes_general_processing_phase_code,
            ]
              .filter(Boolean)
              .join(" / "),
          })}
        </Typography>
      )}
    </Box>
  );
};

const renderSectionSubSections = (
  rows: SubSection[],
  loading: boolean,
  tSessions: SessionsTranslation,
) => {
  if (loading) return <LoadingBlock label={tSessions("subSections")} />;
  if (rows.length <= 1) return null;

  return (
    <Box sx={infoBoxSx}>
      <SectionInfoTitle>{tSessions("subSections")}</SectionInfoTitle>
      <Box sx={{ overflowX: "auto" }}>
        <Box
          component="table"
          sx={{
            width: "100%",
            borderCollapse: "collapse",
            ...commonStyles.compactTextLg,
            "& th, & td": {
              textAlign: "left",
              borderBottom: `1px solid ${colors.dataBorder}`,
              px: 0.75,
              py: 0.5,
            },
            "& th": {
              color: colors.textSecondary,
              fontWeight: 700,
            },
          }}
        >
          <thead>
            <tr>
              <th>{tSessions("subSectionNumber")}</th>
              <th>{tSessions("subSectionTitle")}</th>
              <th>{tSessions("subSectionDocument")}</th>
              <th>{tSessions("subSectionType")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.section_key}-${row.entry_order}-${row.id}`}>
                <td>{row.item_number || row.entry_order}</td>
                <td>{row.item_title || "-"}</td>
                <td>{row.related_document_identifier || "-"}</td>
                <td>{row.related_document_type || "-"}</td>
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Box>
  );
};

const renderSectionMinutesContent = (
  section: HomeSection,
  subSections: SubSection[],
  rollCallData: SectionRollCallData | null,
  tSessions: SessionsTranslation,
  successColor: string,
) => {
  const subSectionRows = getSectionSubSectionRows(section, subSections);
  if (subSectionRows.length > 1) return null;

  const parsed = parseMinutesContent(section.minutes_content_text);
  const references: MinutesContentReference[] = [...parsed.references];
  const relatedDocument = section.minutes_related_document_identifier?.trim();
  if (
    relatedDocument &&
    !references.some(
      (reference) =>
        reference.code === relatedDocument && reference.vaskiId === null,
    )
  ) {
    references.unshift({ vaskiId: null, code: relatedDocument });
  }
  if (parsed.narrativeBlocks.length === 0 && references.length === 0)
    return null;

  const normalize = (value?: string | null) =>
    value?.trim().toLowerCase() || null;
  const knownRollCallIdentifiers = new Set<string>(
    [
      section.minutes_related_document_identifier,
      rollCallData?.report?.edk_identifier,
      rollCallData?.report?.parliament_identifier,
    ]
      .map((value) => normalize(value))
      .filter((value): value is string => value !== null),
  );
  const minutesReferences: MinutesContentReferenceChip[] = references
    .filter((reference): reference is MinutesContentReference & { code: string } =>
      Boolean(reference.code),
    )
    .map((reference) => {
      const migratedAsRollCall =
        isRollCallSection(section) &&
        knownRollCallIdentifiers.has(normalize(reference.code) || "");

      return {
        code: reference.code,
        href: buildValtiopaivaAsiakirjaUrl(reference.code),
        tooltipTitle: migratedAsRollCall
          ? tSessions("minutesReferenceMigratedRollCall")
          : tSessions("minutesReferenceNotMigrated"),
        migratedAsRollCall,
      };
    });

  return (
    <MinutesContentBlock
      title={tSessions("minutesContent")}
      narrativeBlocks={parsed.narrativeBlocks}
      references={minutesReferences}
      successColor={successColor}
    />
  );
};

const renderSectionNotices = (
  notices: NonNullable<HomeSession["notices"]>,
  tSessions: SessionsTranslation,
) => {
  if (notices.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <SectionInfoTitle>{tSessions("sectionNotices")}</SectionInfoTitle>
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 0.75 }}
      >
        {notices.map((notice) => (
          <Box
            key={notice.id}
            sx={{
              p: 1.1,
              borderRadius: 1.5,
              border: `1px solid ${colors.warning}30`,
              background: `${colors.warning}08`,
            }}
          >
            {notice.notice_type && (
              <Chip
                label={notice.notice_type}
                size="small"
                sx={{
                  ...commonStyles.compactChipXs,
                  background: `${colors.warning}24`,
                  mb: notice.text_fi ? 0.6 : 0,
                }}
              />
            )}
            {notice.text_fi && (
              <Typography
                sx={{ fontSize: "0.8125rem", color: colors.textPrimary }}
              >
                {notice.text_fi}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const renderSectionRollCall = (
  section: HomeSection,
  rollCallData: SectionRollCallData | null,
  loading: boolean,
  loadingLabel: string,
  tSessions: SessionsTranslation,
  themedColors: { success: string; warning: string; error: string },
) => {
  if (loading) return <LoadingBlock label={loadingLabel} />;
  if (!rollCallData || !isRollCallSection(section)) return null;

  const { report, entries } = rollCallData;
  const documentIdentifier =
    report.edk_identifier || report.parliament_identifier;
  const documentUrl = toEduskuntaUrl(
    `/valtiopaivaasiakirjat/${encodeURIComponent(documentIdentifier)}`,
  );

  const formatEntryType = (entryType: RollCallEntry["entry_type"]) =>
    entryType === "late"
      ? tSessions("rollCallLate")
      : tSessions("rollCallAbsent");

  const formatAbsenceReason = (reasonCode?: string | null) => {
    if (!reasonCode) return "-";
    const code = reasonCode.toLowerCase();
    if (code === "e") return tSessions("rollCallReasonE");
    if (code === "h") return tSessions("rollCallReasonH");
    return tSessions("rollCallReasonUnknown");
  };

  return (
    <Box sx={infoBoxSx}>
      <SectionInfoTitle>{tSessions("rollCallReport")}</SectionInfoTitle>
      {report.title && (
        <Typography
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          {report.title}
        </Typography>
      )}
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 0.75 }}>
        <Chip
          label={tSessions("rollCallAbsentLine", {
            count: report.absent_count,
          })}
          size="small"
          sx={{
            ...commonStyles.compactChipSm,
            color: themedColors.error,
            background: `${themedColors.error}12`,
          }}
        />
        <Chip
          label={tSessions("rollCallLateLine", { count: report.late_count })}
          size="small"
          sx={{
            ...commonStyles.compactChipSm,
            color: themedColors.warning,
            background: `${themedColors.warning}12`,
          }}
        />
        <EduskuntaSourceLink
          href={documentUrl}
          sx={{ ...commonStyles.compactTextLg, fontWeight: 700 }}
        >
          {tSessions("rollCallOpenDocument")}
        </EduskuntaSourceLink>
      </Box>
      {entries.length > 0 && (
        <Box sx={{ mt: 1, overflowX: "auto" }}>
          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              ...commonStyles.compactTextLg,
              "& th, & td": {
                textAlign: "left",
                borderBottom: `1px solid ${colors.dataBorder}`,
                px: 0.75,
                py: 0.5,
              },
              "& th": {
                color: colors.textSecondary,
                fontWeight: 700,
              },
            }}
          >
            <thead>
              <tr>
                <th>{tSessions("rollCallTableNumber")}</th>
                <th>{tSessions("rollCallTableName")}</th>
                <th>{tSessions("rollCallTableParty")}</th>
                <th>{tSessions("rollCallTableType")}</th>
                <th>{tSessions("rollCallTableReason")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={`${entry.roll_call_id}-${entry.entry_order}`}>
                  <td>{entry.entry_order}</td>
                  <td>
                    {entry.first_name} {entry.last_name}
                  </td>
                  <td>{entry.party ? entry.party.toUpperCase() : "-"}</td>
                  <td>{formatEntryType(entry.entry_type)}</td>
                  <td>{formatAbsenceReason(entry.absence_reason)}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </Box>
  );
};

const formatSpeechTimeRange = (speech: Speech) => {
  const start = formatTimeFi(speech.start_time);
  if (start === "-") return null;
  const end = formatTimeFi(speech.end_time);
  return end !== "-" ? `${start} - ${end}` : start;
};

const getSectionSubSectionRows = (
  section: HomeSection,
  subSections?: SubSection[],
) => {
  if (subSections && subSections.length > 0) return subSections;
  return buildFallbackSubSections(section);
};

const SectionInfoTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      ...commonStyles.compactTextMd,
      fontWeight: 700,
      color: colors.textTertiary,
      textTransform: "uppercase",
      mb: 0.5,
    }}
  >
    {children}
  </Typography>
);

const infoBoxSx = {
  mt: 1.5,
  p: 1.25,
  borderRadius: 1.5,
  border: `1px solid ${colors.primaryLight}20`,
  background: `${colors.primaryLight}08`,
};
