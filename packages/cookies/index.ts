import { Middleware } from "@fresh-bun/lib/middleware";
import type { RequestContext } from "@fresh-bun/lib/request-context";
import type { SerializeOptions } from "cookie";
import { CookieJar } from "./cookie-jar";

function getCookieJar(ctx: RequestContext) {
  return ctx.properties.get("__cookie_jar") as CookieJar | undefined | null;
}

function setCookieJar(
  ctx: RequestContext,
  cookieJar: CookieJar | undefined | null,
) {
  ctx.properties.set("__cookie_jar", cookieJar);
}

export function getIncommingCookie(ctx: RequestContext, name: string) {
  let cookieJar = getCookieJar(ctx);
  if (!cookieJar) {
    cookieJar = new CookieJar();
    setCookieJar(ctx, cookieJar);
  }
  return cookieJar.getFirstIncomming(name);
}

export function getOutgoingCookie(ctx: RequestContext, name: string) {
  let cookieJar = getCookieJar(ctx);
  if (!cookieJar) {
    cookieJar = new CookieJar();
    setCookieJar(ctx, cookieJar);
  }
  return cookieJar.getFirstOutgoing(name);
}

export function setCookie(
  ctx: RequestContext,
  name: string,
  value: string,
  options?: SerializeOptions,
) {
  let cookieJar = getCookieJar(ctx);
  if (!cookieJar) {
    cookieJar = new CookieJar();
    setCookieJar(ctx, cookieJar);
  }

  cookieJar.setOutgoing({ name, value, options });
}

export function removeCookie(ctx: RequestContext, name: string) {
  let cookieJar = getCookieJar(ctx);
  if (!cookieJar) {
    cookieJar = new CookieJar();
    setCookieJar(ctx, cookieJar);
  }

  cookieJar.remove(name);
}

function mergeCookies(
  cookieJar: CookieJar | null | undefined,
  response: Response,
) {
  if (cookieJar) {
    const headers = response.headers;

    const setCookies = headers.getSetCookie();
    if (cookieJar.length > 0) {
      const cookieJarCookies = cookieJar.serialize();
      let responseCookie = setCookies.join("; ");
      responseCookie += cookieJarCookies;
      response.headers.set("Set-Cookie", responseCookie);
    }
  }
  return response;
}

async function extractCookies(
  cookieJar: CookieJar | null | undefined,
  response: Response,
) {
  if (cookieJar) {
    const headers = response.headers;

    const setCookies = headers.getSetCookie();
    if (setCookies.length > 0) {
      const setCookieParser = (await import("set-cookie-parser")).default;
      const cookies = setCookieParser.parse(response.headers.getSetCookie());
      for (const cookie of cookies) {
        cookieJar.setOutgoing(cookie);
      }
    }
  }
}

export function sendCookie(ctx: RequestContext, response: Response) {
  const cookieJar = getCookieJar(ctx);
  return mergeCookies(cookieJar, response);
}

export class CookieMiddlware extends Middleware {}
export const cookie = () => {
  return new CookieMiddlware({
    handlerFn: async (ctx) => {
      const cookieJar = new CookieJar(ctx.parent);
      setCookieJar(ctx.parent, cookieJar);
      ctx.parent.addEventListener(
        "forwardedRequestCompleted",
        async (response) => {
          await extractCookies(cookieJar, response);
        },
      );
      const response = await ctx.consumeNext();
      return sendCookie(ctx.parent, response);
    },
    name: "cookie-middleware",
  });
};
