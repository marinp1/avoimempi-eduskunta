export const json = <T>(data: T, init?: ResponseInit): TypedJsonResponse<T> =>
  Response.json(data, init) as TypedJsonResponse<T>;

export const badRequest = (message: string): TypedJsonResponse<ErrorResponse> =>
  json({ message }, { status: 400 });

export const notFound = (
  message = "Not found",
): TypedJsonResponse<ErrorResponse> => json({ message }, { status: 404 });

export const jsonOrNotFound = <T>(
  data: T | null | undefined,
  message = "Not found",
): RouteResponse<T> => (data == null ? notFound(message) : json(data));
