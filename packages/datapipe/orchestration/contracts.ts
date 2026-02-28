import { randomUUID } from "node:crypto";
import { TableNames } from "#constants";
import type { ScrapeMode } from "../scraper/scraper";

export const PIPELINE_MESSAGE_VERSION = 1 as const;

export type KnownTableName = (typeof TableNames)[number];

const KNOWN_TABLE_NAMES = new Set<string>(TableNames);

export type PipelineTaskType = "inspect-table" | "scrape-table" | "parse-table";

export interface InspectTableTaskPayload {
  type: "inspect-table";
  tableName: string;
  /** Skip the full raw-store gap scan. Use when the table was recently fully scraped. */
  skipGapDetection?: boolean;
}

export interface ScrapeTableTaskPayload {
  type: "scrape-table";
  tableName: string;
  mode: ScrapeMode;
  sourceTaskId?: string;
}

export interface ParseTableTaskPayload {
  type: "parse-table";
  tableName: string;
  force?: boolean;
  pkStartValue?: number;
  pkEndValue?: number;
  sourceTaskId?: string;
}

export type PipelineTaskPayload =
  | InspectTableTaskPayload
  | ScrapeTableTaskPayload
  | ParseTableTaskPayload;

export interface PipelineTaskEnvelope<TPayload extends PipelineTaskPayload> {
  version: typeof PIPELINE_MESSAGE_VERSION;
  taskId: string;
  traceId: string;
  createdAt: string;
  payload: TPayload;
}

export type AnyPipelineTaskEnvelope = PipelineTaskEnvelope<PipelineTaskPayload>;

export const PipelineTaskTypes = {
  inspectTable: "inspect-table" as const,
  scrapeTable: "scrape-table" as const,
  parseTable: "parse-table" as const,
};

export function isKnownTableName(
  tableName: string,
): tableName is KnownTableName {
  return KNOWN_TABLE_NAMES.has(tableName);
}

export function createTaskEnvelope<TPayload extends PipelineTaskPayload>(
  payload: TPayload,
  options?: {
    taskId?: string;
    traceId?: string;
  },
): PipelineTaskEnvelope<TPayload> {
  return {
    version: PIPELINE_MESSAGE_VERSION,
    taskId: options?.taskId ?? randomUUID(),
    traceId: options?.traceId ?? randomUUID(),
    createdAt: new Date().toISOString(),
    payload,
  };
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidScrapeMode(mode: unknown): mode is ScrapeMode {
  if (!mode || typeof mode !== "object") return false;

  const modeType = (mode as { type?: unknown }).type;
  if (modeType === "auto-resume") return true;

  if (modeType === "start-from-pk" || modeType === "patch-from-pk") {
    const pkStartValue = (mode as { pkStartValue?: unknown }).pkStartValue;
    return isNonNegativeInteger(pkStartValue);
  }

  if (modeType === "range") {
    const pkStartValue = (mode as { pkStartValue?: unknown }).pkStartValue;
    const pkEndValue = (mode as { pkEndValue?: unknown }).pkEndValue;
    return (
      isNonNegativeInteger(pkStartValue) &&
      isNonNegativeInteger(pkEndValue) &&
      pkEndValue >= pkStartValue
    );
  }

  return false;
}

export function parseTaskEnvelope(input: string): AnyPipelineTaskEnvelope {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("Invalid task envelope JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Task envelope must be an object");
  }

  const envelope = parsed as Partial<AnyPipelineTaskEnvelope>;

  if (envelope.version !== PIPELINE_MESSAGE_VERSION) {
    throw new Error(
      `Unsupported task envelope version: ${String(envelope.version)}`,
    );
  }

  if (typeof envelope.taskId !== "string" || envelope.taskId.trim() === "") {
    throw new Error("Task envelope is missing taskId");
  }

  if (typeof envelope.traceId !== "string" || envelope.traceId.trim() === "") {
    throw new Error("Task envelope is missing traceId");
  }

  if (
    typeof envelope.createdAt !== "string" ||
    Number.isNaN(Date.parse(envelope.createdAt))
  ) {
    throw new Error("Task envelope has invalid createdAt");
  }

  if (!envelope.payload || typeof envelope.payload !== "object") {
    throw new Error("Task envelope is missing payload");
  }

  const payload = envelope.payload as Partial<PipelineTaskPayload>;
  const payloadType = (payload as { type?: unknown }).type;

  if (payloadType === PipelineTaskTypes.inspectTable) {
    const inspectPayload = payload as Partial<InspectTableTaskPayload>;

    if (
      typeof inspectPayload.tableName !== "string" ||
      inspectPayload.tableName.trim() === ""
    ) {
      throw new Error("inspect-table payload requires tableName");
    }

    return envelope as AnyPipelineTaskEnvelope;
  }

  if (payloadType === PipelineTaskTypes.scrapeTable) {
    const scrapePayload = payload as Partial<ScrapeTableTaskPayload>;

    if (
      typeof scrapePayload.tableName !== "string" ||
      scrapePayload.tableName.trim() === ""
    ) {
      throw new Error("scrape-table payload requires tableName");
    }

    if (!isValidScrapeMode(scrapePayload.mode)) {
      throw new Error("scrape-table payload requires a valid mode");
    }

    return envelope as AnyPipelineTaskEnvelope;
  }

  if (payloadType === PipelineTaskTypes.parseTable) {
    const parsePayload = payload as Partial<ParseTableTaskPayload>;

    if (
      typeof parsePayload.tableName !== "string" ||
      parsePayload.tableName.trim() === ""
    ) {
      throw new Error("parse-table payload requires tableName");
    }

    if (
      parsePayload.pkStartValue !== undefined &&
      !isNonNegativeInteger(parsePayload.pkStartValue)
    ) {
      throw new Error("parse-table payload has invalid pkStartValue");
    }

    if (
      parsePayload.pkEndValue !== undefined &&
      !isNonNegativeInteger(parsePayload.pkEndValue)
    ) {
      throw new Error("parse-table payload has invalid pkEndValue");
    }

    if (
      parsePayload.pkStartValue !== undefined &&
      parsePayload.pkEndValue !== undefined &&
      parsePayload.pkEndValue < parsePayload.pkStartValue
    ) {
      throw new Error("parse-table payload has invalid PK range");
    }

    return envelope as AnyPipelineTaskEnvelope;
  }

  throw new Error(`Unknown task payload type: ${String(payloadType)}`);
}
