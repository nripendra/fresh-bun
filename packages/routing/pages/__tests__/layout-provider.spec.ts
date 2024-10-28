import { describe, expect, test } from "bun:test";
import { AppServer } from "@fresh-bun/lib";
import { pageHandler } from "..";
import { fileSystemRouter } from "../../filesystem-router";
import { registerHyperMediaAwareness } from "../hyper-media-helper";

describe("pages-handler", () => {
  test("serves the page with layout provider", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}layout`);

    expect(await response.text()).toBe(
      '<!DOCTYPE html><html lang="en"><head><title>Hello</title></head><body><h1>Hello world</h1></body></html>',
    );
  });

  test("serves the page with nested layout provider", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}layout/nested`);

    expect(await response.text()).toBe(
      '<!DOCTYPE html><html lang="en"><head><title>Hello</title></head><body><div><h1>Header</h1><h1>Hello world</h1><footer>Footer</footer></div></body></html>',
    );
  });

  test("serves the page with null layout", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}layout/null-layout`);

    expect(await response.text()).toBe("<h1>Hello world</h1>");
  });

  test("serves the page with invalid layout", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}layout/invalid-layout`);

    expect(await response.text()).toBe("<h1>Hello world</h1>");
  });

  test("serves the page with invalid layout path", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(
        fileSystemRouter(
          "./routes",
          pageHandler({
            defaultLayoutFile: "somelayout",
          }),
        ),
      )
      .listen(0);
    const response = await fetch(`${server.url}layout/invalid-layout`);

    expect(await response.text()).toBe("<h1>Hello world</h1>");
  });

  describe("Hypermedia client awareness", () => {
    registerHyperMediaAwareness({
      isHyperMediaAjaxRequest(ctx) {
        return ctx.request.headers.has("X-AJAX-REQUEST");
      },
    });
    test("serves the page without layout when hypermedia client is detected", async () => {
      const app = new AppServer(import.meta.dir);
      using server = app
        .use(fileSystemRouter("./routes", pageHandler()))
        .listen(0);
      const response = await fetch(`${server.url}layout`);

      expect(await response.text()).toBe(
        '<!DOCTYPE html><html lang="en"><head><title>Hello</title></head><body><h1>Hello world</h1></body></html>',
      );

      const responseHyperMedia = await fetch(`${server.url}layout`, {
        headers: {
          "X-AJAX-REQUEST": "true",
        },
      });

      expect(await responseHyperMedia.text()).toBe("<h1>Hello world</h1>");
    });

    describe("nested layout", () => {
      test("when hypermediaBehaviour is Layout for the child layout", async () => {
        const app = new AppServer(import.meta.dir);
        using server = app
          .use(fileSystemRouter("./routes", pageHandler()))
          .listen(0);
        const response = await fetch(`${server.url}layout/nested`);

        expect(await response.text()).toBe(
          '<!DOCTYPE html><html lang="en"><head><title>Hello</title></head><body><div><h1>Header</h1><h1>Hello world</h1><footer>Footer</footer></div></body></html>',
        );

        const responseHyperMedia = await fetch(`${server.url}layout/nested`, {
          headers: {
            "X-AJAX-REQUEST": "true",
          },
        });

        expect(await responseHyperMedia.text()).toBe(
          "<div><h1>Header</h1><h1>Hello world</h1><footer>Footer</footer></div>",
        );
      });
      test("when hypermediaBehaviour not defined for the child layout", async () => {
        const app = new AppServer(import.meta.dir);
        using server = app
          .use(fileSystemRouter("./routes", pageHandler()))
          .listen(0);
        const response = await fetch(`${server.url}layout/nested2`);

        expect(await response.text()).toBe(
          '<!DOCTYPE html><html lang="en"><head><title>Hello</title></head><body><div><h1>Header</h1><h1>Hello world</h1><footer>Footer</footer></div></body></html>',
        );

        const responseHyperMedia = await fetch(`${server.url}layout/nested2`, {
          headers: {
            "X-AJAX-REQUEST": "true",
          },
        });

        expect(await responseHyperMedia.text()).toBe("<h1>Hello world</h1>");
      });
    });
  });
});
