import { describe, expect, test } from "bun:test";
import { AppServer } from "@fresh-bun/lib";
import {
  cookie,
  getIncommingCookie,
  getOutgoingCookie,
  removeCookie,
  setCookie,
} from "..";

describe("Cookies Support", () => {
  test("When no cookie middleware, is added to app server cookie cannot be read.", async () => {
    const sut = new AppServer(import.meta.dir);
    sut.use(async (ctx) => {
      expect(getIncommingCookie(ctx.parent, "cookie1")?.value ?? "").toBe("");
      expect(getIncommingCookie(ctx.parent, "cookie2")?.value ?? "").toBe("");
      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(server.url, {
      headers: {
        cookie: "cookie1=value1;cookie2=value2",
      },
    });
    expect(await response.text()).toBe("Hello world");
  });

  test("Support for cookie is added through the cookie middleware", async () => {
    const sut = new AppServer(import.meta.dir);
    sut.use(cookie());
    sut.use(async (ctx) => {
      expect(getIncommingCookie(ctx.parent, "cookie1")?.value).toBe("value1");
      expect(getIncommingCookie(ctx.parent, "cookie2")?.value).toBe("value2");
      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(server.url, {
      headers: {
        cookie: "cookie1=value1;cookie2=value2",
      },
    });
    expect(await response.text()).toBe("Hello world");
  });

  test("Can access outgoing cookies", async () => {
    const sut = new AppServer(import.meta.dir);
    sut.use(cookie());
    sut.use(async (ctx) => {
      expect(getIncommingCookie(ctx.parent, "cookie1")?.value).toBe("value1");
      expect(getIncommingCookie(ctx.parent, "cookie2")?.value).toBe("value2");
      setCookie(ctx.parent, "res-cookie", "value1");
      return ctx.moveForward();
    });
    sut.use(async (ctx) => {
      const value = getOutgoingCookie(ctx.parent, "res-cookie");
      expect(value?.name).toBe("res-cookie");
      expect(value?.value).toBe("value1");
      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(server.url, {
      headers: {
        cookie: "cookie1=value1;cookie2=value2",
      },
    });
    expect(await response.text()).toBe("Hello world");
  });

  test("Cookie jar gets created if something goes wrong", async () => {
    const sut = new AppServer(import.meta.dir);
    sut.use(cookie());
    sut.use(async (ctx) => {
      expect(getIncommingCookie(ctx.parent, "cookie1")?.value).toBe("value1");
      expect(getIncommingCookie(ctx.parent, "cookie2")?.value).toBe("value2");
      ctx.parent.properties.set("__cookie_jar", null);
      setCookie(ctx.parent, "res-cookie", "value1");
      return ctx.moveForward();
    });
    sut.use(async (ctx) => {
      ctx.parent.properties.set("__cookie_jar", null);
      const cookie = getOutgoingCookie(ctx.parent, "res-cookie");
      // since cookie jar got recreated it doesn't have any data. However, it doesn't
      // throw error.
      expect(cookie?.value ?? "").toBe("");
      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(server.url, {
      headers: {
        cookie: "cookie1=value1;cookie2=value2",
      },
    });
    expect(await response.text()).toBe("Hello world");
  });

  test("Remove cookie", async () => {
    const sut = new AppServer(import.meta.dir);
    sut.use(cookie());
    sut.use(async (ctx) => {
      expect(getIncommingCookie(ctx.parent, "cookie1")?.value).toBe("value1");
      expect(getIncommingCookie(ctx.parent, "cookie2")?.value).toBe("value2");
      setCookie(ctx.parent, "res-cookie", "value1");
      return ctx.moveForward();
    });
    sut.use(async (ctx) => {
      const cookie = getOutgoingCookie(ctx.parent, "res-cookie");
      expect(cookie?.value ?? "").toBe("value1");
      removeCookie(ctx.parent, "res-cookie");
      return ctx.moveForward();
    });
    sut.use(async (ctx) => {
      const cookie = getOutgoingCookie(ctx.parent, "res-cookie");
      expect(cookie?.value ?? "").toBe("");
      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(server.url, {
      headers: {
        cookie: "cookie1=value1;cookie2=value2",
      },
    });
    expect(await response.text()).toBe("Hello world");
  });

  test("Remove cookie doesn't throw even if cookie jar is missing", async () => {
    const sut = new AppServer(import.meta.dir);
    sut.use(cookie());
    sut.use(async (ctx) => {
      expect(getIncommingCookie(ctx.parent, "cookie1")?.value).toBe("value1");
      expect(getIncommingCookie(ctx.parent, "cookie2")?.value).toBe("value2");
      setCookie(ctx.parent, "res-cookie", "value1");
      return ctx.moveForward();
    });
    sut.use(async (ctx) => {
      const cookie = getOutgoingCookie(ctx.parent, "res-cookie");
      expect(cookie?.value ?? "").toBe("value1");
      ctx.parent.properties.set("__cookie_jar", null);
      removeCookie(ctx.parent, "res-cookie");
      return ctx.moveForward();
    });
    sut.use(async (ctx) => {
      const cookie = getOutgoingCookie(ctx.parent, "res-cookie");
      expect(cookie?.value ?? "").toBe("");
      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(server.url, {
      headers: {
        cookie: "cookie1=value1;cookie2=value2",
      },
    });
    expect(await response.text()).toBe("Hello world");
  });
});

describe("Cookies from forwarded request", () => {
  test("cookies are forwared when calling endpoints using context.fetch()", async () => {
    const sut = new AppServer(import.meta.dir);
    sut.use(cookie());
    sut.use(async (ctx) => {
      const url = new URL(ctx.request.url);
      if (url.pathname === "/api/data") {
        expect(getIncommingCookie(ctx.parent, "cookie1")?.value).toBe("value1");
        expect(getIncommingCookie(ctx.parent, "cookie2")?.value).toBe("value2");
        setCookie(ctx.parent, "api-cookie", "value1");
        return Response.json({ data: "hello world" });
      }
      expect(getIncommingCookie(ctx.parent, "cookie1")?.value).toBe("value1");
      expect(getIncommingCookie(ctx.parent, "cookie2")?.value).toBe("value2");
      setCookie(ctx.parent, "handler-cookie", "value1");
      await ctx.parent.fetch("/api/data");

      return new Response("Hello world");
    });

    using server = sut.listen(0);
    const response = await fetch(server.url, {
      headers: {
        cookie: "cookie1=value1;cookie2=value2",
      },
    });
    expect(await response.text()).toBe("Hello world");
    const cookies = response.headers.getSetCookie();
    expect(cookies[0].split(";").map((it) => it.trim())).toContain(
      "api-cookie=value1",
    );
    expect(cookies[0].split(";").map((it) => it.trim())).toContain(
      "handler-cookie=value1",
    );
  });
});
