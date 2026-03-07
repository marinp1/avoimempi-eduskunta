import type {
  BaseRoute,
  SubRoute,
  TypedFetchResponse,
  GetProperRoute,
} from "#client/utils/fetch";

type AllRoutes = BaseRoute | SubRoute;

declare global {
  export type ApiRouteResponse<T extends AllRoutes> =
    GetProperRoute<T>[0] extends TypedFetchResponse<infer A> ? A : never;

  export type ApiRouteItem<T extends AllRoutes> =
    ApiRouteResponse<T> extends Array<infer A> ? A : never;
}
