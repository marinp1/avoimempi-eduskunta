/** @jsxImportSource ../../../jsx */
import i18next from "i18next";
import type {
  DisplayCheck,
  QualityViewModel,
} from "../pages/quality.view-model";

/**
 * Self-replacing status region. While the run is incomplete the wrapper polls
 * `/laadunvalvonta/status` and swaps itself (`outerHTML`); the complete-state
 * response carries no `hx-trigger`, so polling stops without any client JS.
 */
export default function QualityStatusFragment({
  vm,
}: {
  vm: QualityViewModel;
}) {
  const polling = vm.phase !== "complete";
  return (
    <div
      id="sanity-status"
      class="quality-status"
      {...(polling
        ? {
            "hx-get": "/laadunvalvonta/status",
            "hx-trigger": "every 2s",
            "hx-swap": "outerHTML",
          }
        : {})}
    >
      {polling ? <RunningBanner vm={vm} /> : <CompleteBanner vm={vm} />}
      {vm.groups.map((group) => (
        <section class="quality-group">
          <h2 class="quality-group__title">{group.category}</h2>
          {group.checks.map((check) => (
            <CheckRow check={check} />
          ))}
        </section>
      ))}
    </div>
  );
}

function RunningBanner({ vm }: { vm: QualityViewModel }) {
  return (
    <div class="quality-banner quality-banner--running">
      <span class="quality-spinner" aria-hidden="true"></span>
      <div class="quality-banner__text">
        <strong>{i18next.t("quality:running")}</strong>
        <span>
          {i18next.t("quality:progress", {
            done: vm.progress.done,
            total: vm.progress.total,
          })}
        </span>
        {vm.currentName && (
          <span class="quality-banner__current">
            {i18next.t("quality:current_check", { name: vm.currentName })}
          </span>
        )}
      </div>
    </div>
  );
}

function CompleteBanner({ vm }: { vm: QualityViewModel }) {
  const allPassed = vm.summary.passed === vm.summary.total;
  return (
    <div
      class={`quality-banner quality-banner--complete ${
        allPassed ? "is-ok" : "has-findings"
      }`}
    >
      <div class="quality-banner__text">
        <strong>
          {i18next.t("quality:summary_passed", {
            passed: vm.summary.passed,
            total: vm.summary.total,
          })}
        </strong>
        <span>
          {vm.summary.failed > 0 &&
            i18next.t("quality:failures", { count: vm.summary.failed })}
          {vm.summary.failed > 0 && vm.summary.errored > 0 && " · "}
          {vm.summary.errored > 0 &&
            i18next.t("quality:errors", { count: vm.summary.errored })}
        </span>
        {vm.totalDurationLabel && (
          <span class="quality-banner__duration">
            {i18next.t("quality:finished_in", {
              duration: vm.totalDurationLabel,
            })}
          </span>
        )}
      </div>
    </div>
  );
}

const STATUS_LABEL_KEYS = {
  pass: "quality:status_pass",
  fail: "quality:status_fail",
  error: "quality:status_error",
} as const;

const SEVERITY_LABEL_KEYS = {
  error: "quality:severity_error",
  warning: "quality:severity_warning",
  info: "quality:severity_info",
} as const;

function CheckRow({ check }: { check: DisplayCheck }) {
  return (
    <div
      class="quality-check"
      data-status={check.status}
      data-severity={check.severity}
    >
      <div class="quality-check__row">
        <span class={`quality-badge quality-badge--${check.status}`}>
          {i18next.t(STATUS_LABEL_KEYS[check.status])}
          {check.status === "fail" && ` (${check.totalViolations})`}
        </span>
        <div class="quality-check__text">
          <strong>{check.name}</strong>
          <p>{check.description}</p>
        </div>
        <span class="quality-check__meta">
          <span class={`quality-severity quality-severity--${check.severity}`}>
            {i18next.t(SEVERITY_LABEL_KEYS[check.severity])}
          </span>
          <span class="quality-check__duration">{check.durationLabel}</span>
        </span>
      </div>
      {check.status === "fail" && check.findingNotes && (
        <p class="quality-check__notes">
          <strong>{i18next.t("quality:known_cause")}</strong>{" "}
          {check.findingNotes}
        </p>
      )}
      {check.status === "fail" && check.sample.length > 0 && (
        <details class="quality-check__sample">
          <summary>
            {i18next.t("quality:show_sample")} ·{" "}
            {i18next.t("quality:total_violations", {
              count: check.totalViolations,
            })}
          </summary>
          <SampleTable sample={check.sample} />
        </details>
      )}
      {check.status === "error" && (
        <p class="quality-check__error">
          {i18next.t("quality:error_label")} {check.error}
        </p>
      )}
    </div>
  );
}

function SampleTable({ sample }: { sample: DisplayCheck["sample"] }) {
  const columns = sample[0]?.map((cell) => cell.column) ?? [];
  return (
    <table class="quality-sample">
      <thead>
        <tr>
          {columns.map((column) => (
            <th>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sample.map((row) => (
          <tr>
            {row.map((cell) => (
              <td>{cell.value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
