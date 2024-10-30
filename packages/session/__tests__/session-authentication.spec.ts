import { describe, expect, test } from "bun:test";
import { cookie } from "@fresh-bun/cookies";
import { AppServer } from "@fresh-bun/lib";
import { Principal } from "@fresh-bun/lib/authentication";
import { session, sessionAuthentication } from "..";

describe("session authentication", () => {
  test("enabling session authentication", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(cookie())
      .use(session())
      // using sessionAuthentication middleware requires cookie and session middlewares.
      .use(sessionAuthentication())
      .use(async (ctx) => {
        const url = new URL(ctx.request.url);
        if (url.pathname === "/login") {
          const form = await ctx.request.formData();
          const username = form.get("username") as string;
          if (username)
            ctx.authentication.authenticate(new Principal(username));
          return new Response(`Welcome ${username}`);
        }
        if (url.pathname === "/logout") {
          ctx.authentication.clear();
          return new Response("");
        }
        const username = ctx.authentication.principal.id;
        return new Response(`HELLO ${username}`);
      })
      .listen(0);
    const form = new FormData();
    form.set("username", "bob");
    const res = await fetch(`${server.url}login`, {
      method: "POST",
      body: form,
    });
    expect(await res.text()).toBe("Welcome bob");
    // session id is tracked through cookie.
    const cookies = res.headers.getSetCookie();
    const sessionCookie = cookies[0].split(";")[0];
    const response = await fetch(`${server.url}`, {
      headers: {
        Cookie: sessionCookie,
      },
    });

    expect(await response.text()).toBe("HELLO bob");

    await fetch(`${server.url}logout`, {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
      },
    });

    const response2 = await fetch(`${server.url}`, {
      headers: {
        Cookie: sessionCookie,
      },
    });
    expect(await response2.text()).toBe("HELLO Anonymous");
  });

  test("session authentication - when authentication is set by the forwarded request.", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(cookie())
      .use(session())
      // using sessionAuthentication middleware requires cookie and session middlewares.
      .use(sessionAuthentication())
      .use(async (ctx) => {
        const url = new URL(ctx.request.url);
        if (url.pathname === "/api/login") {
          const { username } = (await ctx.request.json()) as {
            username: string;
          };
          if (username)
            ctx.authentication.authenticate(new Principal(username));
          return new Response("");
        }
        if (url.pathname === "/logout") {
          ctx.authentication.clear();
          return new Response("");
        }
        if (url.pathname === "/login") {
          const form = await ctx.request.formData();
          const username = form.get("username") as string;
          await ctx.parent.fetch("/api/login", {
            method: "POST",
            body: JSON.stringify({ username }),
          });
          // authentication set by /api/login should be available here...
          return new Response(`Welcome ${ctx.authentication.principal.id}`);
        }
        const username = ctx.authentication.principal.id;
        return new Response(`HELLO ${username}`);
      })
      .listen(0);
    const form = new FormData();
    form.set("username", "bob");
    const res = await fetch(`${server.url}login`, {
      method: "POST",
      body: form,
    });
    expect(await res.text()).toBe("Welcome bob");
    // session id is tracked through cookie.
    const cookies = res.headers.getSetCookie();
    const sessionCookie = cookies[0].split(";")[0];
    const response = await fetch(`${server.url}`, {
      headers: {
        Cookie: sessionCookie,
      },
    });

    expect(await response.text()).toBe("HELLO bob");

    await fetch(`${server.url}logout`, {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
      },
    });

    const response2 = await fetch(`${server.url}`, {
      headers: {
        Cookie: sessionCookie,
      },
    });
    expect(await response2.text()).toBe("HELLO Anonymous");
  });
});
