import Asiakohta from "#server/features/session/pages/agenda-item.page";
import { buildAsiakohtaData } from "#server/features/session/pages/section.view-model";
import { withWebappPage } from "./helpers";
import { fetchedAt } from "#server/helpers/template-helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";

export function createAsiakohtaRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/asiakohta/:key",
    GET: withWebappPage(deps, async (ctx, params) => {
      const key = params.key;

      const section = ctx.deps.sessionRepository.fetchSectionByKey({
        sectionKey: key,
      });
      if (!section) {
        return {
          fragment: `<section class="page-hero"><h1>${i18next.t("istunnot:detail.asiakohta_not_found")}</h1></section>`,
          activePath: `/asiakohta/${key}`,
          title: i18next.t("istunnot:detail.asiakohta_not_found"),
        };
      }

      const [speechesResult, sectionVotings] = await Promise.all([
        ctx.deps.sessionRepository.fetchSectionSpeeches({
          sectionKey: key,
          limit: 500,
          offset: 0,
        }),
        ctx.deps.sessionRepository.fetchSectionVotings({ sectionKey: key }),
      ]);

      const sessionData = ctx.deps.sessionRepository.fetchSessionByKey({
        key: section.session_key,
      });

      const data = buildAsiakohtaData({
        section,
        sessionSections: sessionData.sections,
        sectionVotings,
        speeches: speechesResult?.speeches ?? [],
        fetchedAt: fetchedAt(),
      });

      return {
        fragment: Asiakohta({
          title: i18next.t("common:asiakohta_title_format", {
            number: data.section.itemNumber ?? "",
          }),
          data,
        }),
        activePath: `/asiakohta/${key}`,
        title: data.section.title,
      };
    }),
  });
}
