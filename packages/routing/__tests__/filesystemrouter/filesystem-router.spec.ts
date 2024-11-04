import { describe, expect, test } from "bun:test";
import { AppServer } from "@fresh-bun/lib";
import { defineMiddleware } from "@fresh-bun/lib/middleware";
import { SafeHttpError } from "@fresh-bun/lib/safe-http-errors";
import { fileSystemRouter } from "../../filesystem-router";
import { useRoute } from "../../use-route";

describe("filesystem-router", () => {
  test("finds correct route, gives a 404 error in case of incorrect route.", async () => {
    const router = fileSystemRouter(
      "./routes",
      defineMiddleware(
        async (ctx) => {
          const route = useRoute(ctx.parent) ?? {
            filePath: "NOT_FOUND",
            kind: "catch-all",
            name: "",
            params: {},
            pathname: "",
            query: "",
            src: "",
          };
          const filePath = route.filePath;
          const kind = route.kind;
          const name = route.name;
          const params = route.params;
          const pathname = route.pathname;
          const query = route.query;
          const src = route.src;
          return Response.json({
            filePath,
            kind,
            name,
            params,
            pathname,
            query,
            src,
          });
        },
        { name: "test-router" },
      ),
    );

    const app = new AppServer(import.meta.dir);
    using server = app
      .use(async (ctx) => {
        try {
          return await ctx.consumeNext();
        } catch (e) {
          console.log("ERROR", e);
          if (e instanceof SafeHttpError) {
            return new Response(
              JSON.stringify({
                message: e.message,
              }),
              { status: e.status },
            );
          }
          throw e;
        }
      })
      .use(router)
      .listen(0);
    const response = await fetch(server.url);
    expect((await response.json()).filePath).toBe(
      import.meta.resolve("./routes/index.tsx").replace("file://", ""),
    );

    const response1 = await fetch(`${server.url}about`);
    expect(response1.status).toBe(404);
    expect((await response1.json()).message).toBe(
      `No handler found ${server.url}about`,
    );
  });
});
