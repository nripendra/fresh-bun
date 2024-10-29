import { describe, expect, test, beforeAll } from "bun:test";
import { AppServer } from "@fresh-bun/lib";
import { pageHandler } from "..";
import { fileSystemRouter } from "../../filesystem-router";

describe("pages-handler", () => {
  beforeAll(() => {
    Bun.plugin({
      name: "client-manifest",
      async setup(builder) {
        builder.module("client-manifest", async () => {
          return {
            exports: {
                default: {
                    'public:///client/islands/my-island': '/client/islands/my-island.js',
                }
            },
            loader: "object",
          };
        });
      },
    });
  });
  test("serves the default exported simple function", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}island-test`);

    expect(await response.text()).toMatch(/<div>Hello<island-holder><island-marker data-island=".*" data-module="\/client\/islands\/my-island.js" data-props="{}"><div>Hello Island<\/div><\/island-marker><\/island-holder><\/div>/);
  });
});
