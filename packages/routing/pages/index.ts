import { Convention } from "@fresh-bun/lib/convention";
import { Logger } from "@fresh-bun/lib/logging";
import {
  type MiddlewareContext,
  defineMiddleware,
} from "@fresh-bun/lib/middleware";
import type { RequestContext } from "@fresh-bun/lib/request-context";
import { SafeHttpError } from "@fresh-bun/lib/safe-http-errors";
import { type JSX, isValidElement } from "preact";
import { renderToStringAsync } from "preact-render-to-string";
import {
  type Guard,
  RequestHandlerProcessorPipeline,
  type RouteHandler,
  RouteHandlerStep,
  type RouteModule,
  RouteStepRequestContext,
  type StepResponse,
  findFolderGuards,
  loadModule,
  routeStepFactory,
} from "../core";
import { useRoute } from "../use-route";

export type PageProps<T> = JSX.IntrinsicAttributes & {
  ctx: RequestContext;
  data: T;
  // validationResult: ValidationResult;
};

export class DefinedHandler<T> {
  constructor(
    public handlerFn: RouteHandler<T>,
    public guard?: Guard<T>,
  ) {}
}
export type PageFactory<T> = (props: T) => JSX.Element | Promise<JSX.Element>;

class DefinedPages<T> {
  constructor(
    public pageFactory: PageFactory<PageProps<T>>,
    public guard?: Guard<T>,
  ) {}
}

export type PagesModule<T> = RouteModule<T> & {
  default?: DefinedPages<T> | PageFactory<PageProps<T>>;
};

export type PagesConfig = {
  defaultLayoutFile?: string;
  errorPageFile?: string;
};

/**
 *
 * @param object
 * @returns
 */
export async function renderJsx(
  object: StepResponse | JSX.Element | Promise<JSX.Element>,
  status = 200,
) {
  const response = await Promise.resolve(object);
  if (response instanceof Response) {
    return response;
  }
  let output = await renderToStringAsync(response);
  if (output.startsWith("<html")) output = `<!DOCTYPE html>${output}`;
  return new Response(output, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

function getPageFn<T>(module: PagesModule<T>) {
  const page = module.default;
  let pageFn: PageFactory<PageProps<T>> | undefined = undefined;

  if (page?.constructor?.name === "DefinedPages") {
    const pg = page as DefinedPages<T>;
    pageFn = pg.pageFactory;
  } else if (typeof page === "function") {
    pageFn = page as PageFactory<PageProps<T>>;
  }

  return pageFn;
}

const pageStepFactory = {
  ...routeStepFactory,
  pageGuard<T>(module: PagesModule<T>) {
    return new RouteHandlerStep<T>((ctx) => {
      const page = module.default;
      if (page?.constructor?.name === "DefinedPages") {
        const pg = page as DefinedPages<T>;
        if (pg.guard) {
          pg.guard(ctx);
          return pg.guard(ctx);
        }
      }
      return ctx.next();
    }, "pageGuard");
  },
  renderPage<T>(module: PagesModule<T>) {
    return new RouteHandlerStep<T>((ctx) => {
      if (isValidElement(ctx.handlerResult)) {
        return renderJsx(ctx.handlerResult);
      }
      const pageFn = getPageFn(module);
      if (pageFn) {
        const data = ctx.handlerResult as T;
        // let validationResult: ValidationResult = (
        //   (ctx.handlerResult as any) || {}
        // ).validationResult;
        // if (!(validationResult instanceof ValidationResult)) {
        //   validationResult = new ValidationResult();
        // }
        return renderJsx(
          pageFn({
            ctx: ctx.parent,
            data,
            // validationResult,
          }),
        );
      }
      return ctx.next();
    }, "page");
  },
};

export const pageHandler = ({
  defaultLayoutFile = "./routes/_layout",
  errorPageFile = "./routes/_error",
}: PagesConfig | undefined = {}) =>
  defineMiddleware(
    async (ctx: MiddlewareContext) => {
      const route = useRoute(ctx.parent);
      const module: PagesModule<{ data: unknown }> = await loadModule(route);
      const guardSteps = (
        await findFolderGuards<{ data: unknown }>(ctx.parent)
      ).map(
        (x) =>
          new RouteHandlerStep<{ data: unknown }>((ctx) => {
            return x(ctx);
          }, "folderGuard"),
      );
      const steps: RouteHandlerStep<{ data: unknown }>[] = [
        ...guardSteps,
        pageStepFactory.moduleGuard(module),
        pageStepFactory.handlerGuard(module),
        pageStepFactory.executeHandler(module),
        pageStepFactory.pageGuard(module),
        pageStepFactory.renderPage(module),
        pageStepFactory.fallback(),
      ];

      const pipeLine = new RequestHandlerProcessorPipeline([...steps]);
      return pipeLine.start(new RouteStepRequestContext(ctx.parent, pipeLine));
    },
    {
      name: "pages",
      async onAppStart(ctx, server) {
        ctx.conventions.push(new Convention("layoutFile", defaultLayoutFile));
        ctx.conventions.push(new Convention("errorPage", errorPageFile));
        ctx.errorHandler = errorPage();
      },
    },
  );

export function definePage<T>(
  pageFactory: PageFactory<PageProps<T>>,
  config?: { _guard?: Guard<T> },
) {
  return new DefinedPages<T>(pageFactory, config?._guard);
}

export const errorPage = () =>
  defineMiddleware(
    async (ctx) => {
      return Logger.startSpan("error-handler").do(async (logger) => {
        try {
          return await ctx.consumeNext();
        } catch (e) {
          const errorId = crypto.randomUUID();
          console.error(e, { errorId, ctx });

          const conventions = ctx.appContext.conventions.find(
            (x) => x.name === "errorPage",
          );
          if (!conventions) {
            throw new Error(
              "Incorrect convention setup: Could not find convention",
            );
          }
          let errorPageModule: PagesModule<{ error: unknown; errorId: string }>;
          try {
            errorPageModule = await import(
              conventions.resolve(ctx.appContext.rootDir)
            );
          } catch (e) {
            throw new Error(
              "Incorrect convention setup: Could not find error page module",
            );
          }

          const pageFn = getPageFn(errorPageModule);
          if (pageFn) {
            let status = 200;
            if (e instanceof SafeHttpError) {
              status = e.status;
            }
            return await renderJsx(
              pageFn({
                ctx: ctx.parent,
                data: { errorId, error: e },
                // validationResult: new ValidationResult(),
              }),
              status,
            );
          }
          throw new Error(
            "Incorrect convention setup: error page module should have a valid default export",
          );
        }
      });
    },
    { name: "error-handler" },
  );
