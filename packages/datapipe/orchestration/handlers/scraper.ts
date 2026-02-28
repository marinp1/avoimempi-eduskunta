import { scrapeTable, type ScrapeResult } from "../../scraper/scraper";
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
}

function createParseTaskFromScrapeResult(
  task: ScrapeTableTaskPayload,
  result: ScrapeResult,
): ParseTableTaskPayload {
  if (task.mode.type === "range") {
    return {
      type: PipelineTaskTypes.parseTable,
      tableName: task.tableName,
      pkStartValue: task.mode.pkStartValue,
      pkEndValue: task.mode.pkEndValue,
      sourceTaskId: task.sourceTaskId,
    };
  }

  if (task.mode.type === "patch-from-pk") {
    // Use the actual last PK written so the parser doesn't scan the full table.
    return {
      type: PipelineTaskTypes.parseTable,
      tableName: task.tableName,
      pkStartValue: task.mode.pkStartValue,
      pkEndValue: result.pkEndValue ?? undefined,
      sourceTaskId: task.sourceTaskId,
    };
  }

  if (task.mode.type === "start-from-pk") {
    return {
      type: PipelineTaskTypes.parseTable,
      tableName: task.tableName,
      pkStartValue: task.mode.pkStartValue,
      sourceTaskId: task.sourceTaskId,
    };
  }

  // auto-resume: full table parse (hash skip makes this efficient)
  return {
    type: PipelineTaskTypes.parseTable,
    tableName: task.tableName,
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

    const parseTask = createParseTaskFromScrapeResult(payload, result);
    const parseEnvelope = createTaskEnvelope(parseTask, {
      traceId: envelope.traceId,
    });

    await deps.broker.send(
      deps.queueNames.parser,
      JSON.stringify(parseEnvelope),
    );

    console.log(
      `[scraper] Completed task ${envelope.taskId}: scraped=${result.rowsScraped} rows (PK ${result.pkStartValue ?? "none"}–${result.pkEndValue ?? "none"}); queued parse task ${parseEnvelope.taskId}`,
    );
  };
}
