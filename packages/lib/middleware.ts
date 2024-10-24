import type { Server } from "bun";
import type { AppContext } from "./app-context";
import { Logger } from "./logging";
import { RequestContext } from "./request-context";
import { SafeHttpNotFoundError } from "./safe-http-errors";

const notFoundResponse = new Response("Not Found", { status: 404 });
class GotoNextHandlerResponse extends Response {
  private constructor() {
    super();
  }
  static #instance = new GotoNextHandlerResponse();
  static create() {
    return GotoNextHandlerResponse.#instance;
  }
}
const gotoNextHandlerResponse = GotoNextHandlerResponse.create();

export class MiddlewareContext {
  constructor(
    public readonly parent: RequestContext,
    private pipeline: MiddlewarePipeline
  ) {
    // super(
    //   parent.properties,
    //   parent.appContext,
    //   parent.request,
    //   // parent.router,
    //   // parent.route,
    //   parent.server,
    //   parent.authentication
    // );
  }

  get properties() {
    return this.parent.properties;
  }
  set properties(value) {
    this.parent.properties = value;
  }

  get appContext() {
    return this.parent.appContext;
  }
  set appContext(value) {
    this.parent.appContext = value;
  }

  get request() {
    return this.parent.request;
  }
  set request(value) {
    this.parent.request = value;
  }

  get server() {
    return this.parent.server;
  }

  get authentication() {
    return this.parent.authentication;
  }

  consumeNext(): Promise<Response> {
    return this.pipeline.consume(this);
  }
  moveForward(): Promise<Response> {
    return this.pipeline.moveForward(this);
  }
}

export type MiddlewareFunction = (ctx: MiddlewareContext) => Promise<Response>;
export type MiddlewareAppStartCallback = (
  appCtx: AppContext,
  server: Server
) => Promise<void>;

export interface MiddlewareConfig {
  readonly name: string;
  readonly handlerFn: MiddlewareFunction;
  readonly onAppStart?: MiddlewareAppStartCallback;
}
export class Middleware {
  constructor(public config: MiddlewareConfig) {}
  handle(ctx: MiddlewareContext): Promise<Response> {
    return this.config.handlerFn(ctx);
  }
}

export class MiddlewarePipeline {
  constructor(private middlewares: Middleware[]) {
    Logger.startSpan("MiddlewarePipeline").do((logger) => {
      logger.debug(
        `Initiated middlware pipeline with ${this.middlewares.length} items`
      );
    });
  }

  #index = 0;
  async consume(ctx: MiddlewareContext): Promise<Response> {
    return Logger.startSpan("MiddlewarePipeline-consume").do(async (logger) => {
      const total = this.middlewares.length;
      while (this.#index < this.middlewares.length) {
        const currentMiddleware = this.middlewares[this.#index];
        this.#index++;
        const progress = `[${this.#index}/${total}]`;
        logger.debug(
          `Processing middleware [${currentMiddleware.config.name}] - ${progress}`
        );
        let response = await Promise.resolve(currentMiddleware.handle(ctx));
        logger.debug(
          `Finished middleware [${currentMiddleware.config.name}] - ${progress}`
        );
        if (response instanceof GotoNextHandlerResponse) {
          continue;
        }
        return response;
      }
      throw new SafeHttpNotFoundError("No handler found");
    });
  }

  async moveForward(ctx: MiddlewareContext): Promise<Response> {
    return gotoNextHandlerResponse;
  }

  async start(ctx: MiddlewareContext) {
    return Logger.startSpan("MiddlewarePipeline")
      .do((_) => {
        return this.consume(ctx);
      })
      .finally(() => {
        this.#index = 0;
      });
  }
}

// export abstract class HandlerMiddleware extends Middleware {
//   constructor(
//     public readonly conventions: Conventions,
//     // public readonly routesFolder: string,
//     // public readonly layoutFolder: string,
//     name: string
//   ) {
//     super({ handlerFn: async () => notFoundResponse, name });
//   }
//   abstract handle(ctx: RequestContext): Promise<Response>;
// }

// type HandlerFunction = (ctx: RequestContext) => Promise<Response>;
// export function defineFileSystemRequestHandler<T extends Conventions>(
//   fn: HandlerFunction,
//   name: string,
//   conventions: T
//   // routesFolder: string,
//   // defaultLayout: string
// ) {
//   return new (class extends HandlerMiddleware {
//     handle(ctx: MiddlewareContext) {
//       return fn(ctx.parent);
//     }
//   })(conventions, name);
// }

export interface DefineMiddlewareConfig {
  readonly name: string;
  onAppStart?: MiddlewareAppStartCallback;
}
export function defineMiddleware(
  handlerFn: MiddlewareFunction,
  config: DefineMiddlewareConfig
) {
  return new Middleware({ handlerFn, ...config });
}

// export class ServeStaticMiddleware extends Middleware {
//   constructor(
//     handlerFn: MiddlewareFunction,
//     name: string,
//     public readonly folder: string
//   ) {
//     super({ handlerFn, name });
//   }
// }

// export function serveStatic(folder: string) {
//   return new ServeStaticMiddleware(
//     async (ctx) => {
//       // if (ctx.route) {
//       //   for (const staticFolder of ctx.appContext.staticFolders) {
//       //     if (ctx.route.filePath.startsWith(staticFolder)) {
//       //       return new Response(Bun.file(ctx.route.filePath));
//       //     }
//       //   }
//       // }
//       return ctx.moveForward();
//     },
//     "serveStatic",
//     folder
//   );
// }

type PathMatcher = (url: URL) => boolean;
export function upgradeWebsocket<T>(
  path: string | PathMatcher,
  handler?: (ctx: MiddlewareContext) => {
    headers?: Bun.HeadersInit;
    data?: T;
  }
) {
  return new Middleware({
    handlerFn: async (ctx) => {
      const url = new URL(ctx.request.url);

      if (typeof path == "string") {
        const originalPath = path;
        path = (input) => input.pathname == originalPath;
      }

      const pathMatch = path(url);
      if (pathMatch) {
        const { headers, data } = handler?.(ctx) ?? {};
        const result = ctx.server.upgrade(ctx.request, {
          headers,
          data: {
            ctx,
            ...(data || {}),
          },
        });
        if (result) {
          return new Response(null);
        }
      }
      return ctx.moveForward();
    },
    name: "upgradeWebsocket",
  });
}
