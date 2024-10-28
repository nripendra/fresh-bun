// @jsxImportSource preact
import { definePage } from "../..";
import { defineHandler } from "../../../core";

export const GET = defineHandler((ctx) => {
  const url = new URL(ctx.request.url);
  return url.searchParams.get("query");
});

export default definePage<string>(({ data }) => {
  return <h1>Hello {data}</h1>;
});
