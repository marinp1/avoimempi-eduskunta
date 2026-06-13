import type { WebappDeps } from "./deps";
import {
  getWebappContext,
  getPeriodSelectorData,
  page,
  type PagePartial,
  type TickSource,
} from "./helpers";
import type { TimelineData } from "#server/layouts/timeline";
import {
  PageTraceCollector,
  recordPageTrace,
  traceStore,
} from "#server/database/trace-collector";

export interface PageResult {
  fragment: string;
  title: string;
  activePath: string;
  extraHeaders?: Record<string, string>;
  timelineData?: TimelineData;
  /** Optional narrower fragment for targeted htmx swaps (filtering, scrubbing). */
  partial?: PagePartial;
}

export interface WebappCtx {
  req: Request;
  deps: WebappDeps;
  tlData: ReturnType<typeof getWebappContext>["tlData"];
  period: ReturnType<typeof getWebappContext>["period"];
  bounds: ReturnType<typeof getWebappContext>["bounds"];
  periodData: ReturnType<typeof getPeriodSelectorData>;
}

/**
 * Wraps a webapp page handler, injecting timeline + period context and owning
 * the fragment-vs-full-page rendering via page().
 *
 * If the handler returns a Response directly (e.g. 404, htmx partial), it is
 * returned as-is. Otherwise the returned PageResult is rendered via page().
 */
export function withWebappPage<P extends Record<string, string>>(
  deps: WebappDeps,
  handler: (ctx: WebappCtx, params: P) => Promise<PageResult | Response>,
  opts?: { tickSource?: TickSource },
): (req: Request, params: P) => Promise<Response> {
  return async (req, params) => {
    const collector = new PageTraceCollector();
    return traceStore.run(collector, async () => {
      const url = new URL(req.url);
      const { tlData, period, bounds } = getWebappContext(
        url,
        deps,
        opts?.tickSource,
      );
      const periodData = getPeriodSelectorData(url, deps.metadataRepository);
      const ctx: WebappCtx = { req, deps, tlData, period, bounds, periodData };
      try {
        const result = await handler(ctx, params);
        if (result instanceof Response) return result;
        recordPageTrace(url, collector, result.title);
        return page({
          req,
          fragment: result.fragment,
          activePath: result.activePath,
          title: result.title,
          timelineData: result.timelineData ?? tlData,
          periodData,
          extraHeaders: result.extraHeaders,
          partial: result.partial,
        });
      } catch (e) {
        if (e instanceof Response) return e;
        throw e;
      }
    });
  };
}
