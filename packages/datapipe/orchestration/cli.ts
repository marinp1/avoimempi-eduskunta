#!/usr/bin/env bun
import { TableNames } from "#constants";
import { SqsQueueAdapter } from "./adapters/sqs";
import { ParsedUpsertChangeLog } from "./change-log";
import { getPipelineConfig } from "./config";
import {
  type AnyPipelineTaskEnvelope,
  createTaskEnvelope,
  isKnownTableName,
  type PipelineTaskType,
  PipelineTaskTypes,
  parseTaskEnvelope,
} from "./contracts";
import { createInspectorHandler } from "./handlers/inspector";
import { createParserHandler } from "./handlers/parser";
import { createScraperHandler } from "./handlers/scraper";

type WorkerKind = "inspect" | "scrape" | "parse";

interface RunWorkerLoopOptions {
  broker: SqsQueueAdapter;
  queueName: string;
  workerName: string;
  acceptedTaskTypes: PipelineTaskType[];
  waitTimeSeconds: number;
  maxMessages: number;
  visibilityTimeoutSeconds: number;
  retryVisibilityTimeoutSeconds: number;
  idleDelayMs: number;
  runOnce: boolean;
  handleTask: (envelope: AnyPipelineTaskEnvelope) => Promise<void>;
}

async function runWorkerLoop(options: RunWorkerLoopOptions): Promise<void> {
  let shouldStop = false;

  const stop = () => {
    shouldStop = true;
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  console.log(
    `[${options.workerName}] Listening on queue '${options.queueName}' for ${options.acceptedTaskTypes.join(", ")}`,
  );

  try {
    while (!shouldStop) {
      const messages = await options.broker.receive(options.queueName, {
        maxMessages: options.maxMessages,
        waitTimeSeconds: options.waitTimeSeconds,
        visibilityTimeoutSeconds: options.visibilityTimeoutSeconds,
      });

      if (messages.length === 0) {
        if (options.runOnce) {
          break;
        }

        await Bun.sleep(options.idleDelayMs);
        continue;
      }

      for (const message of messages) {
        let envelope: AnyPipelineTaskEnvelope;

        try {
          envelope = parseTaskEnvelope(message.body);
        } catch (error) {
          console.error(
            `[${options.workerName}] Dropping invalid message ${message.messageId}:`,
            error,
          );
          await options.broker.ack(options.queueName, message.receiptHandle);
          continue;
        }

        if (!options.acceptedTaskTypes.includes(envelope.payload.type)) {
          console.warn(
            `[${options.workerName}] Message ${envelope.taskId} has type '${envelope.payload.type}' which does not belong to this worker. Acknowledging to avoid poison-loop.`,
          );
          await options.broker.ack(options.queueName, message.receiptHandle);
          continue;
        }

        try {
          await options.handleTask(envelope);
          await options.broker.ack(options.queueName, message.receiptHandle);
        } catch (error) {
          console.error(
            `[${options.workerName}] Task ${envelope.taskId} failed (attempt ${message.receiveCount}):`,
            error,
          );
          await options.broker.retry(
            options.queueName,
            message.receiptHandle,
            options.retryVisibilityTimeoutSeconds,
          );
        }
      }

      if (options.runOnce) {
        break;
      }
    }
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}

async function ensureQueues(broker: SqsQueueAdapter): Promise<void> {
  const config = getPipelineConfig();

  await broker.ensureQueue(config.queueNames.inspector, {
    attributes: {
      VisibilityTimeout: String(config.visibilityTimeoutSeconds),
    },
  });
  await broker.ensureQueue(config.queueNames.scraper, {
    attributes: {
      VisibilityTimeout: String(config.visibilityTimeoutSeconds),
    },
  });
  await broker.ensureQueue(config.queueNames.parser, {
    attributes: {
      VisibilityTimeout: String(config.visibilityTimeoutSeconds),
    },
  });
}

async function bootstrapQueues(): Promise<void> {
  const config = getPipelineConfig();
  const broker = new SqsQueueAdapter(config.sqs);

  try {
    await ensureQueues(broker);

    console.log("✅ Queue bootstrap complete");
    console.log(`   inspector: ${config.queueNames.inspector}`);
    console.log(`   scraper:   ${config.queueNames.scraper}`);
    console.log(`   parser:    ${config.queueNames.parser}`);
  } finally {
    await broker.close();
  }
}

async function enqueueInspectorTasks(tableArg: string): Promise<void> {
  const config = getPipelineConfig();
  const broker = new SqsQueueAdapter(config.sqs);

  const tableNames =
    tableArg === "all"
      ? [...TableNames]
      : (() => {
          if (!isKnownTableName(tableArg)) {
            throw new Error(`Unknown table name: ${tableArg}`);
          }
          return [tableArg];
        })();

  try {
    await broker.ensureQueue(config.queueNames.inspector);

    for (const tableName of tableNames) {
      const envelope = createTaskEnvelope({
        type: PipelineTaskTypes.inspectTable,
        tableName,
      });

      await broker.send(config.queueNames.inspector, JSON.stringify(envelope));
      console.log(
        `🧾 Enqueued inspect task ${envelope.taskId} for ${tableName}`,
      );
    }
  } finally {
    await broker.close();
  }
}

async function runWorker(kind: WorkerKind, runOnce: boolean): Promise<void> {
  const config = getPipelineConfig();
  const broker = new SqsQueueAdapter(config.sqs);
  const changeLog = new ParsedUpsertChangeLog(config.changeLogDbPath);

  try {
    await ensureQueues(broker);

    if (kind === "inspect") {
      const handler = createInspectorHandler({
        broker,
        queueNames: config.queueNames,
      });

      await runWorkerLoop({
        broker,
        queueName: config.queueNames.inspector,
        workerName: "inspector-worker",
        acceptedTaskTypes: [PipelineTaskTypes.inspectTable],
        waitTimeSeconds: config.waitTimeSeconds,
        maxMessages: config.maxMessages,
        visibilityTimeoutSeconds: config.visibilityTimeoutSeconds,
        retryVisibilityTimeoutSeconds: config.retryVisibilityTimeoutSeconds,
        idleDelayMs: config.idleDelayMs,
        runOnce,
        handleTask: (envelope) =>
          handler(envelope as Parameters<typeof handler>[0]),
      });
      return;
    }

    if (kind === "scrape") {
      const handler = createScraperHandler({
        broker,
        queueNames: config.queueNames,
      });

      await runWorkerLoop({
        broker,
        queueName: config.queueNames.scraper,
        workerName: "scraper-worker",
        acceptedTaskTypes: [PipelineTaskTypes.scrapeTable],
        waitTimeSeconds: config.waitTimeSeconds,
        maxMessages: config.maxMessages,
        visibilityTimeoutSeconds: config.visibilityTimeoutSeconds,
        retryVisibilityTimeoutSeconds: config.retryVisibilityTimeoutSeconds,
        idleDelayMs: config.idleDelayMs,
        runOnce,
        handleTask: (envelope) =>
          handler(envelope as Parameters<typeof handler>[0]),
      });
      return;
    }

    const handler = createParserHandler({
      changeLog,
    });

    await runWorkerLoop({
      broker,
      queueName: config.queueNames.parser,
      workerName: "parser-worker",
      acceptedTaskTypes: [PipelineTaskTypes.parseTable],
      waitTimeSeconds: config.waitTimeSeconds,
      maxMessages: config.maxMessages,
      visibilityTimeoutSeconds: config.visibilityTimeoutSeconds,
      retryVisibilityTimeoutSeconds: config.retryVisibilityTimeoutSeconds,
      idleDelayMs: config.idleDelayMs,
      runOnce,
      handleTask: (envelope) =>
        handler(envelope as Parameters<typeof handler>[0]),
    });
  } finally {
    changeLog.close();
    await broker.close();
  }
}

function printHelp(): void {
  console.log(`
Queue Orchestrator CLI

Usage:
  bun cli.ts bootstrap
  bun cli.ts inspect <TableName|all>
  bun cli.ts worker <inspect|scrape|parse> [--once]

Commands:
  bootstrap                Create/verify the queue topology
  inspect <table|all>      Enqueue inspector tasks
  worker <kind>            Start a long-running worker

Flags:
  --once                   Process one polling round and exit

Examples:
  bun cli.ts bootstrap
  bun cli.ts inspect all
  bun cli.ts inspect MemberOfParliament
  bun cli.ts worker inspect
  bun cli.ts worker scrape
  bun cli.ts worker parse
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === "help" ||
    args[0] === "--help" ||
    args[0] === "-h"
  ) {
    printHelp();
    return;
  }

  if (args[0] === "bootstrap") {
    await bootstrapQueues();
    return;
  }

  if (args[0] === "inspect") {
    const tableArg = args[1] || "all";
    await enqueueInspectorTasks(tableArg);
    return;
  }

  if (args[0] === "worker") {
    const kind = args[1] as WorkerKind | undefined;
    const runOnce = args.includes("--once");

    if (!kind || !["inspect", "scrape", "parse"].includes(kind)) {
      throw new Error("worker command requires <inspect|scrape|parse>");
    }

    await runWorker(kind, runOnce);
    return;
  }

  throw new Error(`Unknown command: ${args[0]}`);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
