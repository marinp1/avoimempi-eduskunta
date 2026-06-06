/** Finnish date formatting: ISO → d.m.yyyy */
export function formatFi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

/** Finnish long date: ISO → "maanantaina 15. tammikuuta 2025" */
export function formatFiLongDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("fi-FI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Finnish abbreviated date parts: ISO → { dow: "Ma", day: "15", mon: "tammi" } */
export function formatFiDateParts(iso: string): {
  dow: string;
  day: string;
  mon: string;
} {
  const d = new Date(iso + "T00:00:00");
  const rawDow = d.toLocaleDateString("fi-FI", { weekday: "short" });
  return {
    dow: rawDow.charAt(0).toUpperCase() + rawDow.slice(1),
    day: String(d.getDate()),
    mon: d.toLocaleDateString("fi-FI", { month: "short" }),
  };
}

/** Timestamp for "haettu X kello Y" labels */
export function fetchedAt(): string {
  return new Date().toLocaleString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Check if a request is an htmx partial navigation */
export function isHtmx(req: Request): boolean {
  return req.headers.get("HX-Request") === "true";
}

type ExtractParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<`/${Rest}`>]: string }
    : Path extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

type RouteHandler<Path extends string> = (
  req: Request,
  params: ExtractParams<Path>,
) => Response | Promise<Response>;

type RouteDefinition<Path extends string> = {
  path: Path;
  GET?: RouteHandler<Path>;
  POST?: RouteHandler<Path>;
};

type AdaptedHandler = (req: Request) => Response | Promise<Response>;

export function defineRoute<const Path extends string>(
  route: RouteDefinition<Path>,
): { [K in Path]: Record<string, AdaptedHandler> } {
  const { path, ...handlers } = route;

  const adapted: Record<string, AdaptedHandler> = {};

  const raw = handlers as Record<string, RouteHandler<Path> | undefined>;
  for (const method of ["GET", "POST"] as const) {
    const handler = raw[method];
    if (handler) {
      adapted[method] = (req: Request) => {
        const params =
          (req as { params?: Record<string, string> }).params ?? {};
        return handler(req, params as ExtractParams<Path>);
      };
    }
  }

  return { [path]: adapted } as { [K in Path]: Record<string, AdaptedHandler> };
}
