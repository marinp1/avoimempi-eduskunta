import { describe, expect, test } from "bun:test";
import "../src/i18n";
import QualityStatusFragment from "../src/features/quality/fragments/status.fragment";
import { buildQualityViewModel } from "../src/features/quality/pages/quality.view-model";
import type { RunState } from "../src/features/quality/quality.types";

function render(state: RunState): string {
  return String(QualityStatusFragment({ vm: buildQualityViewModel(state) }));
}

describe("QualityStatusFragment", () => {
  test("polls while idle and running", () => {
    const idle = render({ phase: "idle" });
    expect(idle).toContain('hx-trigger="every 2s"');
    expect(idle).toContain('hx-get="/laadunvalvonta/status"');

    const running = render({
      phase: "running",
      startedAt: "2026-06-11T08:00:00.000Z",
      total: 2,
      completed: [],
      current: { id: "a", name: "Eka tarkistus" },
    });
    expect(running).toContain('hx-trigger="every 2s"');
    expect(running).toContain("Eka tarkistus");
  });

  test("stops polling when complete and escapes sample values", () => {
    const html = render({
      phase: "complete",
      startedAt: "2026-06-11T08:00:00.000Z",
      finishedAt: "2026-06-11T08:00:03.000Z",
      total: 1,
      completed: [
        {
          id: "a",
          category: "Data Integrity",
          severity: "error",
          name: "Tarkistus",
          description: "Kuvaus",
          status: "fail",
          totalViolations: 1,
          sample: [{ title: "<script>alert(1)</script>" }],
          durationMs: 5,
        },
      ],
      durationMs: 3000,
    });

    expect(html).not.toContain("hx-trigger");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("renders findingNotes with label for failing checks only", () => {
    const completedWith = (
      status: "pass" | "fail",
      severity: "error" | "info" = "error",
    ): RunState => ({
      phase: "complete",
      startedAt: "2026-06-11T08:00:00.000Z",
      finishedAt: "2026-06-11T08:00:03.000Z",
      total: 1,
      completed: [
        {
          id: "a",
          category: "Business Logic",
          severity,
          name: "Tarkistus",
          description: "Kuvaus",
          status,
          totalViolations: status === "fail" ? 17 : 0,
          sample: status === "fail" ? [{ date: "2022-04-19" }] : [],
          findingNotes:
            "Paikka jää avoimeksi seuraajan nimeämiseen asti & näin on.",
          durationMs: 5,
        },
      ],
      durationMs: 3000,
    });

    const failing = render(completedWith("fail", "info"));
    expect(failing).toContain("quality-check__notes");
    expect(failing).toContain("Tunnettu syy:");
    expect(failing).toContain(
      "Paikka jää avoimeksi seuraajan nimeämiseen asti &amp; näin on.",
    );
    expect(failing).toContain('data-severity="info"');

    const passing = render(completedWith("pass"));
    expect(passing).not.toContain("quality-check__notes");
    expect(passing).toContain('data-severity="error"');
  });
});
