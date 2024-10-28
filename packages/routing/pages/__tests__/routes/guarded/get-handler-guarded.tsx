// @jsxImportSource preact
import { definePage } from "../../..";
import { defineGuard, defineHandler } from "../../../../core";

export const GET = defineHandler(
  async (ctx) => {
    return { query: "test" };
  },
  {
    _guard: defineGuard(async (ctx) => {
      const res = await ctx.next();
      res.headers.set("X-GET-GUARD", "true");
      return res;
    }),
  },
);

export default definePage<{ query: string }>(
  ({ data }) => {
    return <h1>Hello {data.query}</h1>;
  },
  {
    _guard: defineGuard(async (ctx) => {
      const res = await ctx.next();
      res.headers.set("X-PAGE-GUARD", "true");
      return res;
    }),
  },
);

export const _guard = defineGuard(async (ctx) => {
  const res = await ctx.next();
  res.headers.set("X-MODULE-GUARD", "true");
  return res;
});
