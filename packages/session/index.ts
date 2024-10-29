import { Database } from "bun:sqlite";
import FileSystem from "node:fs";
import Path from "node:path";
import {
  CookieMiddlware,
  getIncommingCookie,
  setCookie,
} from "@fresh-bun/cookies";
import {
  AnonymousPrincipal,
  Authentication,
  Principal,
  WellknownAuthType,
} from "@fresh-bun/lib/authentication";
import { Logger } from "@fresh-bun/lib/logging";
import { Middleware, defineMiddleware } from "@fresh-bun/lib/middleware";
import type { RequestContext } from "@fresh-bun/lib/request-context";

const UUID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const SESSION_KEY = "__Session";
const SESSION_STORE_KEY = "__session_store";

type UUID = `${string}-${string}-${string}-${string}-${string}`;
export interface Session {
  sessionId: UUID;
  createdDate: number;
  lastAccessDate: number;
  lastStoreDate: number;
  [key: string]: unknown;
}
export interface SessionStore {
  createSession(sessionId: UUID): Promise<Session>;
  findByOrCreate(sessionId: UUID): Promise<Session>;
  save(session: Session): Promise<Session>;
}

export interface SessionMiddlewareConfig {
  store?: SessionStore;
  cookieConfig?: {
    /** @default cookieName FreshBunSession */
    cookieName?: string;
    /** @default maxAge 60 * 60 (1hr)  */
    maxAge?: number;
    /** @default sameSite lax */
    sameSite?: "lax" | "none" | "strict";
    /** @default slidingExpiration true */
    slidingExpiration?: boolean;
    /** @default secure true */
    secure?: boolean;
  };
}

export function sqliteSessionStore(db: Database) {
  const query = db.query(
    "CREATE TABLE IF NOT EXISTS session(session_id varchar(50) NOT NULL PRIMARY KEY, session_data TEXT NULL);",
  );

  query.run();

  return {
    async createSession(sessionId: UUID): Promise<Session> {
      const now = new Date().getTime();
      const session = {
        sessionId,
        createdDate: now,
        lastAccessDate: now,
        lastStoreDate: now,
      };
      const query = db.prepare(
        "INSERT INTO session(session_id, session_data) VALUES ($session_id, $session_data)",
      );
      query.run({
        session_id: sessionId,
        session_data: JSON.stringify(session),
      });

      return session;
    },
    async findByOrCreate(sessionId: UUID): Promise<Session> {
      const query = db.prepare(
        "SELECT session_data FROM session WHERE session_id = $session_id",
      );
      const sessionData: { session_data: string }[] = query.all({
        session_id: sessionId,
      }) as { session_data: string }[];
      if (sessionData && sessionData.length > 0) {
        return JSON.parse(sessionData[0].session_data) as Session;
      }

      return this.createSession(sessionId);
    },
    async save(session: Session) {
      const query =
        db.prepare(`INSERT INTO session(session_id, session_data) VALUES ($session_id, $session_data) 
        ON CONFLICT(session_id) DO UPDATE SET session_data=$session_data;`);
      query.run({
        session_id: session.sessionId,
        session_data: JSON.stringify(session),
      });
      return session;
    },
  } satisfies SessionStore;
}

export class SessionMiddleware extends Middleware {}

