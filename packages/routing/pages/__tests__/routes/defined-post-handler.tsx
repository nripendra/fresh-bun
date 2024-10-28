// @jsxImportSource preact
import type { RequestContext } from "@fresh-bun/lib/request-context";
import { definePage } from "../..";
import { defineHandler } from "../../../core";

export const POST = defineHandler(async (ctx: RequestContext) => {
  const form = await ctx.request.formData();
  return { name: form.get("who") };
});

export default definePage<{ name: string }>(({ data }) => {
  return <h1>Hello {data.name}</h1>;
});
