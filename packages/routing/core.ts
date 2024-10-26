import * as Path from "node:path";

import type { HttpMethod } from "@fresh-bun/lib/httpMethod";
import { Logger } from "@fresh-bun/lib/logging";
import { RequestContext } from "@fresh-bun/lib/request-context";
import { SafeHttpNotFoundError } from "@fresh-bun/lib/safe-http-errors";
import type { MatchedRoute } from "bun";
import { useRoute } from "./use-route";

export type Guard<T> = (
  ctx: RouteStepRequestContext<T>
) => Response | Promise<Response>;

export type RouteHandlerResult<T> = Response | T | Promise<Response | T>;
export type RouteHandler<T> = (ctx: RequestContext) => RouteHandlerResult<T>;

export type GuardedModule<T> = { _guard?: Guard<T> };
export type RouteModule<T> = {
  [method in HttpMethod]?: RouteHandler<T> | DefinedHandler<T> | undefined;
} & GuardedModule<T>;

export class RouteStepRequestContext<T> {
  handlerResult?: T;
  constructor(
    public parent: RequestContext,
    public pipeLine: RequestHandlerProcessorPipeline<T>
  ) {
    // super(
    //   parent.properties,
    //   parent.appContext,
    //   parent.request,
    //   parent.router,
    //   parent.route,
    //   parent.server,
    //   parent.authentication
    // );
  }
  next() {
    return this.pipeLine.consumeNext(this);
  }
}

export type StepResponse = Response | Promise<Response>;

export type StepFunction<T> = (ctx: RouteStepRequestContext<T>) => StepResponse;

/**
 *
 */
export class RouteHandlerStep<T> {
  constructor(
    private handlerFn: StepFunction<T>,
    public readonly name: string
  ) {}
  async handle(ctx: RouteStepRequestContext<T>) {
    return await Promise.resolve(this.handlerFn(ctx));
  }
}

/**
 *
 */
export class RequestHandlerProcessorPipeline<T> {
  constructor(private steps: RouteHandlerStep<T>[]) {
    Logger.startSpan("PageRequestProcessorPipeline").do((logger) => {
      logger.debug(`Initiated pipeline with ${this.steps.length} items`);
    });
  }

