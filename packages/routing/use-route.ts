import type { MatchedRoute } from "bun";
import type { RequestContext } from "@fresh-bun/lib/request-context";

export function useRoute(ctx: RequestContext): MatchedRoute | undefined {
  return ctx.properties.get("route") as MatchedRoute;
}
