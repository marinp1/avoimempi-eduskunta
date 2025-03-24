interface TypedResponse<T> extends Omit<Response, "json"> {
  json: () => Promise<T>;
}

declare function fetch<T>(
  input: string | URL | globalThis.Request,
  init?: RequestInit
): Promise<TypedResponse<T>>;
