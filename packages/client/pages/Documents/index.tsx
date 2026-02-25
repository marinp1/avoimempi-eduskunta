import { Search as SearchIcon } from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { PageHeader } from "#client/theme/components";
import { colors } from "#client/theme/index";
import {
  CommitteeReportCard,
  type CommitteeReportListItem,
  ExpertStatementCard,
  type ExpertStatementListItem,
  GovernmentProposalCard,
  type GovernmentProposalListItem,
  InterpellationCard,
  type InterpellationListItem,
  LegislativeInitiativeCard,
  type LegislativeInitiativeListItem,
  OralQuestionCard,
  type OralQuestionListItem,
  WrittenQuestionCard,
  type WrittenQuestionListItem,
  WrittenQuestionResponseCard,
  type WrittenQuestionResponseListItem,
} from "./cards";

type DocumentType =
  | "interpellations"
  | "government-proposals"
  | "written-questions"
  | "written-question-responses"
  | "oral-questions"
  | "committee-reports"
  | "legislative-initiatives-law"
  | "legislative-initiatives-budget"
  | "legislative-initiatives-supplementary-budget"
  | "legislative-initiatives-action"
  | "legislative-initiatives-discussion"
  | "legislative-initiatives-citizens"
  | "expert-statements";

const LEGISLATIVE_INITIATIVE_TYPE_BY_DOCUMENT_TYPE: Partial<
  Record<DocumentType, string>
> = {
  "legislative-initiatives-law": "LA",
  "legislative-initiatives-budget": "TAA",
  "legislative-initiatives-supplementary-budget": "LTA",
  "legislative-initiatives-action": "TPA",
  "legislative-initiatives-discussion": "KA",
  "legislative-initiatives-citizens": "KAA",
};

const getDocumentApiConfig = (
  documentType: DocumentType,
): { apiBase: string; initiativeTypeCode: string | null } => {
  if (documentType === "interpellations") {
    return { apiBase: "/api/interpellations", initiativeTypeCode: null };
  }
  if (documentType === "government-proposals") {
    return { apiBase: "/api/government-proposals", initiativeTypeCode: null };
  }
  if (documentType === "oral-questions") {
    return { apiBase: "/api/oral-questions", initiativeTypeCode: null };
  }
  if (documentType === "committee-reports") {
    return { apiBase: "/api/committee-reports", initiativeTypeCode: null };
  }
  if (documentType === "written-questions") {
    return { apiBase: "/api/written-questions", initiativeTypeCode: null };
  }
  if (documentType === "written-question-responses") {
    return {
      apiBase: "/api/written-question-responses",
      initiativeTypeCode: null,
    };
  }
  if (documentType === "expert-statements") {
    return { apiBase: "/api/expert-statements", initiativeTypeCode: null };
  }
  return {
    apiBase: "/api/legislative-initiatives",
    initiativeTypeCode:
      LEGISLATIVE_INITIATIVE_TYPE_BY_DOCUMENT_TYPE[documentType] || null,
  };
};

