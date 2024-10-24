import { defineHandler } from "@fresh-bun/routing/core";

export const POST = defineHandler(async (ctx) => {
  ctx.authentication.clear();
  return Response.redirect("/");
});