export function session(config?: SessionMiddlewareConfig) {
  // biome-ignore lint: ensuring initialization
  config = config ?? {};
  const cookieConfig = config.cookieConfig;
  const maxAge = cookieConfig?.maxAge ?? 60 * 60;
  const cookieName = cookieConfig?.cookieName ?? "FreshBunSession";
  const sameSite = cookieConfig?.sameSite ?? "lax";
  const slidingExpiration = cookieConfig?.slidingExpiration ?? true;
  const secure = cookieConfig?.secure ?? true;

  const store =
    config.store ??
    sqliteSessionStore(
      (() => {
        const defaultSessionPath = "./.fresh-bun/sessions";
        if (!FileSystem.existsSync(defaultSessionPath)) {
          FileSystem.mkdirSync(defaultSessionPath, { recursive: true });
        }
        // default db
        const defaultDb = new Database(
          Path.join(defaultSessionPath, "sessions.db"),
          {
            strict: true,
            create: true,
          },
        );
        defaultDb.exec("PRAGMA journal_mode = WAL;");
        return defaultDb;
      })(),
    );
  return new SessionMiddleware({
    handlerFn: async (ctx) => {
      return Logger.startSpan("SessionMiddleware").do(async (logger) => {
        logger.debug("Start - ", ctx.request.url);
        // const CookieMiddlwareIndex = ctx.appContext.middlewares.findIndex(
        //   (it) => it instanceof CookieMiddlware,
        // );
        // if (CookieMiddlwareIndex === -1) {
        //   logger.debug("Incorrect setup. No cookie middleware found");
        //   throw new Error(
        //     "Session middleware cannot be used without using cookie middleware first.",
        //   );
        // }
        // const SelfIndex = ctx.appContext.middlewares.findIndex(
        //   (it) => it instanceof SessionMiddleware,
        // );
        // if (SelfIndex <= CookieMiddlwareIndex) {
        //   logger.debug(
        //     "Incorrect setup. Cookie middleware is confiured after SessionMiddleware",
        //   );
        //   throw new Error(
        //     "Cookie middleware needs to be setup before the session middleware.",
        //   );
        // }

        ctx.properties.set("__session_cookie_name", cookieName);
        ctx.properties.set(SESSION_STORE_KEY, store);

        const now = new Date().getTime();
        let session: Session;
        const sessionId = getIncommingCookie(ctx.parent, cookieName);

        if (
          typeof sessionId?.value === "string" &&
          UUID_REGEX.test(sessionId.value)
        ) {
          logger.debug("Incomming sessionId =", sessionId?.value);
          session = await store.findByOrCreate(sessionId.value as UUID);
        } else {
          const newSessionId = crypto.randomUUID();
          logger.debug("Creating new sessionId =", newSessionId);
          session = await store.createSession(newSessionId);
          session.created_by_url = ctx.request.url;
          ctx.parent.setForwardRequestCookie(cookieName, newSessionId);
        }
        ctx.properties.set(SESSION_KEY, session);

        try {
          logger.debug("session.sessionId =", session.sessionId);
          logger.debug("sessionId?.value", sessionId?.value);
          if (session.sessionId === sessionId?.value) {
            logger.debug("session.sessionId === sessionId?.value");
            const diffMs = now - session.lastStoreDate;
            const diffMins = Math.round(
              ((diffMs % 86400000) % 3600000) / 60000,
            );
            const maxAgeMins = Math.round(maxAge / 60);

            if (!slidingExpiration) {
              logger.debug("No slidingExpiration");
              return ctx.moveForward();
            }
            logger.debug(`Do slidingExpiration: ${diffMins}/${maxAgeMins}`);
            if (diffMins <= Math.round(maxAgeMins / 2)) {
              logger.debug("Do slidingExpiration - cookie valid");
              return ctx.moveForward();
            }
          }
          logger.debug("set session cookie", session.sessionId);
          session.lastStoreDate = now;
          const cookieOptions = {
            maxAge,
            path: "/",
            sameSite,
            httpOnly: true,
            secure,
          };
          setCookie(ctx.parent, cookieName, session.sessionId, cookieOptions);

          return ctx.consumeNext();
        } finally {
          session.lastAccessDate = now;
          await store.save(session);
          logger.debug("End - ", ctx.request.url);
        }
      });
    },
    name: "session-middleware",
    onAppStart(ctx, server) {
      const CookieMiddlwareIndex = ctx.middlewares.findIndex(
        (it) => it instanceof CookieMiddlware,
      );
      if (CookieMiddlwareIndex === -1) {
        throw new Error(
          "Session middleware cannot be used without using cookie middleware first.",
        );
      }
      const SelfIndex = ctx.middlewares.findIndex(
        (it) => it instanceof SessionMiddleware,
      );
      if (SelfIndex <= CookieMiddlwareIndex) {
        throw new Error(
          "Cookie middleware needs to be setup before the session middleware.",
        );
      }
    },
  });
}

