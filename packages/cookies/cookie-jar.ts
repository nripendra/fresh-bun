import type { RequestContext } from "@fresh-bun/lib/request-context";
import cookieHelper, { type SerializeOptions } from "cookie";

export interface Cookie {
  name: string;
  value: string;
  options?: SerializeOptions;
}

export class CookieJar {
  #incomingCookies: Cookie[] = [];
  #outGoingCookies: Cookie[] = [];

  constructor(ctx?: RequestContext) {
    if (ctx) {
      const clientCookieHeader = ctx.request.headers.get("Cookie");
      if (clientCookieHeader) {
        const parsedCookies = CookieJar.parse(clientCookieHeader);
        this.#incomingCookies = parsedCookies;
      }
    }
  }

  static parse(cookieHeader: string) {
    const parsedCookies = cookieHelper.parse(cookieHeader);
    const cookies: Cookie[] = [];
    for (const key in parsedCookies) {
      if (parsedCookies[key]) {
        cookies.push({
          name: key,
          value: parsedCookies[key],
        });
      }
    }
    return cookies;
  }

  get length() {
    return this.#outGoingCookies.length;
  }

  getIncomming(name: string) {
    return this.#incomingCookies.filter((it) => it.name === name);
  }

  getFirstIncomming(name: string) {
    return this.#incomingCookies.filter((it) => it.name === name).at(0);
  }

  getLastIncomming(name: string) {
    return this.#incomingCookies.filter((it) => it.name === name).at(-0);
  }

  getOutGoing(name: string): Cookie[] {
    return this.#outGoingCookies.filter((it) => it.name === name);
  }

  getFirstOutgoing(name: string): Cookie | undefined {
    return this.#outGoingCookies.filter((it) => it.name === name).at(0);
  }

  getLastOutgoing(name: string): Cookie | undefined {
    return this.#outGoingCookies.filter((it) => it.name === name).at(-1);
  }

  appendOutgoing(cookie: Cookie) {
    this.#outGoingCookies.push(cookie);
  }

  setOutgoing(cookie: Cookie) {
    this.#outGoingCookies = this.#outGoingCookies.filter(
      (it) => it.name !== cookie.name,
    );
    this.appendOutgoing(cookie);
  }

  remove(name: string) {
    this.#outGoingCookies = this.#outGoingCookies.filter(
      (it) => it.name !== name,
    );

    this.#outGoingCookies.push({
      name,
      value: "",
      options: {
        maxAge: 0,
        path: "/",
      },
    });
  }

  serialize() {
    const serializedCookies = this.#outGoingCookies.map((x) =>
      cookieHelper.serialize(x.name, x.value, x.options),
    );
    return serializedCookies.join("; ");
  }
}

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

export function appendCookie(
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
