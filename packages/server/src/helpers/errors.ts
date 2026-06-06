import {
  notFoundResponse,
  type NotFoundOptions,
} from "../../routes/webapp/helpers/response";
import i18next from "i18next";

export function orNotFound(
  req: Request,
  value: unknown,
  path: string,
  opts: NotFoundOptions = {},
): asserts value is NonNullable<typeof value> {
  if (value == null) {
    throw notFoundResponse(req, path, opts);
  }
}

export function personOrNotFound(
  req: Request,
  value: unknown,
  path: string,
): asserts value is NonNullable<typeof value> {
  if (value == null) {
    throw notFoundResponse(req, path, {
      activePath: "/edustajat",
      title: i18next.t("persons:profile.not_found"),
    });
  }
}
