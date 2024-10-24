import type { RequestContext } from "@fresh-bun/lib/request-context";
import { CookieJar } from "./cookie-jar";
import type { SerializeOptions } from "cookie";
import { Middleware } from "@fresh-bun/lib/middleware";

function getCookieJar(ctx: RequestContext) {
  return ctx.properties.get("__cookie_jar") as CookieJar | undefined | null;
}

function setCookieJar(
  ctx: RequestContext,
  cookieJar: CookieJar | undefined | null
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
  options?: SerializeOptions
) {
  let cookieJar = getCookieJar(ctx);
  if (!cookieJar) {
    cookieJar = new CookieJar();
    setCookieJar(ctx, cookieJar);
  }

  cookieJar.setOutgoing({ name, value, options });
}

export function appendCookie(
  ctx: RequestContext,
  name: string,
  value: string,
  options?: SerializeOptions
) {
  let cookieJar = getCookieJar(ctx);
  if (!cookieJar) {
    cookieJar = new CookieJar();
    setCookieJar(ctx, cookieJar);
  }

  cookieJar.appendOutgoing({ name, value, options });
}

export function removeCookie(ctx: RequestContext, name: string) {
  let cookieJar = getCookieJar(ctx);
  if (!cookieJar) {
    cookieJar = new CookieJar();
    setCookieJar(ctx, cookieJar);
  }

  cookieJar.remove(name);
}

function mergeCookies(cookieJar: CookieJar, response: Response) {
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

export function sendCookie(ctx: RequestContext, response: Response) {
  const cookieJar = getCookieJar(ctx);
  if (cookieJar) {
    return mergeCookies(cookieJar, response);
  }
  return response;
}

export class CookieMiddlware extends Middleware {}
export const cookie = () => {
  return new CookieMiddlware({
    handlerFn: async (ctx) => {
      const cookieJar = new CookieJar(ctx.parent);
      setCookieJar(ctx.parent, cookieJar);
      const response = await ctx.consumeNext();
      return mergeCookies(cookieJar, response);
    },
    name: "cookie-middleware",
  });
};
