import Edustaja from "#webapp/templates/pages/edustaja";
import type { PersonProfileData } from "#webapp/templates/pages/edustaja-view-model";
import { buildPersonProfileData } from "#webapp/templates/pages/edustaja-view-model";
import { fetchedAt } from "#webapp/templates/helpers";
import { personNotFoundResponse, withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import { defineRoute } from "#shared-helpers";
import { validateNumericId } from "./validators";

export function createEdustajaRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/edustaja/:id",
    GET: withWebappPage(deps, async (ctx, params) => {
      const id = validateNumericId(params.id);
      if (!id) {
        return personNotFoundResponse(ctx.req, `/edustaja/${params.id}`);
      }

      const details = ctx.deps.personRepository.fetchRepresentativeDetails({
        id,
      });
      if (!details) {
        return personNotFoundResponse(ctx.req, `/edustaja/${id}`);
      }

      const [
        groupMemberships,
        districts,
        terms,
        votes,
        metrics,
        dissents,
        initiatives,
        questions,
        committees,
        focusAreas,
        speeches,
      ] = await Promise.all([
        ctx.deps.personRepository.fetchPersonGroupMemberships({ id }),
        ctx.deps.personRepository.fetchRepresentativeDistricts({ id }),
        ctx.deps.personRepository.fetchPersonTerms({ id }),
        ctx.deps.personRepository.fetchPersonVotes({ id }),
        ctx.deps.personRepository.fetchPersonMetricsWithBaselines({
          personId: id,
        }),
        ctx.deps.personRepository.fetchPersonDissents({
          personId: id,
          limit: 20,
        }),
        ctx.deps.personRepository.fetchPersonInitiatives({
          personId: id,
          limit: 10,
        }),
        ctx.deps.personRepository.fetchPersonQuestions({
          personId: id,
          limit: 10,
        }),
        ctx.deps.personRepository.fetchPersonCommittees({ personId: id }),
        ctx.deps.personRepository.fetchPersonFocusAreas({
          personId: id,
          topN: 12,
        }),
        ctx.deps.personRepository.fetchPersonSpeeches({
          personId: id,
          limit: 10,
        }),
      ]);

      const capabilities = ctx.deps.personRepository.fetchPersonCapabilities({
        personId: id,
      });

      const data: PersonProfileData = buildPersonProfileData({
        details,
        groupMemberships,
        districts,
        terms,
        votes,
        metrics,
        dissents,
        initiatives,
        questions,
        committees,
        focusAreas,
        speeches,
        capabilities,
        fetchedAt: fetchedAt(),
      });

      return {
        fragment: Edustaja({ data }),
        activePath: "/edustajat",
        title: `${data.person.firstName} ${data.person.lastName}`,
      };
    }),
  });
}
