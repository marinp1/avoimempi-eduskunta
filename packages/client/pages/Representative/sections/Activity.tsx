import { Box, Divider, Skeleton, Stack } from "@mui/material";
import React from "react";
import { apiFetch } from "#client/utils/fetch";
const AttendancePersonDetail = React.lazy(
  () => import("../../Insights/AttendancePersonDetail"),
);
const VotingActivity = React.lazy(() => import("../../Insights/VotingActivity"));
import { JudgmentLine, judgeAgainstBaseline } from "../components/JudgmentLine";
import { MetricWithBaseline } from "../components/MetricWithBaseline";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

interface MetricRow {
  speech_count: number;
  initiative_count: number;
  interpellation_count: number;
  written_question_count: number;
  vote_total: number;
  vote_cast: number;
}

interface AverageRow {
  label: string | null;
  n: number;
  avgSpeechCount: number;
  avgInitiativeCount: number;
  avgInterpellationCount: number;
  avgWrittenQuestionCount: number;
  avgVoteParticipationRate: number;
}

interface MetricsResponse {
  person: MetricRow | null;
  party: AverageRow | null;
  parliament: AverageRow;
}

const noop = () => {};

const participationRate = (row: MetricRow | null): number | null => {
  if (!row || row.vote_total <= 0) return null;
  return (row.vote_cast / row.vote_total) * 100;
};

const formatPercent = (n: number) => `${n.toFixed(0)} %`;
const formatCount = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString("fi-FI") : n.toFixed(1);

const Activity: React.FC<ProfileSectionProps> = ({ personId, scope }) => {
  const [metrics, setMetrics] = React.useState<MetricsResponse | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    setMetrics(null);
    setError(false);
    apiFetch(`/api/person/${personId}/metrics`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!controller.signal.aborted && data) setMetrics(data);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [personId]);

  const personRate = participationRate(metrics?.person ?? null);
  const partyRate = metrics?.party?.avgVoteParticipationRate ?? null;
  const parliamentRate = metrics?.parliament.avgVoteParticipationRate ?? null;

  const personSpeeches = metrics?.person?.speech_count ?? null;
  const partySpeeches = metrics?.party?.avgSpeechCount ?? null;
  const parliamentSpeeches = metrics?.parliament.avgSpeechCount ?? null;

  const personInitiatives = metrics?.person?.initiative_count ?? null;
  const partyInitiatives = metrics?.party?.avgInitiativeCount ?? null;
  const parliamentInitiatives = metrics?.parliament.avgInitiativeCount ?? null;

  const judgments: Array<{ text: string; tone: ReturnType<typeof judgeAgainstBaseline> }> = [];
  if (personRate != null && parliamentRate != null) {
    const tone = judgeAgainstBaseline(personRate, parliamentRate, {
      tolerance: 3,
    });
    const verdict =
      tone === "above"
        ? "yli parlamentin keskiarvon"
        : tone === "below"
          ? "alle parlamentin keskiarvon"
          : "lähellä parlamentin keskiarvoa";
    judgments.push({
      text: `Osallistunut ${formatPercent(personRate)} äänestyksistä — ${verdict} (${formatPercent(parliamentRate)}).`,
      tone,
    });
  }
  if (personSpeeches != null && parliamentSpeeches != null) {
    const tone = judgeAgainstBaseline(personSpeeches, parliamentSpeeches);
    const verdict =
      tone === "above"
        ? "useammin kuin keskimääräinen edustaja"
        : tone === "below"
          ? "harvemmin kuin keskimääräinen edustaja"
          : "suunnilleen yhtä usein kuin keskimääräinen edustaja";
    judgments.push({
      text: `Käyttänyt ${formatCount(personSpeeches)} puheenvuoroa — ${verdict} (${formatCount(parliamentSpeeches)}).`,
      tone,
    });
  }
  if (personInitiatives != null && parliamentInitiatives != null) {
    const tone = judgeAgainstBaseline(personInitiatives, parliamentInitiatives);
    const verdict =
      tone === "above"
        ? "enemmän kuin parlamentin keskiarvo"
        : tone === "below"
          ? "vähemmän kuin parlamentin keskiarvo"
          : "lähellä parlamentin keskiarvoa";
    judgments.push({
      text: `Allekirjoittanut ${formatCount(personInitiatives)} aloitetta — ${verdict} (${formatCount(parliamentInitiatives)}).`,
      tone,
    });
  }

  return (
    <SectionShell
      anchor="aktiivisuus"
      title="Aktiivisuus"
      methodology="Aktiivisuus mitataan äänestysosallistumisesta, puheenvuorojen määrästä ja allekirjoitettujen aloitteiden määrästä. Vertailut puolueen ja parlamentin keskiarvoon kootaan kaikista nykyisen kauden edustajista."
      methodologyCaveats="Lukuihin sisältyvät kaikki edustajan kaudet, ei pelkkä nykyinen vaalikausi. Tarkempi rajaus tulee myöhemmässä vaiheessa."
    >
      {metrics ? (
        <Stack spacing={2}>
          {judgments.length > 0 && (
            <Stack spacing={0.25}>
              {judgments.map((j) => (
                <JudgmentLine key={j.text} text={j.text} tone={j.tone} />
              ))}
            </Stack>
          )}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 2,
            }}
          >
            <MetricWithBaseline
              label="Äänestysosallistuminen"
              value={personRate}
              format={formatPercent}
              partyAverage={partyRate}
              partyLabel={metrics.party?.label ?? "Puolue"}
              parliamentAverage={parliamentRate}
            />
            <MetricWithBaseline
              label="Puheenvuorot"
              value={personSpeeches}
              format={formatCount}
              partyAverage={partySpeeches}
              partyLabel={metrics.party?.label ?? "Puolue"}
              parliamentAverage={parliamentSpeeches}
            />
            <MetricWithBaseline
              label="Aloitteet"
              value={personInitiatives}
              format={formatCount}
              partyAverage={partyInitiatives}
              partyLabel={metrics.party?.label ?? "Puolue"}
              parliamentAverage={parliamentInitiatives}
            />
          </Box>
        </Stack>
      ) : error ? (
        <JudgmentLine
          text="Aktiivisuuslukuja ei voitu ladata juuri nyt."
          tone="neutral"
        />
      ) : (
        <Skeleton variant="rectangular" height={120} />
      )}

      <Divider sx={{ my: 3 }} />

      <React.Suspense fallback={<Skeleton variant="rectangular" height={200} />}>
        <AttendancePersonDetail
          personId={personId}
          personName=""
          startDate={scope.selectedGovernmentPeriod?.government_start_date}
          endDate={scope.selectedGovernmentPeriod?.government_end_date ?? undefined}
          onClose={noop}
        />
        <VotingActivity onClose={noop} initialPersonId={personId} />
      </React.Suspense>
    </SectionShell>
  );
};

export default Activity;
