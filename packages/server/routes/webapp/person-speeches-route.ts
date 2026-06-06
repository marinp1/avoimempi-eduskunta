import SpeechesFragment from "#server/features/person/fragments/speeches.fragment";
import type { WebappDeps } from "./deps";
import { defineRoute } from "#server/helpers";

export function createPersonSpeechesRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/edustaja/:id/puheet",
    GET: async (_req, params) => {
      const { id } = params;
      if (!id || !/^\d+$/.test(id)) {
        return new Response("", { status: 404 });
      }
      const data = deps.personService.getPersonSpeeches(id);
      if (!data) return new Response("", { status: 404 });
      const html = SpeechesFragment({ data });
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });
}
