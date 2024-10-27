import type { WebSocketHandler } from "bun";
import { AppContext } from "./app-context";
import { AnonymousPrincipal, Authentication } from "./authentication";
import {
  Middleware,
  MiddlewareContext,
  type MiddlewareFunction,
  MiddlewarePipeline,
} from "./middleware";
import { RequestContext } from "./request-context";
import { SafeHttpError } from "./safe-http-errors";

export class AppServer {
  constructor(private readonly rootDir: string) {
    Bun.env.FRESH_BUN_ROOT_DIR = rootDir;
  }
  #middlewares: Middleware[] = [];
  #websocketHandler?: WebSocketHandler<unknown>;
  use(middleware: MiddlewareFunction, name?: string): AppServer;
  use(middleware: Middleware): AppServer;
  use(middleware: Middleware | MiddlewareFunction, name?: string): AppServer {
    if (middleware instanceof Middleware) {
      if (!middleware.config.name) {
        this.#middlewares.push(
          new Middleware({
            ...middleware.config,
            name: `Middleware[${this.#middlewares.length}]`,
          }),
        );
      } else {
        this.#middlewares.push(middleware);
      }
    } else {
      this.#middlewares.push(
        new Middleware({
          handlerFn: middleware,
          name:
            name ||
            middleware.name ||
            `Middleware[${this.#middlewares.length}]`,
        }),
      );
    }
    return this;
  }
  websocket<WebSocketDataType extends { ctx: RequestContext }>(
    websocket: WebSocketHandler<WebSocketDataType>,
  ) {
    this.#websocketHandler = websocket;
    return this;
  }
  listen(port = Number.parseInt(Bun.env.FRESH_BUN_PORT ?? "3000")) {
    const pipelineMiddlewares = [...this.#middlewares];

    const appContext = new AppContext(
      this.rootDir,
      [], //this.#staticFolders,
      Object.freeze([...this.#middlewares]) as Middleware[],
      [], // conventions,
      undefined,
      port,
    );

    const server = Bun.serve({
      port,
      async fetch(request: Request, server) {
        const properties = new Map();
        const authentication = new Authentication(
          "UNKNOWN",
          new AnonymousPrincipal(),
        );
        const ctx = new RequestContext(
          properties,
          appContext,
          request,
          server,
          authentication,
        );

        const pipeLine = new MiddlewarePipeline([...pipelineMiddlewares]);

        const middleWareCtx = new MiddlewareContext(ctx, pipeLine);
        try {
          return await Promise.resolve(pipeLine.start(middleWareCtx));
        } catch (e) {
          if (appContext.errorHandler) {
            return await appContext.errorHandler.handle(middleWareCtx);
          }
          if (e instanceof SafeHttpError) {
            return Response.json({ message: e.message }, { status: e.status });
          }
          throw e;
        }
      },
      websocket: this.#websocketHandler,
    });

    appContext.__setPort(server.port);

    for (const middlware of pipelineMiddlewares) {
      middlware.config.onAppStart?.(appContext, server);
    }
    return server;
  }
}
