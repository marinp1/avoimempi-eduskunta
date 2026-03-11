import { Search as SearchIcon } from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useHallituskausi } from "#client/filters/HallituskausiContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { PageIntro } from "#client/theme/components";
import { colors } from "#client/theme/index";
import { apiFetch } from "#client/utils/fetch";
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
  ParliamentAnswerCard,
  type ParliamentAnswerListItem,
  WrittenQuestionCard,
  type WrittenQuestionListItem,
  WrittenQuestionResponseCard,
  type WrittenQuestionResponseListItem,
} from "./cards";
import {
  DocumentsEmptyState,
  DocumentsFilterPanel,
  DocumentsLoadingState,
} from "./components";

type SubjectsRoute =
  | "/api/interpellations/subjects"
  | "/api/government-proposals/subjects"
  | "/api/written-questions/subjects"
  | "/api/oral-questions/subjects"
  | "/api/legislative-initiatives/subjects";

const SUBJECTS_API_PATH: Partial<Record<string, SubjectsRoute>> = {
  "/api/interpellations": "/api/interpellations/subjects",
  "/api/government-proposals": "/api/government-proposals/subjects",
  "/api/written-questions": "/api/written-questions/subjects",
  "/api/oral-questions": "/api/oral-questions/subjects",
  "/api/legislative-initiatives": "/api/legislative-initiatives/subjects",
};

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
  | "expert-statements"
  | "parliament-answers";

const DEFAULT_DOCUMENT_TYPE: DocumentType = "interpellations";

const VALID_TYPES: DocumentType[] = [
  "interpellations",
  "government-proposals",
  "written-questions",
  "written-question-responses",
  "oral-questions",
  "committee-reports",
  "legislative-initiatives-law",
  "legislative-initiatives-budget",
  "legislative-initiatives-supplementary-budget",
  "legislative-initiatives-action",
  "legislative-initiatives-discussion",
  "legislative-initiatives-citizens",
  "expert-statements",
  "parliament-answers",
];

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

const getDocumentApiConfig = (documentType: DocumentType) => {
  if (documentType === "interpellations") {
    return {
      apiBase: "/api/interpellations",
      initiativeTypeCode: null,
    } as const;
  }
  if (documentType === "government-proposals") {
    return {
      apiBase: "/api/government-proposals",
      initiativeTypeCode: null,
    } as const;
  }
  if (documentType === "oral-questions") {
    return {
      apiBase: "/api/oral-questions",
      initiativeTypeCode: null,
    } as const;
  }
  if (documentType === "committee-reports") {
    return {
      apiBase: "/api/committee-reports",
      initiativeTypeCode: null,
    } as const;
  }
  if (documentType === "written-questions") {
    return {
      apiBase: "/api/written-questions",
      initiativeTypeCode: null,
    } as const;
  }
  if (documentType === "written-question-responses") {
    return {
      apiBase: "/api/written-question-responses",
      initiativeTypeCode: null,
    } as const;
  }
  if (documentType === "expert-statements") {
    return {
      apiBase: "/api/expert-statements",
      initiativeTypeCode: null,
    } as const;
  }
  if (documentType === "parliament-answers") {
    return {
      apiBase: "/api/parliament-answers",
      initiativeTypeCode: null,
    } as const;
  }
  return {
    apiBase: "/api/legislative-initiatives",
    initiativeTypeCode:
      LEGISLATIVE_INITIATIVE_TYPE_BY_DOCUMENT_TYPE[documentType] || null,
  } as const;
};

