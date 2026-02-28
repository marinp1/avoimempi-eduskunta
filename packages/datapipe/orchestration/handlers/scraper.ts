import { scrapeTable, type ScrapeMode, type ScrapeResult } from "../../scraper/scraper";
import type { ParsedUpsertChangeLog } from "../change-log";
import type { SqsQueueAdapter } from "../adapters/sqs";
import type { PipelineQueueNames } from "../config";
import {
  createTaskEnvelope,
  isKnownTableName,
  type ParseTableTaskPayload,
  type PipelineTaskEnvelope,
  PipelineTaskTypes,
  type ScrapeTableTaskPayload,
} from "../contracts";

export interface ScraperHandlerDependencies {
  broker: SqsQueueAdapter;
  queueNames: PipelineQueueNames;
  changeLog: ParsedUpsertChangeLog;
  /** Max API pages per invocation. Undefined = unlimited. */
  maxPagesPerInvocation?: number;
}

function buildContinuationMode(original: ScrapeMode, continuationPk: number): ScrapeMode {
  if (original.type === "range") {
    return { type: "range", pkStartValue: continuationPk, pkEndValue: original.pkEndValue };
  }
  return { type: "start-from-pk", pkStartValue: continuationPk };
}

/**
 * Build a parse task bounded to what was actually written this invocation.
 * Returns null if nothing was written (no parse needed).
 */
function createParseTaskFromScrapeResult(
  task: ScrapeTableTaskPayload,
  result: ScrapeResult,
): ParseTableTaskPayload | null {
  if (result.pkEndValue === null) return null;

  // For range mode, parse the full declared range (not just what was written,
  // since the range might span rows already in the store).
  if (task.mode.type === "range") {
    return {
      type: PipelineTaskTypes.parseTable,
      tableName: task.tableName,
      pkStartValue: task.mode.pkStartValue,
      pkEndValue: task.mode.pkEndValue,
      sourceTaskId: task.sourceTaskId,
    };
  }

  // All other modes: bound to actual written range so the parser does minimal work.
  return {
    type: PipelineTaskTypes.parseTable,
    tableName: task.tableName,
    pkStartValue: result.pkStartValue ?? undefined,
    pkEndValue: result.pkEndValue,
    sourceTaskId: task.sourceTaskId,
  };
}

export function createScraperHandler(deps: ScraperHandlerDependencies) {
  return async function handleScraperTask(
    envelope: PipelineTaskEnvelope<ScrapeTableTaskPayload>,
  ): Promise<void> {
    const { payload } = envelope;

    if (!isKnownTableName(payload.tableName)) {
      throw new Error(`Unknown table name: ${payload.tableName}`);
    }

    console.log(
      `[scraper] Running scrape task ${envelope.taskId} for ${payload.tableName} in mode ${payload.mode.type}`,
    );

    const result = await scrapeTable({
      tableName: payload.tableName,
      mode: payload.mode,
      maxPagesPerInvocation: deps.maxPagesPerInvocation,
      onProgress: (_progress) => {
        // scrapeTable already logs useful progress details
      },
    });

    deps.changeLog.appendScrape({
      taskId: envelope.taskId,
      traceId: envelope.traceId,
      tableName: payload.tableName,
      mode: payload.mode.type,
      pkStartValue: result.pkStartValue,
      pkEndValue: result.pkEndValue,
      rowsScraped: result.rowsScraped,
    });

    // If the page cap was hit, re-enqueue the remainder before moving on.
    if (result.truncated && result.continuationPk !== null) {
      const continuationTask: ScrapeTableTaskPayload = {
        type: PipelineTaskTypes.scrapeTable,
        tableName: payload.tableName,
        mode: buildContinuationMode(payload.mode, result.continuationPk),
        sourceTaskId: payload.sourceTaskId,
      };
      const continuationEnvelope = createTaskEnvelope(continuationTask, {
        traceId: envelope.traceId,
      });
      await deps.broker.send(
        deps.queueNames.scraper,
        JSON.stringify(continuationEnvelope),
      );
      console.log(
        `[scraper] Page cap hit; re-enqueued continuation from PK ${result.continuationPk} as task ${continuationEnvelope.taskId}`,
      );
    }

    const parseTask = createParseTaskFromScrapeResult(payload, result);

    if (parseTask === null) {
      console.log(
        `[scraper] Completed task ${envelope.taskId}: scraped=${result.rowsScraped} rows, nothing written — skipping parse`,
      );
      return;
    }

    const parseEnvelope = createTaskEnvelope(parseTask, {
      traceId: envelope.traceId,
    });

    await deps.broker.send(
      deps.queueNames.parser,
      JSON.stringify(parseEnvelope),
    );

    console.log(
      `[scraper] Completed task ${envelope.taskId}: scraped=${result.rowsScraped} rows (PK ${result.pkStartValue ?? "none"}–${result.pkEndValue ?? "none"})${result.truncated ? " [truncated]" : ""}; queued parse task ${parseEnvelope.taskId}`,
    );
  };
}
