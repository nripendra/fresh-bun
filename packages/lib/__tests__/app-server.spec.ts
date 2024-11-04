import { describe, expect, test } from "bun:test";
import { AppServer } from "../app-server";
import { Logger } from "../logging";
import { defineMiddleware } from "../middleware";

describe("App Server", () => {
  test("App Server with middleware function", async () => {
    const sut = new AppServer(import.meta.dir);
    sut.use(async (ctx) => {
      expect(ctx.appContext.port).toBe(server.port);
      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(server.url);
    expect(await response.text()).toBe("Hello world");
  });

  test("App Server with middleware function with name", async () => {
    const sut = new AppServer(import.meta.dir);
    const logs = [] as {
      kind: "LOG" | "DEBUG" | "ERROR";
      message?: string;
      optionalParams: unknown[];
    }[];
    Logger.setLogExporter({
      log(message?: string, ...optionalParams: unknown[]): void {
        logs.push({ kind: "LOG", message, optionalParams });
      },
      debug(message?: string, ...optionalParams: unknown[]): void {
        logs.push({ kind: "DEBUG", message, optionalParams });
      },
      error(message?: string, ...optionalParams: unknown[]): void {
        logs.push({ kind: "ERROR", message, optionalParams });
      },
    });

    sut.use(async (ctx) => {
      return new Response("Hello world");
    }, "my-middleware");

    using server = sut.listen(0);
    const response = await fetch(server.url);
    expect(await response.text()).toBe("Hello world");
    expect(
      logs
        .map((it) => it.message)
        .filter((it) => it?.includes("my-middleware")),
    ).toHaveLength(2);
  });

  test("App Server with defined middleware", async () => {
    const sut = new AppServer(import.meta.dir);
    const logs = [] as {
      kind: "LOG" | "DEBUG" | "ERROR";
      message?: string;
      optionalParams: unknown[];
    }[];
    Logger.setLogExporter({
      log(message?: string, ...optionalParams: unknown[]): void {
        logs.push({ kind: "LOG", message, optionalParams });
      },
      debug(message?: string, ...optionalParams: unknown[]): void {
        logs.push({ kind: "DEBUG", message, optionalParams });
      },
      error(message?: string, ...optionalParams: unknown[]): void {
        logs.push({ kind: "ERROR", message, optionalParams });
      },
    });

    const middleware = defineMiddleware(
      async (ctx) => {
        return new Response("Hello world");
      },
      { name: "my-defined-middleware" },
    );
    sut.use(middleware);

    using server = sut.listen(0);
    const response = await fetch(server.url);
    expect(await response.text()).toBe("Hello world");
    expect(
      logs
        .map((it) => it.message)
        .filter((it) => it?.includes("my-defined-middleware")),
    ).toHaveLength(2);
  });

  test("App Server with defined middleware, onAppStart", async () => {
    let onAppStart = false;
    const middleware = defineMiddleware(
      async (ctx) => {
        return ctx.consumeNext();
      },
      {
        name: "app-start-middleware",
        onAppStart(app, server) {
          onAppStart = true;
        },
      },
    );

    const sut = new AppServer(import.meta.dir);
    sut.use(middleware).use(async (ctx) => {
      return new Response("");
    });

    using server = sut.listen(0);
    const response = await fetch(server.url);
    expect(onAppStart).toBe(true);
  });

  test("Higher level middleware can send data to lower level middleware through properties", async () => {
    const sut = new AppServer(import.meta.dir);
    sut
      .use(async (ctx) => {
        ctx.properties.set("Content", "Hi there");
        return ctx.moveForward();
      })
      .use(async (ctx) => {
        expect(ctx.appContext.port).toBe(server.port);
        return new Response(ctx.properties.get("Content") as string);
      });

    using server = sut.listen(0);
    const response = await fetch(server.url);
    expect(await response.text()).toBe("Hi there");
  });
});
