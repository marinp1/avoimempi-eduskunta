import ArticleIcon from "@mui/icons-material/Article";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { colors } from "#client/theme/index";
import { commonStyles } from "#client/theme";
import { DataCard, PageHeader, VoteMarginBar } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

type DocumentType = {
  document_type_code: string;
  document_type_name: string;
  document_count: number;
  earliest: string;
  latest: string;
};

type DocumentResult = {
  id: number;
  eduskunta_tunnus: string;
  document_type_code: string;
  document_type_name: string;
  document_number: number;
  parliamentary_year: string;
  title: string;
  author_first_name: string;
  author_last_name: string;
  author_role: string;
  creation_date: string;
  status: string;
  summary: string;
  subjects: string | null;
};

type DocumentDetail = DocumentResult & {
  author_organization: string;
  language_code: string;
  publicity_code: string;
  source_reference: string;
};

const PAGE_SIZE = 30;

const Documents = () => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [documents, setDocuments] = useState<DocumentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const [types, setTypes] = useState<DocumentType[]>([]);
  const [years, setYears] = useState<string[]>([]);

  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load document types for filter
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const res = await fetch("/api/documents/by-type");
        if (res.ok) {
          const data: DocumentType[] = await res.json();
          setTypes(data);
          // Extract unique years from earliest/latest range
          const yearSet = new Set<string>();
          for (const t of data) {
            if (t.earliest) yearSet.add(t.earliest.slice(0, 4));
            if (t.latest) yearSet.add(t.latest.slice(0, 4));
          }
          // Also extract from parliamentary years if present
          setYears(Array.from(yearSet).sort().reverse());
        }
      } catch {
        // non-critical
      }
    };
    loadTypes();
  }, []);

  const fetchDocuments = useCallback(
    async (offset = 0) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        if (typeFilter) params.set("type", typeFilter);
        if (yearFilter) params.set("year", yearFilter);
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));

        const res = await fetch(`/api/documents/search?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DocumentResult[] = await res.json();

        if (offset === 0) {
          setDocuments(data);
        } else {
          setDocuments((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
        if (offset === 0) {
          setTotal(data.length === PAGE_SIZE ? PAGE_SIZE + 1 : data.length);
        }
      } catch {
        setError(t("errors.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [search, typeFilter, yearFilter, t],
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  const loadMore = () => {
    fetchDocuments(documents.length);
  };

  const openDetail = async (id: number) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const data: DocumentDetail = await res.json();
        setSelectedDoc(data);
      }
    } catch {
      // handled by empty state
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("fi-FI");
    } catch {
      return dateStr;
    }
  };

  return (
    <Box>
      <PageHeader title={t("documents.title")} subtitle={t("documents.subtitle")} />

      {/* Filters */}
      <DataCard sx={{ p: 2.5, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("documents.searchPlaceholder")}
            size="small"
            sx={{ flex: "1 1 250px", "& .MuiOutlinedInput-root": { background: "#fff" } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: colors.primaryLight }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 180, "& .MuiOutlinedInput-root": { background: "#fff" } }}
            label={t("documents.type")}
          >
            <MenuItem value="">{t("documents.allTypes")}</MenuItem>
            {types.map((dt) => (
              <MenuItem key={dt.document_type_code} value={dt.document_type_code}>
                {dt.document_type_name} ({dt.document_count})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 130, "& .MuiOutlinedInput-root": { background: "#fff" } }}
            label={t("documents.year")}
          >
            <MenuItem value="">{t("documents.allYears")}</MenuItem>
            {years.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Type chips for quick filter */}
        {types.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 2 }}>
            {types.slice(0, 8).map((dt) => (
              <Chip
                key={dt.document_type_code}
                label={`${dt.document_type_code} (${dt.document_count})`}
                size="small"
                onClick={() =>
                  setTypeFilter((prev) =>
                    prev === dt.document_type_code ? "" : dt.document_type_code,
                  )
                }
                sx={{
                  fontSize: "0.6875rem",
                  height: 24,
                  fontWeight: 600,
                  background:
                    typeFilter === dt.document_type_code
                      ? colors.primary
                      : colors.backgroundSubtle,
                  color:
                    typeFilter === dt.document_type_code ? "#fff" : colors.textSecondary,
                  cursor: "pointer",
                  "&:hover": { opacity: 0.85 },
                }}
              />
            ))}
          </Box>
        )}
      </DataCard>

      {/* Results */}
      {loading && documents.length === 0 ? (
        <Box sx={{ ...commonStyles.centeredFlex, py: 4 }}>
          <CircularProgress size={28} sx={{ color: themedColors.primary }} />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : documents.length === 0 ? (
        <DataCard sx={{ p: 4, textAlign: "center" }}>
          <Typography
            variant="h6"
            sx={{ color: colors.textSecondary, mb: 1, fontSize: "1rem" }}
          >
            {t("documents.noResults")}
          </Typography>
          <Typography variant="body2" sx={{ color: colors.textTertiary }}>
            {t("documents.noResultsDescription")}
          </Typography>
        </DataCard>
      ) : (
        <Box>
          <DataCard sx={{ p: 0, overflow: "hidden" }}>
            {documents.map((doc, idx) => (
              <Box
                key={doc.id}
                onClick={() => openDetail(doc.id)}
                sx={{
                  p: 2.5,
                  borderBottom:
                    idx < documents.length - 1
                      ? `1px solid ${colors.dataBorder}`
                      : "none",
                  cursor: "pointer",
                  "&:hover": { background: colors.backgroundSubtle },
                  transition: "background 0.15s",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      background: `${colors.primaryLight}15`,
                      flexShrink: 0,
                      display: { xs: "none", sm: "flex" },
                      alignItems: "center",
                    }}
                  >
                    <ArticleIcon sx={{ fontSize: 20, color: colors.primaryLight }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        label={doc.document_type_code}
                        size="small"
                        sx={{
                          background: colors.primary,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.625rem",
                          height: 20,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: colors.textTertiary,
                        }}
                      >
                        {doc.eduskunta_tunnus}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: colors.textTertiary,
                        }}
                      >
                        {formatDate(doc.creation_date)}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: colors.textPrimary,
                        mb: 0.5,
                        wordBreak: "break-word",
                      }}
                    >
                      {doc.title}
                    </Typography>
                    {(doc.author_first_name || doc.author_last_name) && (
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: colors.textSecondary,
                          mb: 0.5,
                        }}
                      >
                        {doc.author_first_name} {doc.author_last_name}
                        {doc.author_role ? ` (${doc.author_role})` : ""}
                      </Typography>
                    )}
                    {doc.subjects && (
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                        {doc.subjects
                          .split(",")
                          .slice(0, 4)
                          .map((subj, i) => (
                            <Chip
                              key={i}
                              label={subj.trim()}
                              size="small"
                              sx={{
                                fontSize: "0.625rem",
                                height: 18,
                                background: `${colors.primaryLight}10`,
                                color: colors.primaryLight,
                              }}
                            />
                          ))}
                        {doc.subjects.split(",").length > 4 && (
                          <Chip
                            label={`+${doc.subjects.split(",").length - 4}`}
                            size="small"
                            sx={{
                              fontSize: "0.625rem",
                              height: 18,
                              background: colors.backgroundSubtle,
                              color: colors.textTertiary,
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </DataCard>

          {/* Load more */}
          {hasMore && (
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={loadMore}
                disabled={loading}
                sx={{
                  textTransform: "none",
                  borderColor: colors.primaryLight,
                  color: colors.primaryLight,
                  fontSize: "0.8125rem",
                }}
              >
                {loading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                {t("documents.loadMore")}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Document Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 480 },
            background: colors.backgroundDefault,
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "1.125rem",
                color: colors.textPrimary,
              }}
            >
              {t("documents.details")}
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {detailLoading ? (
            <Box sx={{ ...commonStyles.centeredFlex, py: 4 }}>
              <CircularProgress size={28} sx={{ color: themedColors.primary }} />
            </Box>
          ) : selectedDoc ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Header */}
              <Box>
                <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                  <Chip
                    label={selectedDoc.document_type_name}
                    size="small"
                    sx={{
                      background: colors.primary,
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.6875rem",
                    }}
                  />
                  {selectedDoc.status && (
                    <Chip
                      label={selectedDoc.status}
                      size="small"
                      sx={{
                        background: `${themedColors.success}15`,
                        color: themedColors.success,
                        fontWeight: 600,
                        fontSize: "0.6875rem",
                      }}
                    />
                  )}
                </Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: colors.textPrimary,
                    lineHeight: 1.4,
                  }}
                >
                  {selectedDoc.title}
                </Typography>
              </Box>

              {/* Metadata */}
              <DataCard sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: 1,
                    fontSize: "0.8125rem",
                  }}
                >
                  <Typography sx={{ fontWeight: 600, color: colors.textSecondary, fontSize: "0.8125rem" }}>
                    {t("documents.identifier")}
                  </Typography>
                  <Typography sx={{ fontSize: "0.8125rem" }}>{selectedDoc.eduskunta_tunnus}</Typography>

                  <Typography sx={{ fontWeight: 600, color: colors.textSecondary, fontSize: "0.8125rem" }}>
                    {t("documents.type")}
                  </Typography>
                  <Typography sx={{ fontSize: "0.8125rem" }}>{selectedDoc.document_type_name}</Typography>

                  <Typography sx={{ fontWeight: 600, color: colors.textSecondary, fontSize: "0.8125rem" }}>
                    {t("documents.year")}
                  </Typography>
                  <Typography sx={{ fontSize: "0.8125rem" }}>{selectedDoc.parliamentary_year}</Typography>

                  <Typography sx={{ fontWeight: 600, color: colors.textSecondary, fontSize: "0.8125rem" }}>
                    {t("documents.created")}
                  </Typography>
                  <Typography sx={{ fontSize: "0.8125rem" }}>{formatDate(selectedDoc.creation_date)}</Typography>

                  {(selectedDoc.author_first_name || selectedDoc.author_last_name) && (
                    <>
                      <Typography sx={{ fontWeight: 600, color: colors.textSecondary, fontSize: "0.8125rem" }}>
                        {t("documents.author")}
                      </Typography>
                      <Typography sx={{ fontSize: "0.8125rem" }}>
                        {selectedDoc.author_first_name} {selectedDoc.author_last_name}
                        {selectedDoc.author_role ? ` (${selectedDoc.author_role})` : ""}
                        {selectedDoc.author_organization ? `, ${selectedDoc.author_organization}` : ""}
                      </Typography>
                    </>
                  )}

                  {selectedDoc.language_code && (
                    <>
                      <Typography sx={{ fontWeight: 600, color: colors.textSecondary, fontSize: "0.8125rem" }}>
                        {t("documents.language")}
                      </Typography>
                      <Typography sx={{ fontSize: "0.8125rem" }}>{selectedDoc.language_code}</Typography>
                    </>
                  )}
                </Box>
              </DataCard>

              {/* Summary */}
              {selectedDoc.summary && (
                <DataCard sx={{ p: 2 }}>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      color: colors.textSecondary,
                      mb: 1,
                    }}
                  >
                    {t("documents.summary")}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.8125rem",
                      color: colors.textPrimary,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {selectedDoc.summary}
                  </Typography>
                </DataCard>
              )}

              {/* Subjects */}
              {selectedDoc.subjects && (
                <DataCard sx={{ p: 2 }}>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      color: colors.textSecondary,
                      mb: 1,
                    }}
                  >
                    {t("documents.subjects")}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                    {selectedDoc.subjects.split(",").map((subj, i) => (
                      <Chip
                        key={i}
                        label={subj.trim()}
                        size="small"
                        sx={{
                          fontSize: "0.6875rem",
                          background: `${colors.primaryLight}12`,
                          color: colors.primaryLight,
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Box>
                </DataCard>
              )}

              {/* Source reference link */}
              {selectedDoc.source_reference && (
                <DataCard sx={{ p: 2 }}>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      color: colors.textSecondary,
                      mb: 1,
                    }}
                  >
                    {t("documents.source")}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.8125rem",
                      color: colors.primaryLight,
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedDoc.source_reference}
                  </Typography>
                </DataCard>
              )}
            </Box>
          ) : null}
        </Box>
      </Drawer>
    </Box>
  );
};

export default Documents;
