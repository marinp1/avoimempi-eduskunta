const SECURITY_HEADERS: [string, string][] = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  [
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
  ],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRouteHandler = (req: any) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteMap = Record<string, { GET: AnyRouteHandler } | Response | any>;

export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of SECURITY_HEADERS) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function wrapHandler(handler: AnyRouteHandler): AnyRouteHandler {
  return async (req: Request) => {
    const response = await handler(req);
    return addSecurityHeaders(response);
  };
}

export function withSecurityHeaders<T extends RouteMap>(routes: T): T {
  return Object.fromEntries(
    Object.entries(routes).map(([path, value]) => {
      if (value instanceof Response) {
        return [path, addSecurityHeaders(value)];
      }
      if (value !== null && typeof value === "object" && "GET" in value) {
        return [path, { ...value, GET: wrapHandler(value.GET) }];
      }
      // Pass through static assets (HTMLBundle, etc.) unchanged
      return [path, value];
    }),
  ) as T;
}