const normalizeParam = (value: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const DocumentsResultsList = memo(function DocumentsResultsList({
  documentType,
  isLegislativeInitiativeType,
  items,
  onSubjectClick,
}: {
  documentType: DocumentType;
  isLegislativeInitiativeType: boolean;
  items: (
    | InterpellationListItem
    | GovernmentProposalListItem
    | WrittenQuestionListItem
    | WrittenQuestionResponseListItem
    | OralQuestionListItem
    | CommitteeReportListItem
    | LegislativeInitiativeListItem
    | ExpertStatementListItem
    | ParliamentAnswerListItem
  )[];
  onSubjectClick: (subject: string) => void;
}) {
  if (documentType === "interpellations") {
    return (
      <>
        {(items as InterpellationListItem[]).map((item) => (
          <InterpellationCard
            key={item.id}
            item={item}
            onSubjectClick={onSubjectClick}
          />
        ))}
      </>
    );
  }

  if (documentType === "government-proposals") {
    return (
      <>
        {(items as GovernmentProposalListItem[]).map((item) => (
          <GovernmentProposalCard
            key={item.id}
            item={item}
            onSubjectClick={onSubjectClick}
          />
        ))}
      </>
    );
  }

  if (documentType === "oral-questions") {
    return (
      <>
        {(items as OralQuestionListItem[]).map((item) => (
          <OralQuestionCard
            key={item.id}
            item={item}
            onSubjectClick={onSubjectClick}
          />
        ))}
      </>
    );
  }

  if (isLegislativeInitiativeType) {
    return (
      <>
        {(items as LegislativeInitiativeListItem[]).map((item) => (
          <LegislativeInitiativeCard
            key={item.id}
            item={item}
            onSubjectClick={onSubjectClick}
          />
        ))}
      </>
    );
  }

  if (documentType === "committee-reports") {
    return (
      <>
        {(items as CommitteeReportListItem[]).map((item) => (
          <CommitteeReportCard key={item.id} item={item} />
        ))}
      </>
    );
  }

  if (documentType === "written-question-responses") {
    return (
      <>
        {(items as WrittenQuestionResponseListItem[]).map((item) => (
          <WrittenQuestionResponseCard
            key={item.id}
            item={item}
            onSubjectClick={onSubjectClick}
          />
        ))}
      </>
    );
  }

  if (documentType === "expert-statements") {
    return (
      <>
        {(items as ExpertStatementListItem[]).map((item) => (
          <ExpertStatementCard key={item.id} item={item} />
        ))}
      </>
    );
  }

  if (documentType === "parliament-answers") {
    return (
      <>
        {(items as ParliamentAnswerListItem[]).map((item) => (
          <ParliamentAnswerCard
            key={item.id}
            item={item}
            onSubjectClick={onSubjectClick}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {(items as WrittenQuestionListItem[]).map((item) => (
        <WrittenQuestionCard
          key={item.id}
          item={item}
          onSubjectClick={onSubjectClick}
        />
      ))}
    </>
  );
});

export default function Documents() {
  const { t } = useScopedTranslation("documents");
  const { selectedHallituskausi } = useHallituskausi();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [documentType, setDocumentType] = useState<DocumentType>(
    DEFAULT_DOCUMENT_TYPE,
  );
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
      | ParliamentAnswerListItem
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

  const getDocumentTypeLabel = useCallback(
    (value: DocumentType) => {
      const labelByType: Record<DocumentType, string> = {
        interpellations: t("interpellations"),
        "government-proposals": t("governmentProposals"),
        "written-questions": t("writtenQuestions"),
        "written-question-responses": t("writtenQuestionResponses"),
        "oral-questions": t("oralQuestions"),
        "committee-reports": t("committeeReports"),
        "legislative-initiatives-law": t("legislativeInitiativesLaw"),
        "legislative-initiatives-budget": t("legislativeInitiativesBudget"),
        "legislative-initiatives-supplementary-budget": t(
          "legislativeInitiativesSupplementaryBudget",
        ),
        "legislative-initiatives-action": t("legislativeInitiativesAction"),
        "legislative-initiatives-discussion": t(
          "legislativeInitiativesDiscussion",
        ),
        "legislative-initiatives-citizens": t("legislativeInitiativesCitizens"),
        "expert-statements": t("expertStatements"),
        "parliament-answers": t("parliamentAnswers"),
      };
      return labelByType[value];
    },
    [t],
  );

  const resetTypeScopedFilters = useCallback(() => {
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
    setItems([]);
    setTotalCount(0);
    setTotalPages(0);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setSearchQuery("");
      setDebouncedQuery("");
      resetTypeScopedFilters();
    });
  }, [resetTypeScopedFilters]);

  const handleDocumentTypeChange = useCallback(
    (newType: DocumentType) => {
      startTransition(() => {
        setDocumentType(newType);
        setSearchQuery("");
        setDebouncedQuery("");
        resetTypeScopedFilters();
      });
    },
    [resetTypeScopedFilters],
  );

  useEffect(() => {
    const applyUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      const typeParam = params.get("type") as DocumentType | null;
      const nextType =
        typeParam && VALID_TYPES.includes(typeParam)
          ? typeParam
          : DEFAULT_DOCUMENT_TYPE;

      setDocumentType(nextType);
      setSearchQuery(params.get("q") ?? "");
      setDebouncedQuery(params.get("q") ?? "");
      setSelectedYear(params.get("year") ?? "all");
      setSelectedSubject(normalizeParam(params.get("subject")));
      setSelectedSourceCommittee(params.get("sourceCommittee") ?? "all");
      setSelectedRecipientCommittee(params.get("recipientCommittee") ?? "all");
      setSelectedExpertCommittee(params.get("committee") ?? "all");
      setSelectedExpertDocType(params.get("docType") ?? "all");
      setItems([]);
      setTotalCount(0);
      setTotalPages(0);
      setPage(1);
    };

    applyUrlState();
    window.addEventListener("popstate", applyUrlState);
    return () => window.removeEventListener("popstate", applyUrlState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("type", documentType);
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (selectedYear !== "all") params.set("year", selectedYear);
    if (selectedSubject) params.set("subject", selectedSubject);
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
    const nextUrl = `/asiakirjat${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [
    documentType,
    debouncedQuery,
    selectedYear,
    selectedSubject,
    selectedSourceCommittee,
    selectedRecipientCommittee,
    selectedExpertCommittee,
    selectedExpertDocType,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
        const yearsUrl =
          `${apiBase}/years${params.toString() ? (`?${params}` as const) : ""}` as const;
        const response = await apiFetch(yearsUrl);
        if (!response.ok) throw new Error("Failed to fetch years");
        const data = await response.json();
        setYears(data.map((item) => +item.year));
      } catch (err) {
        console.error("Error fetching years:", err);
      } finally {
        setYearsLoading(false);
      }
    };
    fetchYears();
  }, [apiBase, initiativeTypeCode, selectedHallituskausi]);

  useEffect(() => {
    if (documentType !== "expert-statements") return;
    setExpertFiltersLoading(true);
    apiFetch("/api/expert-statements/committees")
      .then((r) => r.json())
      .then((data) => setExpertCommittees(data))
      .catch(() => {})
      .finally(() => setExpertFiltersLoading(false));
  }, [documentType]);

  useEffect(() => {
    const subjectsPath = SUBJECTS_API_PATH[apiBase];
    if (!subjectsPath) {
      setSubjectOptions([]);
      return;
    }
    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        const response = await apiFetch(subjectsPath);
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
  }, [apiBase]);

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

        const response = await apiFetch(`${apiBase}?${params}`);
        if (!response.ok) throw new Error("Failed to fetch documents");

        const data = await response.json();
        startTransition(() => {
          setItems((previous) =>
            append ? [...previous, ...data.items] : data.items,
          );
          setTotalCount(data.totalCount);
          setTotalPages(data.totalPages);
        });
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      apiBase,
      debouncedQuery,
      documentType,
      initiativeTypeCode,
      selectedExpertCommittee,
      selectedExpertDocType,
      selectedHallituskausi,
      selectedRecipientCommittee,
      selectedSourceCommittee,
      selectedSubject,
      selectedYear,
    ],
  );

  useEffect(() => {
    setPage(1);
    fetchDocuments(1, false);
  }, [
    fetchDocuments,
    documentType,
    debouncedQuery,
    selectedYear,
    selectedSubject,
    selectedSourceCommittee,
    selectedRecipientCommittee,
    selectedExpertCommittee,
    selectedExpertDocType,
    selectedHallituskausi,
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

    const sourceUrl =
      `/api/committee-reports/source-committees${sourceParams.toString() ? (`?${sourceParams}` as const) : ""}` as const;
    const recipientUrl =
      `/api/committee-reports/recipient-committees${recipientParams.toString() ? (`?${recipientParams}` as const) : ""}` as const;

    setCommitteeFiltersLoading(true);
    Promise.all([
      apiFetch(sourceUrl).then((response) => {
        if (!response.ok) throw new Error("Failed to fetch source committees");
        return response.json();
      }),
      apiFetch(recipientUrl).then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch recipient committees");
        }
        return response.json();
      }),
    ])
      .then(([sourceData, recipientData]) => {
        setSourceCommittees(sourceData);
        setRecipientCommittees(recipientData);
        if (
          selectedSourceCommittee !== "all" &&
          !sourceData.some(
            (item) => item.committee_name === selectedSourceCommittee,
          )
        ) {
          setSelectedSourceCommittee("all");
        }
        if (
          selectedRecipientCommittee !== "all" &&
          !recipientData.some(
            (item) => item.committee_name === selectedRecipientCommittee,
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
    debouncedQuery,
    documentType,
    selectedHallituskausi,
    selectedRecipientCommittee,
    selectedSourceCommittee,
    selectedYear,
  ]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDocuments(nextPage, true);
  }, [fetchDocuments, page]);

  const handleSubjectClick = useCallback((subject: string) => {
    setSelectedSubject(subject);
  }, []);

  const canClearFilters =
    searchQuery.trim().length > 0 ||
    selectedYear !== "all" ||
    !!selectedSubject ||
    selectedSourceCommittee !== "all" ||
    selectedRecipientCommittee !== "all" ||
    selectedExpertCommittee !== "all" ||
    selectedExpertDocType !== "all";

  const activeFilters = useMemo(
    () =>
      [
        searchQuery.trim()
          ? {
              key: "q",
              label: `${t("searchLabel")}: ${searchQuery.trim()}`,
              onDelete: () => {
                startTransition(() => {
                  setSearchQuery("");
                  setDebouncedQuery("");
                });
              },
            }
          : null,
        selectedYear !== "all"
          ? {
              key: "year",
              label: `${t("year")}: ${selectedYear}`,
              onDelete: () => setSelectedYear("all"),
            }
          : null,
        selectedSubject
          ? {
              key: "subject",
              label: `${t("subjectFilter")}: ${selectedSubject}`,
              onDelete: () => setSelectedSubject(null),
            }
          : null,
        selectedSourceCommittee !== "all"
          ? {
              key: "sourceCommittee",
              label: `${t("sourceCommitteeFilter")}: ${selectedSourceCommittee}`,
              onDelete: () => setSelectedSourceCommittee("all"),
            }
          : null,
        selectedRecipientCommittee !== "all"
          ? {
              key: "recipientCommittee",
              label: `${t("targetCommitteeFilter")}: ${selectedRecipientCommittee}`,
              onDelete: () => setSelectedRecipientCommittee("all"),
            }
          : null,
        selectedExpertCommittee !== "all"
          ? {
              key: "committee",
              label: `${t("committeeFilter")}: ${selectedExpertCommittee}`,
              onDelete: () => setSelectedExpertCommittee("all"),
            }
          : null,
        selectedExpertDocType !== "all"
          ? {
              key: "docType",
              label: `${t("documentSubtype")}: ${selectedExpertDocType}`,
              onDelete: () => setSelectedExpertDocType("all"),
            }
          : null,
      ].filter(Boolean) as Array<{
        key: string;
        label: string;
        onDelete: () => void;
      }>,
    [
      searchQuery,
      selectedYear,
      selectedSubject,
      selectedSourceCommittee,
      selectedRecipientCommittee,
      selectedExpertCommittee,
      selectedExpertDocType,
      t,
    ],
  );

  return (
    <Box sx={{ p: { xs: 0, md: 2.5 } }}>
      <Stack spacing={3}>
        <PageIntro
          title={t("title")}
          summary={
            selectedHallituskausi
              ? t("summaryTypePeriod", {
                  value: getDocumentTypeLabel(documentType),
                  period: selectedHallituskausi.label,
                })
              : t("summaryType", {
                  value: getDocumentTypeLabel(documentType),
                })
          }
          mobileMode="compact"
          mobileAnchorId="documents-content"
          mobileSummary={
            <Box>
              <Alert
                severity="info"
                sx={{
                  py: 0,
                  borderRadius: 1.5,
                  backgroundColor: "rgba(37, 99, 235, 0.08)",
                }}
              >
                {t("resultsSummary", {
                  shown: items.length,
                  total: totalCount,
                  count: totalCount,
                })}
              </Alert>
            </Box>
          }
          chips={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={t("resultsSummary", {
                  shown: items.length,
                  total: totalCount,
                  count: totalCount,
                })}
                sx={{
                  backgroundColor: `${colors.primary}10`,
                  color: colors.primary,
                  fontWeight: 700,
                }}
              />
              <Chip
                label={
                  selectedHallituskausi
                    ? t("hallituskausiLabel", {
                        value: selectedHallituskausi.label,
                      })
                    : t("browseTypeLabel", {
                        value: getDocumentTypeLabel(documentType),
                      })
                }
                variant="outlined"
                sx={{
                  borderColor: `${colors.primary}30`,
                  backgroundColor: "rgba(255,255,255,0.72)",
                  color: colors.textSecondary,
                }}
              />
            </Stack>
          }
          actions={
            canClearFilters ? (
              <Chip
                label={t("clearFilters")}
                onClick={clearFilters}
                onDelete={clearFilters}
                sx={{
                  backgroundColor: "rgba(255,255,255,0.8)",
                  color: colors.primary,
                  fontWeight: 700,
                }}
              />
            ) : undefined
          }
          meta={
            <Stack spacing={1}>
              {selectedHallituskausi ? (
                <Alert
                  severity="info"
                  sx={{
                    py: 0,
                    borderRadius: 1.5,
                    backgroundColor: "rgba(37, 99, 235, 0.08)",
                  }}
                >
                  {t("hallituskausiNotice", {
                    value: selectedHallituskausi.label,
                  })}
                </Alert>
              ) : null}
              {!isMobile && activeFilters.length > 0 ? (
                <Box>
                  <Chip
                    label={t("activeFilters")}
                    size="small"
                    sx={{
                      mb: 1,
                      backgroundColor: `${colors.primary}08`,
                      color: colors.primary,
                      fontWeight: 700,
                    }}
                  />
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {activeFilters.map((filter) => (
                      <Chip
                        key={filter.key}
                        label={filter.label}
                        onDelete={filter.onDelete}
                        sx={{
                          backgroundColor: "rgba(255,255,255,0.84)",
                          color: colors.primary,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : null}
            </Stack>
          }
          variant="feature"
        />

        <Box id="documents-content">
          <DocumentsFilterPanel
          secondaryFilters={
            <>
              {documentType === "committee-reports" && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>{t("sourceCommitteeFilter")}</InputLabel>
                    <Select
                      value={selectedSourceCommittee}
                      label={t("sourceCommitteeFilter")}
                      onChange={(e) =>
                        setSelectedSourceCommittee(e.target.value)
                      }
                      disabled={committeeFiltersLoading}
                      sx={{ backgroundColor: colors.backgroundDefault }}
                    >
                      <MenuItem value="all">
                        {t("allSourceCommittees")}
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
                    <InputLabel>{t("targetCommitteeFilter")}</InputLabel>
                    <Select
                      value={selectedRecipientCommittee}
                      label={t("targetCommitteeFilter")}
                      onChange={(e) =>
                        setSelectedRecipientCommittee(e.target.value)
                      }
                      disabled={committeeFiltersLoading}
                      sx={{ backgroundColor: colors.backgroundDefault }}
                    >
                      <MenuItem value="all">
                        {t("allTargetCommittees")}
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
                </>
              )}

              {documentType === "expert-statements" && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>{t("committeeFilter")}</InputLabel>
                    <Select
                      value={selectedExpertCommittee}
                      label={t("committeeFilter")}
                      onChange={(e) =>
                        setSelectedExpertCommittee(e.target.value)
                      }
                      disabled={expertFiltersLoading}
                      sx={{ backgroundColor: colors.backgroundDefault }}
                    >
                      <MenuItem value="all">{t("allCommittees")}</MenuItem>
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
                    <InputLabel>{t("documentSubtype")}</InputLabel>
                    <Select
                      value={selectedExpertDocType}
                      label={t("documentSubtype")}
                      onChange={(e) => setSelectedExpertDocType(e.target.value)}
                      sx={{ backgroundColor: colors.backgroundDefault }}
                    >
                      <MenuItem value="all">{t("allTypes")}</MenuItem>
                      <MenuItem value="asiantuntijalausunto">
                        {t("expertStatement")}
                      </MenuItem>
                      <MenuItem value="asiantuntijalausunnon_liite">
                        {t("expertStatementAttachment")}
                      </MenuItem>
                      <MenuItem value="asiantuntijasuunnitelma">
                        {t("expertHearingPlan")}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}

              {documentType !== "committee-reports" &&
                documentType !== "expert-statements" && (
                  <Autocomplete
                    options={subjectOptions}
                    value={selectedSubject}
                    onChange={(_event, newValue) =>
                      setSelectedSubject(newValue)
                    }
                    loading={subjectsLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("subjectFilter")}
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
            </>
          }
        >
          <TextField
            fullWidth
            label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
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
              gridColumn: { md: "span 1" },
              backgroundColor: colors.backgroundDefault,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: colors.dataBorder,
                },
              },
            }}
          />

          <FormControl fullWidth>
            <InputLabel>{t("type")}</InputLabel>
            <Select
              value={documentType}
              label={t("type")}
              onChange={(e) =>
                handleDocumentTypeChange(e.target.value as DocumentType)
              }
              sx={{ backgroundColor: colors.backgroundDefault }}
            >
              <MenuItem value="interpellations">
                {t("interpellations")}
              </MenuItem>
              <MenuItem value="government-proposals">
                {t("governmentProposals")}
              </MenuItem>
              <MenuItem value="written-questions">
                {t("writtenQuestions")}
              </MenuItem>
              <MenuItem value="written-question-responses">
                {t("writtenQuestionResponses")}
              </MenuItem>
              <MenuItem value="expert-statements">
                {t("expertStatements")}
              </MenuItem>
              <MenuItem value="oral-questions">{t("oralQuestions")}</MenuItem>
              <MenuItem value="committee-reports">
                {t("committeeReports")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-law">
                {t("legislativeInitiativesLaw")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-budget">
                {t("legislativeInitiativesBudget")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-supplementary-budget">
                {t("legislativeInitiativesSupplementaryBudget")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-action">
                {t("legislativeInitiativesAction")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-discussion">
                {t("legislativeInitiativesDiscussion")}
              </MenuItem>
              <MenuItem value="legislative-initiatives-citizens">
                {t("legislativeInitiativesCitizens")}
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>{t("year")}</InputLabel>
            <Select
              value={selectedYear}
              label={t("year")}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={yearsLoading}
              sx={{ backgroundColor: colors.backgroundDefault }}
            >
              <MenuItem value="all">{t("allYears")}</MenuItem>
              {years.map((year) => (
                <MenuItem key={year} value={year.toString()}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          </DocumentsFilterPanel>
        </Box>

        {loading && page === 1 ? (
          <DocumentsLoadingState />
        ) : items.length === 0 ? (
          <DocumentsEmptyState
            title={t("noResults")}
            description={t("noResultsDescription")}
            clearLabel={t("clearFilters")}
            onClear={canClearFilters ? clearFilters : undefined}
          />
        ) : (
          <Stack spacing={2}>
            <DocumentsResultsList
              documentType={documentType}
              isLegislativeInitiativeType={isLegislativeInitiativeType}
              items={items}
              onSubjectClick={handleSubjectClick}
            />

            {page < totalPages && (
              <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                <Stack spacing={1} alignItems="center">
                  <Box
                    component="button"
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loading}
                    sx={{
                      border: `1px solid ${colors.primary}`,
                      backgroundColor: colors.backgroundPaper,
                      color: colors.primary,
                      borderRadius: 999,
                      px: 3,
                      py: 1.2,
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: `${colors.primary}08`,
                      },
                      "&:disabled": {
                        cursor: "wait",
                        opacity: 0.7,
                      },
                    }}
                  >
                    {loading ? t("loadingMore") : t("loadMore")}
                  </Box>
                  {loading && page > 1 && <CircularProgress size={24} />}
                </Stack>
              </Box>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
