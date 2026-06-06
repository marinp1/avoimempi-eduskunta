import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LaunchIcon from "@mui/icons-material/Launch";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";
import { SectionShell } from "../components/SectionShell";
import { SpeechConversationDrawer } from "../components/SpeechConversationDrawer";
import type { ProfileSectionProps } from "./registry";

interface Speech {
  id: number;
  section_key: string;
  session_key: string | null;
  speech_type: string | null;
  start_time: string | null;
  end_time: string | null;
  content: string | null;
  word_count: number | null;
  section_title: string | null;
  section_identifier: string | null;
  document: string | null;
}

interface SpeechesResponse {
  speeches: any[];
  total: number;
}

const PAGE_SIZE = 50;
const INLINE_WORD_LIMIT = 60;

type SortValue = "newest" | "oldest" | "longest";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fi-FI") : "—";

const formatYear = (iso: string | null) =>
  iso ? new Date(iso).getFullYear() : null;

const Speeches: React.FC<ProfileSectionProps> = ({ personId }) => {
  const themed = useThemedColors();
  const { openRootDrawer } = useOverlayDrawer();

  const [speeches, setSpeeches] = React.useState<Speech[]>([]);
  const [total, setTotal] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState(false);

  const [query, setQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [yearFilter, setYearFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<SortValue>("newest");
  const [expandedId, setExpandedId] = React.useState<number | null>(null);

  // Fetch first page.
  React.useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(false);
    setSpeeches([]);
    setTotal(null);
    setExpandedId(null);
    apiFetch(`/api/person/${personId}/speeches?limit=${PAGE_SIZE}&offset=0`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SpeechesResponse | null) => {
        if (ctrl.signal.aborted || !data) return;
        setSpeeches(data.speeches);
        setTotal(data.total);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [personId]);

  const loadMore = React.useCallback(() => {
    if (loadingMore || total == null || speeches.length >= total) return;
    setLoadingMore(true);
    apiFetch(
      `/api/person/${personId}/speeches?limit=${PAGE_SIZE}&offset=${speeches.length}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SpeechesResponse | null) => {
        if (!data) return;
        setSpeeches((prev) => [...prev, ...data.speeches]);
      })
      .finally(() => setLoadingMore(false));
  }, [personId, loadingMore, speeches.length, total]);

  const speechTypes = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of speeches) {
      if (s.speech_type) set.add(s.speech_type);
    }
    return Array.from(set).sort();
  }, [speeches]);

  const years = React.useMemo(() => {
    const set = new Set<number>();
    for (const s of speeches) {
      const y = formatYear(s.start_time);
      if (y) set.add(y);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [speeches]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = speeches.filter((s) => {
      if (typeFilter !== "all" && s.speech_type !== typeFilter) return false;
      if (
        yearFilter !== "all" &&
        String(formatYear(s.start_time)) !== yearFilter
      )
        return false;
      if (q) {
        const hay = [
          s.content ?? "",
          s.section_title ?? "",
          s.document ?? "",
          s.section_identifier ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    switch (sort) {
      case "newest":
        list.sort((a, b) =>
          (b.start_time ?? "").localeCompare(a.start_time ?? ""),
        );
        break;
      case "oldest":
        list.sort((a, b) =>
          (a.start_time ?? "").localeCompare(b.start_time ?? ""),
        );
        break;
      case "longest":
        list.sort((a, b) => (b.word_count ?? 0) - (a.word_count ?? 0));
        break;
    }
    return list;
  }, [speeches, query, typeFilter, yearFilter, sort]);

  // Monthly activity sparkline over all (unfiltered) speeches.
  const activityBuckets = React.useMemo(() => {
    if (speeches.length === 0) return [] as { key: string; count: number }[];
    const map = new Map<string, number>();
    for (const s of speeches) {
      if (!s.start_time) continue;
      const d = new Date(s.start_time);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ key, count }));
  }, [speeches]);

  const maxBucket = Math.max(1, ...activityBuckets.map((b) => b.count));

  const openConversation = React.useCallback(
    (speech: Speech) => {
      openRootDrawer({
        drawerKey: `section:${speech.section_key}:${speech.id}`,
        title:
          speech.section_title ||
          speech.section_identifier ||
          "Puheenvuoron konteksti",
        subtitle: [formatDate(speech.start_time), speech.document]
          .filter(Boolean)
          .join(" · "),
        meta: speech.speech_type ? (
          <Chip size="small" label={speech.speech_type} sx={{ height: 20 }} />
        ) : undefined,
        content: (
          <SpeechConversationDrawer
            sectionKey={speech.section_key}
            sessionKey={speech.session_key}
            focusSpeechId={speech.id}
            focusPersonId={personId}
            focusStartTime={speech.start_time}
          />
        ),
      });
    },
    [openRootDrawer],
  );

  const toggleInline = (s: Speech) => {
    if ((s.word_count ?? 0) <= INLINE_WORD_LIMIT) {
      setExpandedId((prev) => (prev === s.id ? null : s.id));
    } else {
      openConversation(s);
    }
  };

  const resultMessage = React.useMemo(() => {
    if (total == null) return "";
    if (filtered.length === speeches.length) {
      return `${speeches.length.toLocaleString("fi-FI")} / ${total.toLocaleString("fi-FI")} puheenvuoroa`;
    }
    return `${filtered.length.toLocaleString("fi-FI")} suodatettua · ${speeches.length.toLocaleString("fi-FI")} ladattu / ${total.toLocaleString("fi-FI")}`;
  }, [filtered.length, speeches.length, total]);

  return (
    <SectionShell
      anchor="puheenvuorot"
      title="Puheenvuorot"
      methodology="Puheenvuorot koottu täysistuntopöytäkirjoista. Klikkaamalla avautuu asiakohdan koko keskustelu — edeltävät ja seuraavat puhujat, asiakohdan teksti ja mahdolliset äänestykset — jotta puheen voi lukea kontekstissa eikä irrallisena."
      methodologyCaveats="Lyhyet puheenvuorot (alle 60 sanaa) voi avata rivillä; pidemmät puheet avautuvat sivupaneeliin, jossa on enemmän tilaa."
    >
      {loading ? (
        <Stack spacing={1}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={72} />
          ))}
        </Stack>
      ) : error ? (
        <Typography variant="body2" sx={{ color: themed.textTertiary }}>
          Puheenvuoroja ei voitu ladata.
        </Typography>
      ) : speeches.length === 0 ? (
        <Typography variant="body2" sx={{ color: themed.textTertiary }}>
          Ei puheenvuoroja.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {/* Monthly activity sparkline */}
          {activityBuckets.length > 1 && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: themed.textTertiary,
                  display: "block",
                  mb: 0.5,
                }}
              >
                Aktiivisuus kuukausittain
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 0.25,
                  height: 44,
                  px: 0.5,
                  py: 0.5,
                  border: `1px solid ${themed.dataBorder}`,
                  bgcolor: themed.backgroundPaper,
                }}
              >
                {activityBuckets.map((b) => (
                  <Box
                    key={b.key}
                    title={`${b.key}: ${b.count} puheenvuoroa`}
                    sx={{
                      flex: 1,
                      minWidth: 2,
                      height: `${(b.count / maxBucket) * 100}%`,
                      bgcolor: themed.accent,
                      opacity: 0.75,
                    }}
                  />
                ))}
              </Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mt: 0.25 }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: themed.textTertiary, fontFamily: "monospace" }}
                >
                  {activityBuckets[0]?.key}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: themed.textTertiary, fontFamily: "monospace" }}
                >
                  {activityBuckets.at(-1)?.key}
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Filters */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <TextField
              size="small"
              placeholder="Hae puheen tekstistä, asiakohdasta tai asiakirjasta"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            {speechTypes.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Tyyppi</InputLabel>
                <Select
                  label="Tyyppi"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">Kaikki</MenuItem>
                  {speechTypes.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {years.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Vuosi</InputLabel>
                <Select
                  label="Vuosi"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <MenuItem value="all">Kaikki</MenuItem>
                  {years.map((y) => (
                    <MenuItem key={y} value={String(y)}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Järjestys</InputLabel>
              <Select
                label="Järjestys"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortValue)}
              >
                <MenuItem value="newest">Uusin</MenuItem>
                <MenuItem value="oldest">Vanhin</MenuItem>
                <MenuItem value="longest">Pisin</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Typography
            variant="caption"
            sx={{ color: themed.textSecondary, display: "block" }}
          >
            {resultMessage}
          </Typography>

          {/* List */}
          <Stack spacing={1}>
            {filtered.length === 0 ? (
              <Typography variant="body2" sx={{ color: themed.textTertiary }}>
                Ei hakuehtoja vastaavia puheenvuoroja.
              </Typography>
            ) : (
              filtered.map((s) => {
                const isShort = (s.word_count ?? 0) <= INLINE_WORD_LIMIT;
                const isExpanded = expandedId === s.id;
                return (
                  <Box
                    key={s.id}
                    sx={{
                      border: `1px solid ${themed.dataBorder}`,
                      bgcolor: themed.backgroundPaper,
                    }}
                  >
                    <Box
                      component="button"
                      onClick={() => toggleInline(s)}
                      sx={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        p: 1.5,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        "&:hover": { bgcolor: themed.backgroundSubtle },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="baseline"
                        flexWrap="wrap"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{ color: themed.textSecondary }}
                        >
                          {formatDate(s.start_time)}
                        </Typography>
                        {s.speech_type && (
                          <Chip
                            label={s.speech_type}
                            size="small"
                            sx={{ height: 18, fontSize: "0.6rem" }}
                          />
                        )}
                        {s.section_identifier && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: themed.textTertiary,
                              fontFamily: "monospace",
                            }}
                          >
                            {s.section_identifier}
                          </Typography>
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            color: themed.textTertiary,
                            ml: "auto !important",
                          }}
                        >
                          {s.word_count ?? 0} sanaa
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        sx={{
                          color: themed.textPrimary,
                          lineHeight: 1.55,
                          whiteSpace:
                            isShort && isExpanded ? "pre-line" : "normal",
                          display:
                            isShort && isExpanded ? "block" : "-webkit-box",
                          WebkitLineClamp:
                            isShort && isExpanded ? undefined : 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {s.content ?? ""}
                      </Typography>
                      {(s.section_title || s.document) && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: themed.textTertiary,
                            display: "block",
                            mt: 0.75,
                          }}
                        >
                          {[s.section_title, s.document]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>
                      )}
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        sx={{ mt: 0.75 }}
                      >
                        {isShort ? (
                          <Chip
                            size="small"
                            icon={
                              isExpanded ? (
                                <ExpandLessIcon sx={{ fontSize: 14 }} />
                              ) : (
                                <ExpandMoreIcon sx={{ fontSize: 14 }} />
                              )
                            }
                            label={isExpanded ? "Tiivistä" : "Näytä koko puhe"}
                            variant="outlined"
                            sx={{ height: 22, fontSize: "0.65rem" }}
                          />
                        ) : null}
                        <Chip
                          size="small"
                          icon={<LaunchIcon sx={{ fontSize: 14 }} />}
                          label="Avaa keskustelu"
                          onClick={(e) => {
                            e.stopPropagation();
                            openConversation(s);
                          }}
                          sx={{
                            height: 22,
                            fontSize: "0.65rem",
                            cursor: "pointer",
                          }}
                        />
                      </Stack>
                    </Box>
                  </Box>
                );
              })
            )}
          </Stack>

          {total != null && speeches.length < total && (
            <Box sx={{ textAlign: "center" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={loadMore}
                disabled={loadingMore}
              >
                Lataa lisää ({speeches.length} / {total})
              </Button>
            </Box>
          )}
        </Stack>
      )}
    </SectionShell>
  );
};

export default Speeches;