  #index = 0;
  async consumeNext(ctx: RouteStepRequestContext<T>): Promise<Response> {
    return Logger.startSpan("PageRequestProcessorPipeline-consume").do(
      async (logger) => {
        const total = this.steps.length;
        const currentStep = this.steps[this.#index];
        this.#index++;
        const progress = `[${this.#index}/${total}]`;
        logger.debug(`Processing step [${currentStep.name}] - ${progress}`);
        let response = await Promise.resolve(currentStep.handle(ctx));
        logger.debug(`Finished step [${currentStep.name}] - ${progress}`);
        return response;
      }
    );
  }
  async start(ctx: RouteStepRequestContext<T>) {
    return Logger.startSpan("PageRequestProcessorPipeline")
      .do((_) => {
        return this.consumeNext(ctx);
      })
      .finally(() => {
        this.#index = 0;
      });
  }
}

export class DefinedHandler<T> {
  constructor(public handlerFn: RouteHandler<T>, public guard?: Guard<T>) {}
}

/**
 *
 * @param handler
 * @param config
 * @returns
 */
export function defineHandler<T>(
  handler: RouteHandler<T>,
  config?: {
    _guard?: Guard<T>;
  }
) {
  return new DefinedHandler(handler, config?._guard);
}
/**
 *
 * @param fn
 * @returns
 */
export function defineGuard<T>(fn: Guard<T>) {
  return fn;
}

/**
 *
 * @param ctx
 * @returns
 */
export async function loadModule(route: MatchedRoute | undefined) {
  if (route) {
    return import(route.filePath);
  }
  return {};
}

async function tryImport(path: string) {
  try {
    return await import(path);
  } catch {
    return null;
  }
}

const guardsCache = new Map<string, Guard<unknown>[]>();
export async function findFolderGuards<T>(
  ctx: RequestContext
): Promise<Guard<T>[]> {
  return Logger.startSpan("findRouteGuards").do(async (logger) => {
    const guards = [] as Guard<T>[];
    logger.debug("Start");
    async function findRouteGuardsInner(
      folderPath: string,
      routerRootDir: string
    ) {
      logger.debug(folderPath);
      const guardPath = Path.join(folderPath, "_guard");
      const guardModule = await tryImport(guardPath);
      if (guardModule != null) {
        logger.debug("Found module at: ", guardPath);
        if (
          guardModule.default?.constructor?.name === "Function" ||
          guardModule.default?.constructor?.name === "AsyncFunction"
        ) {
          logger.debug("Found guard function");
          guards.push(guardModule.default);
        }
      } else {
        logger.debug("Module does not exist: ", guardPath);
      }

      if (folderPath === "/") {
        return;
      }

      if (
        Path.resolve(routerRootDir, folderPath) === Path.resolve(routerRootDir)
      ) {
        logger.debug("Reached routerRootDir");
        return;
      } else {
        await findRouteGuardsInner(Path.dirname(folderPath), routerRootDir);
      }
    }
    const route = useRoute(ctx);
    if (route) {
      const filePath = route.filePath;
      logger.debug("Looking up cache");
      const cachedGuards = guardsCache.get(filePath);
      if (cachedGuards) {
        logger.debug(`Found ${cachedGuards.length} guards in cache.`);
        return cachedGuards as Guard<T>[];
      }
      const dirname = Path.dirname(filePath);
      await findRouteGuardsInner(dirname, ctx.appContext.conventions[0].path);
      guardsCache.set(filePath, [...guards].reverse() as Guard<unknown>[]);
    }
    logger.debug(`Found ${guards.length} guards.`);
    return guards.reverse();
  });
}

export const routeStepFactory = {
  moduleGuard<T>(module: RouteModule<T>) {
    return new RouteHandlerStep<T>((ctx) => {
      if (module._guard) {
        return module._guard(ctx);
      }
      return ctx.next();
    }, "moduleGuard");
  },
  handlerGuard<T>(module: RouteModule<T>) {
    return new RouteHandlerStep<T>((ctx) => {
      const method = ctx.parent.request.method as HttpMethod;
      const handler = module?.[method];
      if (handler?.constructor?.name == "DefinedHandler") {
        if ((handler as DefinedHandler<T>).guard) {
          return (handler as DefinedHandler<T>).guard!(ctx);
        }
      }
      return ctx.next();
    }, "handlerGuard");
  },
  executeHandler<T>(module: RouteModule<T>) {
    return new RouteHandlerStep<T>(async (ctx) => {
      const method = ctx.parent.request.method as HttpMethod;
      const handler = module?.[method];
      let handlerFn: RouteHandler<T> | undefined = undefined;
      if (handler?.constructor?.name == "DefinedHandler") {
        handlerFn = (handler as DefinedHandler<T>).handlerFn;
      } else if (handler) {
        handlerFn = handler as RouteHandler<T>;
      }

      if (handlerFn) {
        const handlerResult = await Promise.resolve(handlerFn(ctx.parent));
        if (handlerResult instanceof Response) {
          return handlerResult;
          // } else if (isValidElement(handlerResult)) {
          //   return renderJsx(handlerResult);
        } else {
          ctx.handlerResult = handlerResult;
        }
      }
      return ctx.next();
    }, "handler");
  },
  fallback<T>() {
    return new RouteHandlerStep<T>((ctx) => {
      if (ctx.handlerResult) {
        const simplePrimitiveTypes = ["bigint", "boolean", "number", "string"];
        if (ctx.handlerResult.constructor === {}.constructor) {
          return Response.json(ctx.handlerResult);
        } else if (
          simplePrimitiveTypes.includes(typeof ctx.handlerResult) ||
          ctx.handlerResult instanceof Date
        ) {
          return new Response(`${ctx.handlerResult}`, {
            headers: { "Content-Type": "text/plain" },
          });
        }
      }
      throw new SafeHttpNotFoundError("Page not found");
    }, "fallback");
  },
};
