import { getRawRowStore } from "#storage/row-store/factory";
import { getExactTableCountByRows } from "#table-counts";
import type { SqsQueueAdapter } from "../adapters/sqs";
import type { PipelineQueueNames } from "../config";
import {
  createTaskEnvelope,
  type InspectTableTaskPayload,
  isKnownTableName,
  type PipelineTaskEnvelope,
  PipelineTaskTypes,
  type ScrapeTableTaskPayload,
} from "../contracts";

interface MissingRange {
  start: number;
  end: number;
}

export interface InspectorHandlerDependencies {
  broker: SqsQueueAdapter;
  queueNames: PipelineQueueNames;
}

async function collectMissingRanges(
  tableName: string,
): Promise<MissingRange[]> {
  const rawStore = getRawRowStore();
  const ranges: MissingRange[] = [];
  let previousPk: number | null = null;

  for await (const row of rawStore.list(tableName)) {
    if (previousPk !== null && row.pk - previousPk > 1) {
      ranges.push({
        start: previousPk + 1,
        end: row.pk - 1,
      });
    }
    previousPk = row.pk;
  }

  return ranges;
}

function toScrapeTasks(params: {
  tableName: string;
  apiRowCount: number;
  rawRowCount: number;
  maxPk: number | null;
  missingRanges: MissingRange[];
  sourceTaskId: string;
}): ScrapeTableTaskPayload[] {
  const tasks: ScrapeTableTaskPayload[] = [];

  for (const range of params.missingRanges) {
    tasks.push({
      type: PipelineTaskTypes.scrapeTable,
      tableName: params.tableName,
      mode: {
        type: "range",
        pkStartValue: range.start,
        pkEndValue: range.end,
      },
      sourceTaskId: params.sourceTaskId,
    });
  }

  if (params.maxPk === null) {
    tasks.push({
      type: PipelineTaskTypes.scrapeTable,
      tableName: params.tableName,
      mode: {
        type: "start-from-pk",
        pkStartValue: 0,
      },
      sourceTaskId: params.sourceTaskId,
    });
    return tasks;
  }

  if (params.apiRowCount > params.rawRowCount) {
    tasks.push({
      type: PipelineTaskTypes.scrapeTable,
      tableName: params.tableName,
      mode: {
        type: "start-from-pk",
        pkStartValue: params.maxPk + 1,
      },
      sourceTaskId: params.sourceTaskId,
    });
  }

  return tasks;
}

export function createInspectorHandler(deps: InspectorHandlerDependencies) {
  return async function handleInspectorTask(
    envelope: PipelineTaskEnvelope<InspectTableTaskPayload>,
  ): Promise<void> {
    const { payload } = envelope;

    if (!isKnownTableName(payload.tableName)) {
      throw new Error(`Unknown table name: ${payload.tableName}`);
    }

    const rawStore = getRawRowStore();

    const [apiRowCount, rawRowCount, maxPk, missingRanges] = await Promise.all([
      getExactTableCountByRows(payload.tableName),
      rawStore.count(payload.tableName),
      rawStore.maxPk(payload.tableName),
      collectMissingRanges(payload.tableName),
    ]);

    const scrapeTasks = toScrapeTasks({
      tableName: payload.tableName,
      apiRowCount,
      rawRowCount,
      maxPk,
      missingRanges,
      sourceTaskId: envelope.taskId,
    });

    console.log(
      `[inspector] ${payload.tableName}: apiRows=${apiRowCount}, rawRows=${rawRowCount}, maxPk=${maxPk ?? "none"}, missingRanges=${missingRanges.length}, queuedScrapeTasks=${scrapeTasks.length}`,
    );

    for (const scrapeTask of scrapeTasks) {
      const scrapeEnvelope = createTaskEnvelope(scrapeTask, {
        traceId: envelope.traceId,
      });
      await deps.broker.send(
        deps.queueNames.scraper,
        JSON.stringify(scrapeEnvelope),
      );
    }
  };
}
