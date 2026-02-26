const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const badRequest = (error: string) =>
  Response.json({ error, message: error }, { status: 400 });

export const clientError = (error: unknown) =>
  Response.json(
    {
      error: getErrorMessage(error),
      message: getErrorMessage(error),
    },
    { status: 400 },
  );

export const serverError = (error: unknown) =>
  Response.json(
    {
      error: getErrorMessage(error),
      message: getErrorMessage(error),
    },
    { status: 500 },
  );
