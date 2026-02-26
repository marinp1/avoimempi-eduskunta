export const badRequest = (message: string) =>
  Response.json({ message }, { status: 400 });

export const notFound = (message = "Not found") =>
  Response.json({ message }, { status: 404 });

export const jsonOrNotFound = <T>(
  data: T | null | undefined,
  message = "Not found",
) => (data == null ? notFound(message) : Response.json(data));
