import path from "node:path";
import { getStorageConfig } from "#storage";

export interface PipelineQueueNames {
  inspector: string;
  scraper: string;
  parser: string;
}

export interface SqsConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface WorkerVisibilityTimeouts {
  inspector: number;
  scraper: number;
  parser: number;
}

export interface PipelineConfig {
  queueNames: PipelineQueueNames;
  maxMessages: number;
  waitTimeSeconds: number;
  workerVisibilityTimeoutSeconds: WorkerVisibilityTimeouts;
  retryVisibilityTimeoutSeconds: number;
  idleDelayMs: number;
  changeLogDbPath: string;
  sqs: SqsConfig;
}

function readPositiveInt(
  envName: string,
  fallback: number,
  minValue = 1,
): number {
  const raw = process.env[envName];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < minValue) {
    throw new Error(`${envName} must be an integer >= ${minValue}`);
  }

  return parsed;
}

function resolvePipelineBaseDir(): string {
  if (process.env.ROW_STORE_DIR) {
    return path.resolve(process.env.ROW_STORE_DIR);
  }

  const storageConfig = getStorageConfig();
  if (storageConfig.local?.baseDir) {
    return path.resolve(storageConfig.local.baseDir);
  }

  return path.resolve(process.cwd(), "data");
}

export function getPipelineConfig(): PipelineConfig {
  const baseDir = resolvePipelineBaseDir();

  const changeLogDbPath = path.resolve(
    process.env.PIPELINE_CHANGELOG_DB_PATH ||
      path.join(baseDir, "pipeline-orchestration.db"),
  );

  return {
    queueNames: {
      inspector: process.env.PIPELINE_QUEUE_INSPECTOR || "datapipe-inspector",
      scraper: process.env.PIPELINE_QUEUE_SCRAPER || "datapipe-scraper",
      parser: process.env.PIPELINE_QUEUE_PARSER || "datapipe-parser",
    },
    maxMessages: readPositiveInt("PIPELINE_QUEUE_MAX_MESSAGES", 1, 1),
    waitTimeSeconds: readPositiveInt("PIPELINE_QUEUE_WAIT_SECONDS", 10, 0),
    workerVisibilityTimeoutSeconds: {
      inspector: readPositiveInt(
        "PIPELINE_QUEUE_INSPECTOR_VISIBILITY_TIMEOUT_SECONDS",
        60,
        1,
      ),
      scraper: readPositiveInt(
        "PIPELINE_QUEUE_SCRAPER_VISIBILITY_TIMEOUT_SECONDS",
        600,
        1,
      ),
      parser: readPositiveInt(
        "PIPELINE_QUEUE_PARSER_VISIBILITY_TIMEOUT_SECONDS",
        300,
        1,
      ),
    },
    retryVisibilityTimeoutSeconds: readPositiveInt(
      "PIPELINE_QUEUE_RETRY_VISIBILITY_TIMEOUT_SECONDS",
      15,
      1,
    ),
    idleDelayMs: readPositiveInt("PIPELINE_QUEUE_IDLE_DELAY_MS", 300, 1),
    changeLogDbPath,
    sqs: {
      endpoint:
        process.env.PIPELINE_SQS_ENDPOINT ||
        process.env.PIPELINE_ELASTICMQ_ENDPOINT ||
        "http://localhost:9324",
      region: process.env.PIPELINE_SQS_REGION || "us-east-1",
      accessKeyId: process.env.PIPELINE_SQS_ACCESS_KEY_ID || "x",
      secretAccessKey: process.env.PIPELINE_SQS_SECRET_ACCESS_KEY || "x",
      sessionToken: process.env.PIPELINE_SQS_SESSION_TOKEN,
    },
  };
}
