import type { RequestContext } from "@fresh-bun/lib/request-context";

export interface HyperMediaAjaxHelper {
  isHyperMediaAjaxRequest(ctx: RequestContext): boolean;
}

let hyperMediaHelper: HyperMediaAjaxHelper | undefined = undefined;

export const registerHyperMediaAwareness = (helper: HyperMediaAjaxHelper) => {
  hyperMediaHelper = helper;
};

export function isHyperMediaAjaxRequest(ctx: RequestContext): boolean {
  if (hyperMediaHelper) {
    return hyperMediaHelper.isHyperMediaAjaxRequest(ctx);
  }
  return false;
}
