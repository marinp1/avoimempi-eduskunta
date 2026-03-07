import type { ApiRoutes as BunApiRoutes } from "../../server/index";

type Method = string;

type ParseResponse<T> = T extends Promise<RouteResponse<infer A>>
  ? Exclude<A, { error: string }>
  : T extends Promise<TypedJsonResponse<infer A>>
    ? A
    : T extends TypedJsonResponse<infer A>
      ? A
      : [unknown, T];

type ProcessRouteWildcard<T extends string> =
  T extends `${infer A extends string}/:${string}/${infer C extends string}`
    ? `${A}/${string}/${C}`
    : T extends `${infer A extends string}/:${string}`
      ? `_${A}/${string}`
      : `_${T}`;

type WithQP<T extends string> = `${T}${`?${string}` | ""}`;

type GenerateFetchParams<T extends Record<Method, (...args: any[]) => any>> = {
  [x in keyof T]: ParseResponse<ReturnType<T[x]>> extends infer M
    ? x extends "GET"
      ? [TypedFetchResponse<M>, RequestInit]
      : [TypedFetchResponse<M>, Omit<RequestInit, "method"> & { method: x }]
    : never;
}[keyof T];

type TypedApiRoutes = Readonly<{
  [x in keyof BunApiRoutes as WithQP<
    ProcessRouteWildcard<x>
  >]: GenerateFetchParams<BunApiRoutes[x]>;
}>;

export type BaseRoute = Extract<
  keyof TypedApiRoutes,
  `_${string}`
> extends `_${infer S extends string}`
  ? S
  : never;

export type SubRoute = Exclude<keyof TypedApiRoutes, `_${BaseRoute}`>;

export type IdentifierRouteType = Extract<
  keyof TypedApiRoutes,
  `${string}/by-identifier/${string}`
> extends `${string}api/${infer A extends string}/by-identifier/${string}`
  ? A
  : never;

export interface TypedFetchResponse<T> extends Omit<Response, "json"> {
  json: () => Promise<T>;
}

export type GetProperRoute<T extends SubRoute | BaseRoute> =
  T extends keyof TypedApiRoutes
    ? TypedApiRoutes[T]
    : `_${T}` extends keyof TypedApiRoutes
      ? TypedApiRoutes[`_${T}`]
      : never;

export function apiFetch<
  T extends SubRoute | BaseRoute,
  R extends GetProperRoute<T> = GetProperRoute<T>,
>(input: T, init?: R[1]): Promise<R[0]> {
  return fetch(input, init) as Promise<R[0]>;
}
