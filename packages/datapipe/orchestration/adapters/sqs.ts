import {
  ChangeMessageVisibilityCommand,
  CreateQueueCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import type { SqsConfig } from "../config";

export interface QueueEnsureOptions {
  attributes?: Record<string, string>;
}

export interface QueueSendOptions {
  delaySeconds?: number;
}

export interface QueueReceiveOptions {
  maxMessages?: number;
  waitTimeSeconds?: number;
  visibilityTimeoutSeconds?: number;
}

export interface QueueReceivedMessage {
  messageId: string;
  receiptHandle: string;
  body: string;
  receiveCount: number;
}

function parseReceiveCount(value: unknown): number {
  if (typeof value !== "string") return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export class SqsQueueAdapter {
  private readonly client: SQSClient;
  private readonly queueUrlCache = new Map<string, string>();

  constructor(config: SqsConfig) {
    this.client = new SQSClient({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      },
    });
  }

  /**
   * Create a queue if it doesn't exist (bootstrap / local dev only).
   * Production queues are provisioned by Terraform; workers should call verifyQueue() instead.
   */
  async ensureQueue(
    queueName: string,
    options?: QueueEnsureOptions,
  ): Promise<void> {
    const result = await this.client.send(
      new CreateQueueCommand({
        QueueName: queueName,
        Attributes: options?.attributes,
      }),
    );

    const queueUrl = result.QueueUrl;
    if (typeof queueUrl === "string" && queueUrl.trim() !== "") {
      this.queueUrlCache.set(queueName, queueUrl);
      return;
    }

    const lookedUp = await this.lookupQueueUrl(queueName);
    if (!lookedUp) {
      throw new Error(`Queue '${queueName}' is not available`);
    }
    this.queueUrlCache.set(queueName, lookedUp);
  }

  /**
   * Verify a queue exists and warm the URL cache. Throws if the queue is not found.
   * Workers should call this at startup instead of ensureQueue().
   */
  async verifyQueue(queueName: string): Promise<void> {
    const url = await this.lookupQueueUrl(queueName);
    if (!url) {
      throw new Error(
        `Queue '${queueName}' not found. Run 'bun run pipeline:bootstrap' to create it.`,
      );
    }
    this.queueUrlCache.set(queueName, url);
  }

  async send(
    queueName: string,
    messageBody: string,
    options?: QueueSendOptions,
  ): Promise<void> {
    const queueUrl = await this.getQueueUrl(queueName);
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        DelaySeconds: options?.delaySeconds,
      }),
    );
  }

  async receive(
    queueName: string,
    options?: QueueReceiveOptions,
  ): Promise<QueueReceivedMessage[]> {
    const queueUrl = await this.getQueueUrl(queueName);
    const response = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: options?.maxMessages ?? 1,
        WaitTimeSeconds: options?.waitTimeSeconds ?? 0,
        VisibilityTimeout: options?.visibilityTimeoutSeconds,
        MessageSystemAttributeNames: ["ApproximateReceiveCount"],
      }),
    );

    const messages = Array.isArray(response.Messages) ? response.Messages : [];

    return messages.flatMap((message) => {
      const messageId = message?.MessageId;
      const receiptHandle = message?.ReceiptHandle;
      const body = message?.Body;
      const receiveCount = parseReceiveCount(
        message?.Attributes?.ApproximateReceiveCount,
      );

      if (
        typeof messageId !== "string" ||
        typeof receiptHandle !== "string" ||
        typeof body !== "string"
      ) {
        return [];
      }

      return [{ messageId, receiptHandle, body, receiveCount }];
    });
  }

  async ack(queueName: string, receiptHandle: string): Promise<void> {
    const queueUrl = await this.getQueueUrl(queueName);
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  }

  async retry(
    queueName: string,
    receiptHandle: string,
    visibilityTimeoutSeconds: number,
  ): Promise<void> {
    const queueUrl = await this.getQueueUrl(queueName);
    await this.client.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeoutSeconds,
      }),
    );
  }

  async close(): Promise<void> {
    this.client.destroy();
  }

  private async lookupQueueUrl(queueName: string): Promise<string | null> {
    try {
      const response = await this.client.send(
        new GetQueueUrlCommand({ QueueName: queueName }),
      );
      const queueUrl = response.QueueUrl;
      if (typeof queueUrl === "string" && queueUrl.trim() !== "") {
        return queueUrl;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async getQueueUrl(queueName: string): Promise<string> {
    const cached = this.queueUrlCache.get(queueName);
    if (cached) return cached;

    const lookedUp = await this.lookupQueueUrl(queueName);
    if (lookedUp) {
      this.queueUrlCache.set(queueName, lookedUp);
      return lookedUp;
    }

    throw new Error(
      `Queue '${queueName}' not found. Run 'bun run pipeline:bootstrap' to create it.`,
    );
  }
}
