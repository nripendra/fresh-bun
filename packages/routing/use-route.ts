import type { RequestContext } from "@fresh-bun/lib/request-context";
import type { MatchedRoute } from "bun";

export function useRoute(ctx: RequestContext): MatchedRoute | undefined {
  return ctx.properties.get("route") as MatchedRoute;
}
