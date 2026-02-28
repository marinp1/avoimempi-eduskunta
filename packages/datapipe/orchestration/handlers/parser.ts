import { parseTable } from "../../parser/parser";
import type { ParsedUpsertChangeLog } from "../change-log";
import {
  isKnownTableName,
  type ParseTableTaskPayload,
  type PipelineTaskEnvelope,
} from "../contracts";

export interface ParserHandlerDependencies {
  changeLog: ParsedUpsertChangeLog;
}

export function createParserHandler(deps: ParserHandlerDependencies) {
  return async function handleParserTask(
    envelope: PipelineTaskEnvelope<ParseTableTaskPayload>,
  ): Promise<void> {
    const { payload } = envelope;

    if (!isKnownTableName(payload.tableName)) {
      throw new Error(`Unknown table name: ${payload.tableName}`);
    }

    console.log(
      `[parser] Running parse task ${envelope.taskId} for ${payload.tableName}`,
    );

    const result = await parseTable({
      tableName: payload.tableName,
      force: payload.force,
      pkStartValue: payload.pkStartValue,
      pkEndValue: payload.pkEndValue,
      onRowsUpserted: (upserted) => {
        deps.changeLog.append({
          taskId: envelope.taskId,
          traceId: envelope.traceId,
          tableName: upserted.tableName,
          pkStartValue: upserted.pkStartValue,
          pkEndValue: upserted.pkEndValue,
          rowCount: upserted.rowCount,
        });
      },
    });

    console.log(
      `[parser] Completed task ${envelope.taskId}: processed=${result.rowsProcessed}, parsed=${result.rowsParsed}, skipped=${result.rowsSkipped}`,
    );
  };
}
