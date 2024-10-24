import { Convention } from "@fresh-bun/lib/convention";
import { Logger } from "@fresh-bun/lib/logging";
import { defineMiddleware, type Middleware } from "@fresh-bun/lib/middleware";

export const fileSystemRouter = (basePath: string, middleware: Middleware) => {
  const router = new Bun.FileSystemRouter({
    dir: basePath,
    style: "nextjs",
  });

  return defineMiddleware(
    async (ctx) => {
      return Logger.startSpan("FileSystemRouter").do((logger) => {
        logger.debug("Start", logger);
        const match = router.match(ctx.request);
        if (match) {
          ctx.properties.set("route", match);
          ctx.properties.set("router", router);
          logger.debug("Match", match);
          return middleware.handle(ctx);
        }
        logger.debug("No Match!");
        return ctx.moveForward();
      });
    },
    {
      name: "FileSystemRouter",
      async onAppStart(ctx, server) {
        ctx.conventions.push(new Convention("routesBasePath", basePath));
        middleware.config.onAppStart?.(ctx, server);
      },
    }
  );
};
