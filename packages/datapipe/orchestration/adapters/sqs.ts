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

type SqsSdkModule = {
  SQSClient: new (config: {
    endpoint: string;
    region: string;
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
  }) => {
    send(command: unknown): Promise<Record<string, unknown>>;
  };
  CreateQueueCommand: new (input: {
    QueueName: string;
    Attributes?: Record<string, string>;
  }) => unknown;
  GetQueueUrlCommand: new (input: { QueueName: string }) => unknown;
  SendMessageCommand: new (input: {
    QueueUrl: string;
    MessageBody: string;
    DelaySeconds?: number;
  }) => unknown;
  ReceiveMessageCommand: new (input: {
    QueueUrl: string;
    MaxNumberOfMessages: number;
    WaitTimeSeconds: number;
    VisibilityTimeout?: number;
    MessageSystemAttributeNames: string[];
  }) => unknown;
  DeleteMessageCommand: new (input: {
    QueueUrl: string;
    ReceiptHandle: string;
  }) => unknown;
  ChangeMessageVisibilityCommand: new (input: {
    QueueUrl: string;
    ReceiptHandle: string;
    VisibilityTimeout: number;
  }) => unknown;
};

async function loadSqsSdk(): Promise<SqsSdkModule> {
  try {
    const dynamicImport = new Function(
      "modulePath",
      "return import(modulePath);",
    ) as (modulePath: string) => Promise<unknown>;
    return (await dynamicImport(
      "@aws-sdk/client-sqs",
    )) as unknown as SqsSdkModule;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "unknown import error";
    throw new Error(
      "Missing '@aws-sdk/client-sqs'. Install it with: bun add @aws-sdk/client-sqs",
      { cause: message },
    );
  }
}

function parseReceiveCount(value: unknown): number {
  if (typeof value !== "string") return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export class SqsQueueAdapter {
  private readonly queueUrlCache = new Map<string, string>();
  private readonly sdkPromise: Promise<SqsSdkModule>;
  private readonly clientPromise: Promise<{
    send(command: unknown): Promise<Record<string, unknown>>;
  }>;

  constructor(config: SqsConfig) {
    this.sdkPromise = loadSqsSdk();
    this.clientPromise = this.createClient(config);
  }

  async ensureQueue(
    queueName: string,
    options?: QueueEnsureOptions,
  ): Promise<void> {
    const { client, sdk } = await this.resolveClient();
    const createResult = await client.send(
      new sdk.CreateQueueCommand({
        QueueName: queueName,
        Attributes: options?.attributes,
      }),
    );

    const queueUrl = createResult.QueueUrl;
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

  async send(
    queueName: string,
    messageBody: string,
    options?: QueueSendOptions,
  ): Promise<void> {
    const queueUrl = await this.getQueueUrl(queueName);
    const { client, sdk } = await this.resolveClient();

    await client.send(
      new sdk.SendMessageCommand({
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
    const { client, sdk } = await this.resolveClient();

    const response = await client.send(
      new sdk.ReceiveMessageCommand({
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

      return [
        {
          messageId,
          receiptHandle,
          body,
          receiveCount,
        },
      ];
    });
  }

  async ack(queueName: string, receiptHandle: string): Promise<void> {
    const queueUrl = await this.getQueueUrl(queueName);
    const { client, sdk } = await this.resolveClient();

    await client.send(
      new sdk.DeleteMessageCommand({
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
    const { client, sdk } = await this.resolveClient();

    await client.send(
      new sdk.ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: visibilityTimeoutSeconds,
      }),
    );
  }

  async close(): Promise<void> {
    // no-op
  }

  private async createClient(config: SqsConfig) {
    const sdk = await this.sdkPromise;
    return new sdk.SQSClient({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        sessionToken: config.sessionToken,
      },
    });
  }

  private async resolveClient(): Promise<{
    client: { send(command: unknown): Promise<Record<string, unknown>> };
    sdk: SqsSdkModule;
  }> {
    const [client, sdk] = await Promise.all([
      this.clientPromise,
      this.sdkPromise,
    ]);
    return { client, sdk };
  }

  private async lookupQueueUrl(queueName: string): Promise<string | null> {
    const { client, sdk } = await this.resolveClient();
    try {
      const response = await client.send(
        new sdk.GetQueueUrlCommand({ QueueName: queueName }),
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

    await this.ensureQueue(queueName);
    const created = this.queueUrlCache.get(queueName);
    if (!created) {
      throw new Error(`Queue '${queueName}' is not available`);
    }
    return created;
  }
}
