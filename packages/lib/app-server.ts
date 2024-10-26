import * as Path from "node:path";
// import * as FileSystem from "node:fs";

import type { Server, ServerWebSocket, WebSocketHandler } from "bun";
// import { RouterPipeline, StaticRouter } from "./router";
import { AppContext } from "./app-context";
// import { Conventions } from "./conventions";
// import { Logger } from "./logging";
import { AnonymousPrincipal, Authentication } from "./authentication";
import {
  // HandlerMiddleware,
  Middleware,
  MiddlewareContext,
  // ServeStaticMiddleware,
  type MiddlewareFunction,
  MiddlewarePipeline,
} from "./middleware";
import { RequestContext } from "./request-context";

export class AppServer {
  constructor(private readonly rootDir: string = Path.dirname(Bun.main)) {}
  #middlewares: Middleware[] = [];
  // #handler?: HandlerMiddleware;
  // #staticRouters: StaticRouter[] = [];
  // #staticFolders: string[] = [];
  #websocketHandler?: WebSocketHandler<unknown>;
  use(middleware: MiddlewareFunction, name?: string): AppServer;
  use(middleware: Middleware): AppServer;
  use(middleware: Middleware | MiddlewareFunction, name?: string): AppServer {
    // if (middleware instanceof ServeStaticMiddleware) {
    //   const dirname = this.rootDir;
    //   let staticFolder: string = Path.resolve(dirname, middleware.folder);
    //   // todo do this only if development mode is true
    //   if (!FileSystem.existsSync(staticFolder)) {
    //     // for development purpose only
    //     staticFolder = Path.resolve(Path.dirname(dirname), middleware.folder);
    //   }

    //   this.#staticRouters.push(new StaticRouter(staticFolder));
    //   this.#staticFolders.push(staticFolder);
    // }
    // if (middleware instanceof HandlerMiddleware) {
    //   // Adding multiple HandlerMiddleware will overwrite the old one.
    //   this.#handler = middleware;
    // } else
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
  listen(port = 3000) {
    const pipelineMiddlewares = [...this.#middlewares];
    // if (this.#handler) {
    //   pipelineMiddlewares.push(this.#handler);
    // }

    // const conventions = (
    //   this.#handler?.conventions ?? new Conventions("./routes")
    // ).resolve(this.rootDir);

    const appContext = new AppContext(
      this.rootDir,
      [], //this.#staticFolders,
      Object.freeze([...this.#middlewares]) as Middleware[],
      [], // conventions,
      undefined,
      port,
    );

    // const routerPipeline = new RouterPipeline({
    //   routers: [...this.#staticRouters],
    // });
    // if (this.#handler) {
    //   routerPipeline.routers.push(
    //     new Bun.FileSystemRouter({
    //       dir: conventions.routesDir,
    //       style: "nextjs",
    //     })
    //   );
    // }
    const server = Bun.serve({
      async fetch(request: Request, server) {
        // const route = routerPipeline.match(request);
        const properties = new Map();
        const authentication = new Authentication(
          "UNKNOWN",
          new AnonymousPrincipal(),
        );
        const ctx = new RequestContext(
          properties,
          appContext,
          request,
          // routerPipeline,
          // route,
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
          throw e;
        }
      },
      websocket: this.#websocketHandler,
    });

    for (const middlware of pipelineMiddlewares) {
      middlware.config.onAppStart?.(appContext, server);
    }
    return server;
  }
}
