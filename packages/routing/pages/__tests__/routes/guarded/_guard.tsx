// @jsxImportSource preact
import { defineGuard } from "../../../../core";

export default defineGuard(async (ctx) => {
  const res = await ctx.next();
  res.headers.set("X-GUARDED", "true");
  return res;
});
