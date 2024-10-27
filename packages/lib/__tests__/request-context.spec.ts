import { describe, expect, test } from "bun:test";
import { AppServer } from "../app-server";

describe("App Server - request-context", () => {
  test("Request context gives access to the request object", async () => {
    const sut = new AppServer(import.meta.dir);
    sut.use(async (ctx) => {
      expect(ctx.appContext.port).toBe(server.port);
      const url = new URL(ctx.parent.request.url);
      expect(url.pathname).toBe("/hello");
      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(`${server.url}hello`);
    expect(await response.text()).toBe("Hello world");
  });

  test("Request context forward request cookie", async () => {
    const sut = new AppServer(import.meta.dir);
    let didReceiveApiCall = false;
    sut.use(async (ctx) => {
      const url = new URL(ctx.parent.request.url);
      if (url.pathname === "/api/test") {
        didReceiveApiCall = true;
        const cookieHeader = ctx.parent.request.headers.get("Cookie");
        expect(cookieHeader).toBe("mycookie=cookie1");
        return Response.json({ hello: "from api" });
      }

      expect(ctx.appContext.port).toBe(server.port);

      ctx.parent.setForwardRequestCookie("mycookie", "cookie1");

      ctx.parent.addEventListener("forwardedRequestCompleted", async (res) => {
        res.headers.set("handled", "true");
        expect((await res.json()).hello).toBe("from api");
      });

      const res = await ctx.parent.fetchJson<{ hello: string }>("/api/test");
      expect(res.data.hello).toBe("from api");
      expect(res.headers.get("handled")).toBe("true");
      expect(url.pathname).toBe("/hello");
      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(`${server.url}hello`);
    expect(await response.text()).toBe("Hello world");
    expect(didReceiveApiCall).toBe(true);
  });
});
