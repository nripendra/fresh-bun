import type { Server } from "bun";
import type { AppContext } from "./app-context";
import type { Authentication } from "./authentication";
import { ValidationResult } from "./validation";

export class RequestContext {
  public get authentication(): Authentication {
    return this._authentication;
  }
  public get server(): Server {
    return this._server;
  }
  public get request(): Request {
    return this._request;
  }
  public get appContext(): AppContext {
    return this._appContext;
  }
  public get properties(): Map<string, unknown> {
    return this._properties;
  }

  constructor(
    private _properties: Map<string, unknown>,
    private _appContext: AppContext,
    private _request: Request,
    private readonly _server: Server,
    private readonly _authentication: Authentication,
  ) {}

  /**
   * Cookies are generally forwarded when calling ctx.fetch() method. However,
   * there are times when we are setting cookie for first time, and we want to
   * forward that cookie to ctx.fetch()
   * @param name
   * @param value
   */
  setForwardRequestCookie(name: string, value: string) {
    const map = this.getForwardRequestCookie();
    map.set(name, value);
    this.properties.set("__forward_request_cookie", map);
  }

  getForwardRequestCookie() {
    let map = this.properties.get("__forward_request_cookie") as Map<
      string,
      unknown
    >;
    if (!(map instanceof Map)) {
      map = new Map();
    }
    this.properties.set("__forward_request_cookie", map);
    return map;
  }

  // // This is basically an instuction to middleware handling authentication that
  // // it might want to restore authentication, since the API might have changed
  // // the authentication state
  // #restoreAuthentication = false;
  // get restoreAuthentication() {
  //   return this.#restoreAuthentication;
  // }
  // setRestoreAuthentication(value: boolean) {
  //   this.#restoreAuthentication = value;
  // }
  #eventHandlers: Map<
    "forwardedRequestCompleted",
    ((res: Response) => void)[]
  > = new Map();
  addEventListener(
    event: "forwardedRequestCompleted",
    handler: (res: Response) => void,
  ) {
    if (!this.#eventHandlers.has(event)) {
      this.#eventHandlers.set(event, []);
    }
    this.#eventHandlers.get(event)?.push(handler);
  }

  async fetch(input: string, init?: RequestInit): Promise<Response> {
    const request = this.request.clone();
    const requestUrl = new URL(request.url);
    requestUrl.pathname = input;
    // biome-ignore lint: initializing if undefined
    init = init ?? {};
    const headers = new Headers(init.headers);
    const map = this.getForwardRequestCookie();
    const forwardedCookies = [];
    for (const [name, value] of map.entries()) {
      forwardedCookies.push(`${name}=${value}`);
    }

    if (request.headers.has("Cookie")) {
      const incommingCookies = request.headers.get("Cookie");
      forwardedCookies.unshift(incommingCookies);
    }
    request.headers.set("Cookie", forwardedCookies.join(";"));
    request.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    init.headers = headers;
    if (!init.credentials) {
      init.credentials = "include";
    }

    const res = await fetch(requestUrl, init);
    const resClone = res.clone();
    const handlers = this.#eventHandlers.get("forwardedRequestCompleted");
    if (handlers) {
      for (const handler of handlers) {
        await Promise.resolve(handler(resClone));
      }
    }
    resClone.headers.forEach((val, key) => {
      res.headers.set(key, val);
    });
    return res;
  }

  async fetchJson<T extends unknown | ValidationResult>(
    input: string,
    init?: RequestInit,
  ): Promise<Response & { data: T }> {
    const response = (await this.fetch(input, init)) as Response & { data: T };
    response.data = await response.clone().json();
    if (
      response.data &&
      typeof response.data === "object" &&
      "__type" in response.data &&
      response.data.__type === "ValidationResult" &&
      "validations" in response.data
    ) {
      // @ts-ignore
      response.data = new ValidationResult(response.data.validations);
    }

    return response;
  }
}