export default function Documents() {
  const { t } = useTranslation();
  const { selectedHallituskausi } = useHallituskausi();

  // State
  const [documentType, setDocumentType] =
    useState<DocumentType>("interpellations");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<
    (
      | InterpellationListItem
      | GovernmentProposalListItem
      | WrittenQuestionListItem
      | WrittenQuestionResponseListItem
      | OralQuestionListItem
      | CommitteeReportListItem
      | LegislativeInitiativeListItem
      | ExpertStatementListItem
    )[]
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [selectedSourceCommittee, setSelectedSourceCommittee] = useState("all");
  const [selectedRecipientCommittee, setSelectedRecipientCommittee] =
    useState("all");
  const [sourceCommittees, setSourceCommittees] = useState<
    Array<{ committee_name: string; count: number }>
  >([]);
  const [recipientCommittees, setRecipientCommittees] = useState<
    Array<{ committee_name: string; count: number }>
  >([]);
  const [committeeFiltersLoading, setCommitteeFiltersLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [selectedExpertCommittee, setSelectedExpertCommittee] = useState("all");
  const [selectedExpertDocType, setSelectedExpertDocType] = useState("all");
  const [expertCommittees, setExpertCommittees] = useState<
    Array<{ committee_name: string; count: number }>
  >([]);
  const [expertFiltersLoading, setExpertFiltersLoading] = useState(false);

  const limit = 20;

  const { apiBase, initiativeTypeCode } = getDocumentApiConfig(documentType);
  const isLegislativeInitiativeType = initiativeTypeCode !== null;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch years when document type changes
  useEffect(() => {
    const fetchYears = async () => {
      setYearsLoading(true);
      try {
        const params = new URLSearchParams();
        if (initiativeTypeCode) {
          params.set("initiativeTypeCode", initiativeTypeCode);
        }
        if (selectedHallituskausi) {
          params.set("startDate", selectedHallituskausi.startDate);
          if (selectedHallituskausi.endDate) {
            params.set("endDate", selectedHallituskausi.endDate);
          }
        }
        const yearsUrl = `${apiBase}/years${params.toString() ? `?${params}` : ""}`;
        const response = await fetch(yearsUrl);
        if (!response.ok) throw new Error("Failed to fetch years");
        const data = await response.json();
        setYears(data.map((item: { year: number }) => item.year));
      } catch (err) {
        console.error("Error fetching years:", err);
      } finally {
        setYearsLoading(false);
      }
    };
    fetchYears();
  }, [apiBase, initiativeTypeCode, selectedHallituskausi]);

  // Fetch expert statement committees when document type changes
  useEffect(() => {
    if (documentType !== "expert-statements") return;
    setExpertFiltersLoading(true);
    fetch("/api/expert-statements/committees")
      .then((r) => r.json())
      .then((data) => setExpertCommittees(data))
      .catch(() => {})
      .finally(() => setExpertFiltersLoading(false));
  }, [documentType]);

  // Fetch subjects when document type changes (skip committee-reports and expert-statements which has no subject table)
  useEffect(() => {
    if (
      documentType === "committee-reports" ||
      documentType === "expert-statements"
    ) {
      setSubjectOptions([]);
      return;
    }
    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        const response = await fetch(`${apiBase}/subjects`);
        if (!response.ok) throw new Error("Failed to fetch subjects");
        const data: { subject_text: string; count: number }[] =
          await response.json();
        setSubjectOptions(data.map((item) => item.subject_text));
      } catch (err) {
        console.error("Error fetching subjects:", err);
        setSubjectOptions([]);
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchSubjects();
  }, [apiBase, documentType]);

  // Fetch documents
  const fetchDocuments = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: limit.toString(),
        });
        if (debouncedQuery) params.set("q", debouncedQuery);
        if (selectedYear !== "all") params.set("year", selectedYear);
        if (selectedSubject) params.set("subject", selectedSubject);
        if (initiativeTypeCode) {
          params.set("initiativeTypeCode", initiativeTypeCode);
        }
        if (documentType === "committee-reports") {
          if (selectedSourceCommittee !== "all") {
            params.set("sourceCommittee", selectedSourceCommittee);
          }
          if (selectedRecipientCommittee !== "all") {
            params.set("recipientCommittee", selectedRecipientCommittee);
          }
        }
        if (documentType === "expert-statements") {
          if (selectedExpertCommittee !== "all") {
            params.set("committee", selectedExpertCommittee);
          }
          if (selectedExpertDocType !== "all") {
            params.set("docType", selectedExpertDocType);
          }
        }
        if (selectedHallituskausi) {
          params.set("startDate", selectedHallituskausi.startDate);
          if (selectedHallituskausi.endDate) {
            params.set("endDate", selectedHallituskausi.endDate);
          }
        }

        const response = await fetch(`${apiBase}?${params}`);
        if (!response.ok) throw new Error("Failed to fetch documents");

        const data = await response.json();
        setItems(append ? [...items, ...data.items] : data.items);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      debouncedQuery,
      selectedYear,
      selectedSubject,
      items,
      apiBase,
      initiativeTypeCode,
      documentType,
      selectedSourceCommittee,
      selectedRecipientCommittee,
      selectedExpertCommittee,
      selectedExpertDocType,
      selectedHallituskausi,
    ],
  );

  // Reset and fetch on filter change
  useEffect(() => {
    setPage(1);
    fetchDocuments(1, false);
  }, [
    debouncedQuery,
    selectedYear,
    selectedSubject,
    apiBase,
    initiativeTypeCode,
    documentType,
    selectedSourceCommittee,
    selectedRecipientCommittee,
    selectedExpertCommittee,
    selectedExpertDocType,
  ]);

  useEffect(() => {
    if (documentType !== "committee-reports") {
      setSourceCommittees([]);
      setRecipientCommittees([]);
      setCommitteeFiltersLoading(false);
      return;
    }

    const sourceParams = new URLSearchParams();
    if (debouncedQuery) sourceParams.set("q", debouncedQuery);
    if (selectedYear !== "all") sourceParams.set("year", selectedYear);
    if (selectedRecipientCommittee !== "all") {
      sourceParams.set("recipientCommittee", selectedRecipientCommittee);
    }
    if (selectedHallituskausi) {
      sourceParams.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        sourceParams.set("endDate", selectedHallituskausi.endDate);
      }
    }

    const recipientParams = new URLSearchParams();
    if (debouncedQuery) recipientParams.set("q", debouncedQuery);
    if (selectedYear !== "all") recipientParams.set("year", selectedYear);
    if (selectedSourceCommittee !== "all") {
      recipientParams.set("sourceCommittee", selectedSourceCommittee);
    }
    if (selectedHallituskausi) {
      recipientParams.set("startDate", selectedHallituskausi.startDate);
      if (selectedHallituskausi.endDate) {
        recipientParams.set("endDate", selectedHallituskausi.endDate);
      }
    }

    const sourceUrl = `/api/committee-reports/source-committees${sourceParams.toString() ? `?${sourceParams}` : ""}`;
    const recipientUrl = `/api/committee-reports/recipient-committees${recipientParams.toString() ? `?${recipientParams}` : ""}`;

    setCommitteeFiltersLoading(true);
    Promise.all([
      fetch(sourceUrl).then((response) => {
        if (!response.ok) throw new Error("Failed to fetch source committees");
        return response.json();
      }),
      fetch(recipientUrl).then((response) => {
        if (!response.ok)
          throw new Error("Failed to fetch recipient committees");
        return response.json();
      }),
    ])
      .then(([sourceData, recipientData]) => {
        setSourceCommittees(sourceData);
        setRecipientCommittees(recipientData);
        if (
          selectedSourceCommittee !== "all" &&
          !sourceData.some(
            (item: { committee_name: string }) =>
              item.committee_name === selectedSourceCommittee,
          )
        ) {
          setSelectedSourceCommittee("all");
        }
        if (
          selectedRecipientCommittee !== "all" &&
          !recipientData.some(
            (item: { committee_name: string }) =>
              item.committee_name === selectedRecipientCommittee,
          )
        ) {
          setSelectedRecipientCommittee("all");
        }
      })
      .catch((err) => {
        console.error("Error fetching committee filters:", err);
        setSourceCommittees([]);
        setRecipientCommittees([]);
      })
      .finally(() => {
        setCommitteeFiltersLoading(false);
      });
  }, [
    documentType,
    debouncedQuery,
    selectedYear,
    selectedSourceCommittee,
    selectedRecipientCommittee,
    selectedHallituskausi,
  ]);

  // Reset filters when document type changes
  const handleDocumentTypeChange = (newType: DocumentType) => {
    setDocumentType(newType);
    setSelectedYear("all");
    setSelectedSubject(null);
    setSubjectOptions([]);
    setSelectedSourceCommittee("all");
    setSelectedRecipientCommittee("all");
    setSourceCommittees([]);
    setRecipientCommittees([]);
    setSelectedExpertCommittee("all");
    setSelectedExpertDocType("all");
    setExpertCommittees([]);
    setSearchQuery("");
    setDebouncedQuery("");
    setItems([]);
    setTotalCount(0);
    setTotalPages(0);
    setPage(1);
  };

  // Load more handler
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDocuments(nextPage, true);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title={t("documents.title")}
        subtitle={t("documents.subtitle")}
      />

      <Stack spacing={3}>
        {/* Search field */}
        <TextField
          fullWidth
          placeholder={t("documents.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.textSecondary }} />
              </InputAdornment>
            ),
          }}
          sx={{
            backgroundColor: colors.backgroundDefault,
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: colors.dataBorder,
              },
            },
          }}
        />

        {/* Filter row */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel>{t("documents.type")}</InputLabel>
            <Select
              value={documentType}
              label={t("documents.type")}
              onChange={(e) =>
                handleDocumentTypeChange(e.target.value as DocumentType)
              }
              sx={{
                backgroundColor: colors.backgroundDefault,
              }}
            >
              <MenuItem value="interpellations">
                {t("documents.interpellations")}
              </MenuItem>
              <MenuItem value="government-proposals">
                {t("documents.governmentProposals")}
              </MenuItem>
              <MenuItem value="written-questions">
                {t("documents.writtenQuestions")}
              </MenuItem>
              <MenuItem value="written-question-responses">
                {t("documents.writtenQuestionResponses")}
              </MenuItem>
              <MenuItem value="expert-statements">
                {t("documents.expertStatements")}
              </MenuItem>
              <MenuItem value="oral-questions">
                {t("documents.oralQuestions")}
              </MenuItem>
              <MenuItem value="committee-reports">
                {t("documents.committeeReports")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-law">
                {t("documents.legislativeInitiativesLaw")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-budget">
                {t("documents.legislativeInitiativesBudget")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-supplementary-budget">
                {t("documents.legislativeInitiativesSupplementaryBudget")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-action">
                {t("documents.legislativeInitiativesAction")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-discussion">
                {t("documents.legislativeInitiativesDiscussion")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-citizens">
                {t("documents.legislativeInitiativesCitizens")}
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>{t("documents.year")}</InputLabel>
            <Select
              value={selectedYear}
              label={t("documents.year")}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={yearsLoading}
              sx={{
                backgroundColor: colors.backgroundDefault,
              }}
            >
              <MenuItem value="all">{t("documents.allYears")}</MenuItem>
              {years.map((year) => (
                <MenuItem key={year} value={year.toString()}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {documentType === "committee-reports" && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>{t("documents.sourceCommitteeFilter")}</InputLabel>
              <Select
                value={selectedSourceCommittee}
                label={t("documents.sourceCommitteeFilter")}
                onChange={(e) => setSelectedSourceCommittee(e.target.value)}
                disabled={committeeFiltersLoading}
                sx={{
                  backgroundColor: colors.backgroundDefault,
                }}
              >
                <MenuItem value="all">
                  {t("documents.allSourceCommittees")}
                </MenuItem>
                {sourceCommittees.map((item) => (
                  <MenuItem
                    key={item.committee_name}
                    value={item.committee_name}
                  >
                    {item.committee_name} ({item.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>{t("documents.targetCommitteeFilter")}</InputLabel>
              <Select
                value={selectedRecipientCommittee}
                label={t("documents.targetCommitteeFilter")}
                onChange={(e) => setSelectedRecipientCommittee(e.target.value)}
                disabled={committeeFiltersLoading}
                sx={{
                  backgroundColor: colors.backgroundDefault,
                }}
              >
                <MenuItem value="all">
                  {t("documents.allTargetCommittees")}
                </MenuItem>
                {recipientCommittees.map((item) => (
                  <MenuItem
                    key={item.committee_name}
                    value={item.committee_name}
                  >
                    {item.committee_name} ({item.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        )}

        {documentType === "expert-statements" && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>{t("documents.committeeFilter")}</InputLabel>
              <Select
                value={selectedExpertCommittee}
                label={t("documents.committeeFilter")}
                onChange={(e) => setSelectedExpertCommittee(e.target.value)}
                disabled={expertFiltersLoading}
                sx={{ backgroundColor: colors.backgroundDefault }}
              >
                <MenuItem value="all">{t("documents.allCommittees")}</MenuItem>
                {expertCommittees.map((item) => (
                  <MenuItem
                    key={item.committee_name}
                    value={item.committee_name}
                  >
                    {item.committee_name} ({item.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t("documents.documentSubtype")}</InputLabel>
              <Select
                value={selectedExpertDocType}
                label={t("documents.documentSubtype")}
                onChange={(e) => setSelectedExpertDocType(e.target.value)}
                sx={{ backgroundColor: colors.backgroundDefault }}
              >
                <MenuItem value="all">{t("documents.allTypes")}</MenuItem>
                <MenuItem value="asiantuntijalausunto">
                  {t("documents.expertStatement")}
                </MenuItem>
                <MenuItem value="asiantuntijalausunnon_liite">
                  {t("documents.expertStatementAttachment")}
                </MenuItem>
                <MenuItem value="asiantuntijasuunnitelma">
                  {t("documents.expertHearingPlan")}
                </MenuItem>
              </Select>
            </FormControl>
          </Stack>
        )}

        {/* Subject filter (not shown for committee-reports or expert-statements) */}
        {documentType !== "committee-reports" &&
          documentType !== "expert-statements" && (
            <Autocomplete
              options={subjectOptions}
              value={selectedSubject}
              onChange={(_event, newValue) => setSelectedSubject(newValue)}
              loading={subjectsLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("documents.subjectFilter")}
                  sx={{
                    backgroundColor: colors.backgroundDefault,
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: colors.dataBorder,
                      },
                    },
                  }}
                />
              )}
            />
          )}

        {/* Result count */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography variant="body2" color={colors.textSecondary}>
            {t("documents.resultsSummary", {
              shown: items.length,
              total: totalCount,
              count: totalCount,
            })}
          </Typography>
        </Box>
        {selectedHallituskausi && (
          <Alert severity="info">
            Rajattu hallituskauteen: {selectedHallituskausi.label}
          </Alert>
        )}

        {/* Results */}
        {loading && page === 1 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h6" color={colors.textSecondary}>
              {t("documents.noResults")}
            </Typography>
            <Typography variant="body2" color={colors.textSecondary}>
              {t("documents.noResultsDescription")}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {documentType === "interpellations"
              ? (items as InterpellationListItem[]).map((item) => (
                  <InterpellationCard
                    key={item.id}
                    item={item}
                    onSubjectClick={setSelectedSubject}
                  />
                ))
              : documentType === "government-proposals"
                ? (items as GovernmentProposalListItem[]).map((item) => (
                    <GovernmentProposalCard
                      key={item.id}
                      item={item}
                      onSubjectClick={setSelectedSubject}
                    />
                  ))
                : documentType === "oral-questions"
                  ? (items as OralQuestionListItem[]).map((item) => (
                      <OralQuestionCard
                        key={item.id}
                        item={item}
                        onSubjectClick={setSelectedSubject}
                      />
                    ))
                  : isLegislativeInitiativeType
                    ? (items as LegislativeInitiativeListItem[]).map((item) => (
                        <LegislativeInitiativeCard
                          key={item.id}
                          item={item}
                          onSubjectClick={setSelectedSubject}
                        />
                      ))
                    : documentType === "committee-reports"
                      ? (items as CommitteeReportListItem[]).map((item) => (
                          <CommitteeReportCard key={item.id} item={item} />
                        ))
                      : documentType === "written-question-responses"
                        ? (items as WrittenQuestionResponseListItem[]).map(
                            (item) => (
                              <WrittenQuestionResponseCard
                                key={item.id}
                                item={item}
                                onSubjectClick={setSelectedSubject}
                              />
                            ),
                          )
                        : documentType === "expert-statements"
                          ? (items as ExpertStatementListItem[]).map((item) => (
                              <ExpertStatementCard key={item.id} item={item} />
                            ))
                          : (items as WrittenQuestionListItem[]).map((item) => (
                              <WrittenQuestionCard
                                key={item.id}
                                item={item}
                                onSubjectClick={setSelectedSubject}
                              />
                            ))}

            {/* Load more button */}
            {page < totalPages && (
              <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleLoadMore}
                  disabled={loading}
                  sx={{
                    color: colors.primary,
                    borderColor: colors.primary,
                    "&:hover": {
                      borderColor: colors.primary,
                      backgroundColor: colors.primaryLight,
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : (
                    t("documents.loadMore")
                  )}
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
