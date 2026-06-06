import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { VotingDrawerContent } from "#client/components/VotingCard";
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
import { refs } from "#client/references";
import { useThemedColors } from "#client/theme/ThemeContext";
import { apiFetch } from "#client/utils/fetch";

interface ConversationSpeech {
  id: number;
  person_id: number | null;
  first_name: string | null;
  last_name: string | null;
  party_abbreviation: string | null;
  speech_type: string | null;
  ordinal_number: number | null;
  start_time: string | null;
  end_time: string | null;
  content: string | null;
}

interface SectionVoting {
  id: number;
  title?: string | null;
  section_title?: string | null;
  start_time?: string | null;
}

interface SpeechConversationDrawerProps {
  sectionKey: string;
  sessionKey: string | null;
  focusSpeechId: number;
  focusPersonId: number;
  focusStartTime: string | null;
}

const formatTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
};

export const SpeechConversationDrawer: React.FC<
  SpeechConversationDrawerProps
> = ({
  sectionKey,
  sessionKey,
  focusSpeechId,
  focusPersonId,
  focusStartTime,
}) => {
  const themed = useThemedColors();
  const { openDrawer } = useOverlayDrawer();
  const [section, setSection] = React.useState<any>(null);
  const [speeches, setSpeeches] = React.useState<ConversationSpeech[] | null>(
    null,
  );
  const [votings, setVotings] = React.useState<SectionVoting[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const focusRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    setError(null);
    setSection(null);
    setSpeeches(null);
    setVotings(null);

    Promise.allSettled([
      apiFetch(`/api/sections/${encodeURIComponent(sectionKey)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!ctrl.signal.aborted) setSection(d);
        }),
      (async () => {
        const collected: ConversationSpeech[] = [];
        let offset = 0;
        const pageSize = 100;
        for (let i = 0; i < 10 && !ctrl.signal.aborted; i++) {
          const res = await apiFetch(
            `/api/sections/${encodeURIComponent(sectionKey)}/speeches?limit=${pageSize}&offset=${offset}`,
            { signal: ctrl.signal },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as {
            speeches: ConversationSpeech[];
            total: number;
          };
          collected.push(...data.speeches);
          if (collected.length >= data.total || data.speeches.length === 0) {
            break;
          }
          offset += pageSize;
        }
        if (!ctrl.signal.aborted) setSpeeches(collected);
      })(),
      apiFetch(`/api/sections/${encodeURIComponent(sectionKey)}/votings`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          if (!ctrl.signal.aborted) setVotings(d as SectionVoting[]);
        }),
    ]).then((results) => {
      const rejected = results.find((r) => r.status === "rejected");
      if (rejected && !ctrl.signal.aborted) {
        setError("Keskustelua ei voitu ladata kokonaisuudessaan.");
      }
    });

    return () => ctrl.abort();
  }, [sectionKey]);

  // Auto-scroll to focus speech once loaded.
  React.useEffect(() => {
    if (speeches && focusRef.current) {
      const handle = window.setTimeout(() => {
        focusRef.current?.scrollIntoView({ behavior: "auto", block: "center" });
      }, 50);
      return () => window.clearTimeout(handle);
    }
  }, [speeches]);

  const openVoting = (voting: SectionVoting) => {
    openDrawer({
      drawerKey: `voting:${voting.id}`,
      title: voting.section_title || voting.title || `Äänestys #${voting.id}`,
      subtitle: voting.start_time
        ? new Date(voting.start_time).toLocaleDateString("fi-FI")
        : undefined,
      content: <VotingDrawerContent votingId={voting.id} />,
    });
  };

  return (
    <Stack spacing={2.5} sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {error && (
        <Typography variant="caption" sx={{ color: themed.textTertiary }}>
          {error}
        </Typography>
      )}

      {/* Section context */}
      <Box
        sx={{
          p: 2,
          border: `1px solid ${themed.dataBorder}`,
          bgcolor: themed.backgroundPaper,
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: themed.textTertiary, letterSpacing: "0.06em" }}
        >
          Asiakohta
        </Typography>
        {section ? (
          <>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ color: themed.textPrimary, mt: 0.5 }}
            >
              {section.minutes_item_title || section.title || "—"}
            </Typography>
            {section.minutes_content_text ? (
              <Box sx={{ mt: 1 }}>
                <RichTextRenderer
                  document={section.minutes_content_text}
                  fallbackText={section.minutes_content_text}
                  paragraphVariant="body2"
                  sx={{
                    "& .MuiTypography-root": {
                      color: themed.textPrimary,
                      lineHeight: 1.55,
                    },
                  }}
                />
              </Box>
            ) : null}
            {section.resolution && (
              <Typography
                variant="body2"
                sx={{ mt: 1, color: themed.textSecondary, fontStyle: "italic" }}
              >
                Päätös: {section.resolution}
              </Typography>
            )}
            <Button
              href={refs.section(sectionKey, focusStartTime, sessionKey)}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              size="small"
              sx={{ mt: 1.5, textTransform: "none", px: 0, minWidth: 0 }}
            >
              Avaa täysistuntopöytäkirjassa
            </Button>
          </>
        ) : (
          <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={22} />
          </Box>
        )}
      </Box>

      {/* Related votings */}
      {votings && votings.length > 0 && (
        <Box>
          <Typography
            variant="overline"
            sx={{ color: themed.textTertiary, letterSpacing: "0.06em" }}
          >
            Liittyvät äänestykset ({votings.length})
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {votings.map((v) => (
              <Box
                key={v.id}
                component="button"
                onClick={() => openVoting(v)}
                sx={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  p: 1,
                  border: `1px solid ${themed.dataBorder}`,
                  bgcolor: themed.backgroundPaper,
                  cursor: "pointer",
                  "&:hover": { bgcolor: themed.backgroundSubtle },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: themed.textPrimary, fontWeight: 600 }}
                >
                  {v.section_title || v.title || `Äänestys #${v.id}`}
                </Typography>
                {v.start_time && (
                  <Typography
                    variant="caption"
                    sx={{ color: themed.textTertiary }}
                  >
                    {new Date(v.start_time).toLocaleString("fi-FI")}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Conversation */}
      <Box>
        <Typography
          variant="overline"
          sx={{ color: themed.textTertiary, letterSpacing: "0.06em" }}
        >
          Keskustelu{speeches ? ` (${speeches.length})` : ""}
        </Typography>
        {!speeches ? (
          <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={22} />
          </Box>
        ) : speeches.length === 0 ? (
          <Typography variant="body2" sx={{ color: themed.textTertiary }}>
            Ei puheenvuoroja.
          </Typography>
        ) : (
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            {speeches.map((s) => {
              const isFocus = s.id === focusSpeechId;
              const isSameMp = s.person_id === focusPersonId;
              return (
                <Box
                  key={s.id}
                  ref={isFocus ? focusRef : undefined}
                  sx={{
                    p: 1.5,
                    borderLeft: `3px solid ${
                      isFocus
                        ? themed.accent
                        : isSameMp
                          ? themed.accent
                          : themed.dataBorder
                    }`,
                    opacity: !isFocus && isSameMp ? 0.95 : 1,
                    bgcolor: isFocus
                      ? themed.backgroundSubtle
                      : themed.backgroundPaper,
                    border: `1px solid ${themed.dataBorder}`,
                    borderLeftWidth: 3,
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
                      variant="body2"
                      fontWeight={700}
                      sx={{ color: themed.textPrimary }}
                    >
                      {[s.first_name, s.last_name].filter(Boolean).join(" ") ||
                        "Tuntematon puhuja"}
                    </Typography>
                    {s.party_abbreviation && (
                      <Chip
                        size="small"
                        label={s.party_abbreviation}
                        sx={{ height: 18, fontSize: "0.6rem" }}
                      />
                    )}
                    {s.speech_type && (
                      <Typography
                        variant="caption"
                        sx={{ color: themed.textTertiary }}
                      >
                        {s.speech_type}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        color: themed.textTertiary,
                        ml: "auto !important",
                        fontFamily: "monospace",
                      }}
                    >
                      {formatTime(s.start_time)}
                    </Typography>
                  </Stack>
                  {s.content ? (
                    <Typography
                      variant="body2"
                      sx={{
                        color: themed.textPrimary,
                        whiteSpace: "pre-line",
                        lineHeight: 1.55,
                      }}
                    >
                      {s.content}
                    </Typography>
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{ color: themed.textTertiary, fontStyle: "italic" }}
                    >
                      (ei tekstisisältöä)
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      <Divider />
      <Typography
        variant="caption"
        sx={{ color: themed.textTertiary, display: "block" }}
      >
        Puhuttu teksti koottu eduskunnan täysistuntopöytäkirjoista. Korostettu
        puheenvuoro on tarkasteltavan edustajan — sama edustaja muissa
        puheenvuoroissa näkyy pehmeämmällä reunalla.
      </Typography>
    </Stack>
  );
};