export function setSessionData<T>(ctx: RequestContext, key: string, value: T) {
  const session = ctx.properties.get(SESSION_KEY) as Session;
  session[key] = value;
  const store = ctx.properties.get(SESSION_STORE_KEY) as SessionStore;
  if (store) {
    store.save(session);
  }
}

export function removeSessionData(ctx: RequestContext, key: string) {
  const session = ctx.properties.get(SESSION_KEY) as Session;
  delete session[key];
  const store = ctx.properties.get(SESSION_STORE_KEY) as SessionStore;
  if (store) {
    store.save(session);
  }
}

export async function refreshSessionData(ctx: RequestContext) {
  const store = ctx.properties.get(SESSION_STORE_KEY) as SessionStore;
  const session = ctx.properties.get(SESSION_KEY) as Session;
  ctx.properties.set(
    SESSION_KEY,
    await store.findByOrCreate(session.sessionId),
  );
}

export function getSessionData<T>(
  ctx: RequestContext,
  key: string,
): T | undefined {
  const session = ctx.properties.get(SESSION_KEY) as Session;
  return session[key] as T;
}

export function getSessionId(ctx: RequestContext): string {
  const session = ctx.properties.get(SESSION_KEY) as Session;
  return session.sessionId;
}

export function getSessionCookieName(ctx: RequestContext): string {
  return ctx.properties.get("__session_cookie_name") as string;
}

export function clearSessionData(ctx: RequestContext) {
  const session = ctx.properties.get(SESSION_KEY) as Session;
  if (session) {
    const { sessionId, lastAccessDate, createdDate, lastStoreDate } = session;
    ctx.properties.set(SESSION_KEY, {
      sessionId,
      lastAccessDate,
      createdDate,
      lastStoreDate,
    } satisfies Session);
  }
}

export function sessionAuthentication() {
  return defineMiddleware(
    async (ctx) => {
      const SessionMiddlewareIndex = ctx.appContext.middlewares.findIndex(
        (it) => it instanceof SessionMiddleware,
      );
      if (SessionMiddlewareIndex === -1) {
        throw new Error(
          "Authentication middleware cannot be used without using session middleware first.",
        );
      }

      const AUTHENTICATION = "__authentication";
      const principalData = getSessionData<Principal>(
        ctx.parent,
        AUTHENTICATION,
      );
      if (principalData) {
        const principal: Principal = new Principal(
          principalData.id,
          principalData.claims,
        );
        ctx.authentication.restore(
          new Authentication(WellknownAuthType.SESSION, principal),
        );
      }
      ctx.parent.addEventListener("forwardedRequestCompleted", async () => {
        await refreshSessionData(ctx.parent);
        const principalData = getSessionData<Principal>(
          ctx.parent,
          AUTHENTICATION,
        );

        if (principalData) {
          const principal: Principal = new Principal(
            principalData.id,
            principalData.claims,
          );
          ctx.authentication.restore(
            new Authentication(WellknownAuthType.SESSION, principal),
          );
        }
      });
      const response = await ctx.consumeNext();
      if (response) {
        if (!(ctx.authentication.principal instanceof AnonymousPrincipal)) {
          setSessionData(
            ctx.parent,
            AUTHENTICATION,
            ctx.authentication.principal,
          );
        } else {
          removeSessionData(ctx.parent, AUTHENTICATION);
        }
      }
      return response;
    },
    { name: "session-authentication-middleware" },
  );
}

export type FlashData<T = string> = {
  type: "alert" | "error" | "info" | "warning" | "success" | "notice";
  content: T;
};
export function setFlash<T>(ctx: RequestContext, value: FlashData<T>) {
  setSessionData(ctx, "__FLASH", value);
}
export function getFlash<T>(ctx: RequestContext): FlashData<T> | undefined {
  const flash = getSessionData(ctx, "__FLASH") as FlashData<T>;
  removeSessionData(ctx, "__FLASH");
  return flash;
}
