// @jsxImportSource preact
import { definePage } from "../../..";
import { defineGuard } from "../../../../core";

export default definePage(
  () => {
    return <h1>Hello world</h1>;
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
