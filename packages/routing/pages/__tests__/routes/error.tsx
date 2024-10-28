// @jsxImportSource preact
import { SafeHttpMethodNotAllowedError } from "@fresh-bun/lib/safe-http-errors";
import { definePage } from "../..";
import { defineHandler } from "../../../core";

export const GET = defineHandler((ctx) => {
  throw new SafeHttpMethodNotAllowedError("GET method not allowed");
});

export default definePage(() => {
  return <h1>Hello world</h1>;
});
