type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const validateRequiredTableName = (
  body: unknown,
): ValidationResult<{ tableName: string; mode?: unknown }> => {
  if (!isRecord(body)) {
    return { ok: false, error: "JSON object body is required" };
  }

  if (typeof body.tableName !== "string" || body.tableName.trim() === "") {
    return { ok: false, error: "tableName is required" };
  }

  return {
    ok: true,
    value: {
      tableName: body.tableName,
      mode: body.mode,
    },
  };
};

const validateTableNameList = (
  body: unknown,
): ValidationResult<{
  tableNames: string[];
  mode?: unknown;
  force?: boolean;
}> => {
  if (!isRecord(body)) {
    return { ok: false, error: "JSON object body is required" };
  }

  if (!Array.isArray(body.tableNames)) {
    return { ok: false, error: "tableNames array is required" };
  }

  if (body.tableNames.length === 0) {
    return { ok: false, error: "tableNames array cannot be empty" };
  }

  if (
    body.tableNames.some(
      (tableName) => typeof tableName !== "string" || tableName.trim() === "",
    )
  ) {
    return { ok: false, error: "tableNames must contain non-empty strings" };
  }

  if (body.force !== undefined && typeof body.force !== "boolean") {
    return { ok: false, error: "force must be a boolean" };
  }

  return {
    ok: true,
    value: {
      tableNames: body.tableNames as string[],
      mode: body.mode,
      force: body.force as boolean | undefined,
    },
  };
};

const readJsonBody = async (req: Request): Promise<unknown> => req.json();

export const parseScraperStartBody = async (
  req: Request,
): Promise<ValidationResult<{ tableName: string; mode?: unknown }>> =>
  validateRequiredTableName(await readJsonBody(req));

export const parseParserStartBody = async (
  req: Request,
): Promise<ValidationResult<{ tableName: string }>> => {
  const parsed = validateRequiredTableName(await readJsonBody(req));
  if (!parsed.ok) {
    return parsed;
  }

  return { ok: true, value: { tableName: parsed.value.tableName } };
};

export const parseScraperBulkStartBody = async (
  req: Request,
): Promise<ValidationResult<{ tableNames: string[]; mode?: unknown }>> => {
  const parsed = validateTableNameList(await readJsonBody(req));
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    value: {
      tableNames: parsed.value.tableNames,
      mode: parsed.value.mode,
    },
  };
};

export const parseParserBulkStartBody = async (
  req: Request,
): Promise<ValidationResult<{ tableNames: string[]; force?: boolean }>> => {
  const parsed = validateTableNameList(await readJsonBody(req));
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    value: {
      tableNames: parsed.value.tableNames,
      force: parsed.value.force,
    },
  };
};
