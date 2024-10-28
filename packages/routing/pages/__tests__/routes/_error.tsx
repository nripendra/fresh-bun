// @jsxImportSource preact
import type { SafeHttpError } from "@fresh-bun/lib/safe-http-errors";
import { definePage } from "../..";

interface ErrorData {
  error: SafeHttpError;
  errorId: string;
}

export default definePage<ErrorData>(({ data }) => {
  return <h1>Error Page: {data.error.message}</h1>;
});
