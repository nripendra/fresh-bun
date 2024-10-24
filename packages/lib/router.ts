import type { MatchedRoute } from "bun";

export interface Router {
  match(input: string | Request | Response): MatchedRoute | null;
}
