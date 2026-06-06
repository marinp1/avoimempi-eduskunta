import Edustaja from "#server/features/person/pages/profile.page";
import { personNotFoundResponse, withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import { defineRoute } from "#server/helpers";
import { personOrNotFound } from "#server/helpers/errors";

export function createPersonRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/edustaja/:id",
    GET: withWebappPage(deps, async (ctx, params) => {
      const id = params.id && /^\d+$/.test(params.id) ? params.id : null;
      if (!id) {
        return personNotFoundResponse(ctx.req, `/edustaja/${params.id}`);
      }

      const data = await ctx.deps.personService.getProfile(id);
      personOrNotFound(ctx.req, data, `/edustaja/${id}`);

      return {
        fragment: Edustaja({ data }),
        activePath: "/edustajat",
        title: `${data.person.firstName} ${data.person.lastName}`,
      };
    }),
  });
}
