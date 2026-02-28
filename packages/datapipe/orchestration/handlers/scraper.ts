import { scrapeTable } from "../../scraper/scraper";
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
}

function createParseTaskFromScrapeTask(
  task: ScrapeTableTaskPayload,
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

  if (task.mode.type === "start-from-pk") {
    return {
      type: PipelineTaskTypes.parseTable,
      tableName: task.tableName,
      pkStartValue: task.mode.pkStartValue,
      sourceTaskId: task.sourceTaskId,
    };
  }

  if (task.mode.type === "patch-from-pk") {
    return {
      type: PipelineTaskTypes.parseTable,
      tableName: task.tableName,
      pkStartValue: task.mode.pkStartValue,
      sourceTaskId: task.sourceTaskId,
    };
  }

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

    await scrapeTable({
      tableName: payload.tableName,
      mode: payload.mode,
      onProgress: (_progress) => {
        // scrapeTable already logs useful progress details
      },
    });

    const parseTask = createParseTaskFromScrapeTask(payload);
    const parseEnvelope = createTaskEnvelope(parseTask, {
      traceId: envelope.traceId,
    });

    await deps.broker.send(
      deps.queueNames.parser,
      JSON.stringify(parseEnvelope),
    );

    console.log(
      `[scraper] Completed task ${envelope.taskId}; queued parse task ${parseEnvelope.taskId}`,
    );
  };
}
