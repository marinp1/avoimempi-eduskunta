interface TypedResponse<T> extends Response {
  json(): Promise<T>;
}

type ErrorResponse = { message: string };
type TypedJsonResponse<T> = TypedResponse<T>;
type RouteResponse<TData, TError = ErrorResponse> = TypedResponse<
  TData | TError
>;

type InferResponseBody<TResponse> = TResponse extends TypedResponse<infer TData>
  ? TData
  : never;

type InferRouteResponse<THandler> = THandler extends (
  ...args: any[]
) => infer TResult
  ? InferResponseBody<Awaited<TResult>>
  : never;

type InferRouteMethodResponse<
  TRoutes,
  TPath extends keyof TRoutes,
  TMethod extends keyof TRoutes[TPath],
> = InferRouteResponse<TRoutes[TPath][TMethod]>;

declare var Response: {
  json<T>(data: T, init?: ResponseInit): TypedJsonResponse<T>;
};
