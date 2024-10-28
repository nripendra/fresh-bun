// @jsxImportSource preact
import type { RequestContext } from "@fresh-bun/lib/request-context";
import { definePage } from "../..";

export function GET(ctx: RequestContext) {
  const url = new URL(ctx.request.url);
  return url.searchParams.get("query");
}

export default definePage<string>(({ data }) => {
  return <h1>Hello {data}</h1>;
});
