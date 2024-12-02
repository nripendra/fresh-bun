import type { RequestContext } from "@fresh-bun/lib/request-context";
import { SafeHttpError } from "@fresh-bun/lib/safe-http-errors";
import { definePage } from "@fresh-bun/routing/pages";
import LayoutProvider from "@fresh-bun/routing/pages/layout-provider";

interface ErrorData {
  error: unknown;
  errorId: string;
}

function ErrorMessage({ error }: { error: unknown }) {
  if (error instanceof SafeHttpError) {
    return <>{error.message}</>;
  }
  return <>{"Some error occured while processing this request."}</>;
}

function StackTrace({ error, ctx }: { error: unknown; ctx: RequestContext }) {
  if (ctx.server.development) {
    return (
      <div className={"border border-gray-500 mt-6 p-5"}>
        <code>
          <pre>{(error as Error).stack}</pre>
        </code>
      </div>
    );
  }
  return <div className={"border border-gray-500 mt-6 p-5"}>Redacted</div>;
}

export default definePage<ErrorData>(({ ctx, data }) => {
  const { error, errorId } = data;
  return (
    <LayoutProvider ctx={ctx}>
      <div className={"grid place-items-center h-full"}>
        <div className={"w-9/12"}>
          <h1 className={"text-error text-3xl"}>Error on this page</h1>
          <div className={"mt-6"}>
            <div>
              <strong>Page:</strong>
              <pre>{ctx.request.url}</pre>
            </div>
            <div className={"mt-6"}>
              <strong>Error message:</strong>
            </div>
            <ErrorMessage error={error} />
          </div>
          <div className={"mt-6"}>
            <strong>Stack trace</strong>
            <StackTrace error={error} ctx={ctx} />
          </div>
        </div>
      </div>
    </LayoutProvider>
  );
});
