import { describe, expect, test } from "bun:test";
import { AppServer } from "@fresh-bun/lib";
import { defineMiddleware } from "@fresh-bun/lib/middleware";
import { fileSystemRouter } from "../../filesystem-router";
import { useRoute } from "../../use-route";
import { serveStatic } from "../../serve-static";

describe("serve-static", () => {
  test("serves from static folder", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app.use(serveStatic("./static")).listen(0);
    const response = await fetch(`${server.url}hello`);

    expect(await response.text()).toBe("HELLO WORLD");
  });

  test("When static router is registered first, it should get resolved first", async () => {
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
    using server = app.use(serveStatic("./static")).use(router).listen(0);
    const response = await fetch(`${server.url}hello`);

    expect(await response.text()).toBe("HELLO WORLD");
  });
});
