import { describe, expect, test } from "bun:test";
import { cookie } from "@fresh-bun/cookies";
import { AppServer } from "@fresh-bun/lib";
import {
  type Session,
  type SessionStore,
  getSessionData,
  session,
  setSessionData,
} from "..";

describe("session-middleware", () => {
  const sessions = new Map<string, Session>();
  const inMemorySessionStore: SessionStore = {
    createSession: async (
      sessionId: `${string}-${string}-${string}-${string}-${string}`,
    ): Promise<Session> => {
      const session = {
        sessionId,
        createdDate: new Date().getDate(),
        lastAccessDate: new Date().getDate(),
        lastStoreDate: new Date().getDate(),
      };
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, session);
      }
      return session;
    },
    findByOrCreate: async (
      sessionId: `${string}-${string}-${string}-${string}-${string}`,
    ): Promise<Session> => {
      if (sessions.has(sessionId)) {
        // @ts-ignore
        return sessions.get(sessionId);
      }
      const session = {
        sessionId,
        createdDate: new Date().getDate(),
        lastAccessDate: new Date().getDate(),
        lastStoreDate: new Date().getDate(),
      };
      sessions.set(sessionId, session);
      return session;
    },
    save: async (session: Session): Promise<Session> => {
      sessions.set(session.sessionId, session);
      return session;
    },
  };
  test("when cookie middleware is not setup before session middleware, starting up server fails.", async () => {
    const app = new AppServer(import.meta.dir);

    app
      .use(
        session({
          store: inMemorySessionStore,
        }),
      )
      .use(async (ctx) => {
        const url = new URL(ctx.request.url);
        if (url.pathname === "/set-session") {
          setSessionData(ctx.parent, "sessionData", "Hello");
          return new Response("HELLO WORLD");
        }
        const data = getSessionData<string>(ctx.parent, "sessionData");
        return new Response(data);
      });

    let failed = false;
    try {
      using _server = app.listen(0);
    } catch (e) {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test("when session middleware is used before cookie middleware, starting up server fails.", async () => {
    const app = new AppServer(import.meta.dir);

    app
      .use(
        session({
          store: inMemorySessionStore,
        }),
      )
      .use(cookie())
      .use(async (ctx) => {
        const url = new URL(ctx.request.url);
        if (url.pathname === "/set-session") {
          setSessionData(ctx.parent, "sessionData", "Hello");
          return new Response("HELLO WORLD");
        }
        const data = getSessionData<string>(ctx.parent, "sessionData");
        return new Response(data);
      });

    let failed = false;
    try {
      using _server = app.listen(0);
    } catch (e) {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test("enabling session middleware", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(cookie())
      .use(
        session({
          store: inMemorySessionStore,
        }),
      )
      .use(async (ctx) => {
        const url = new URL(ctx.request.url);
        if (url.pathname === "/set-session") {
          setSessionData(ctx.parent, "sessionData", "Hello");
          return new Response("HELLO WORLD");
        }
        const data = getSessionData<string>(ctx.parent, "sessionData");
        return new Response(data);
      })
      .listen(0);
    const res = await fetch(`${server.url}set-session`);
    // session id is tracked through cookie.
    const cookies = res.headers.getSetCookie();
    const response = await fetch(`${server.url}`, {
      headers: {
        Cookie: cookies[0].split(";")[0],
      },
    });

    expect(await response.text()).toBe("Hello");
  });
});
