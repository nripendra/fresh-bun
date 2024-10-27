import Path from "node:path";
import { Convention } from "@fresh-bun/lib/convention";
import { Logger } from "@fresh-bun/lib/logging";
import { type Middleware, defineMiddleware } from "@fresh-bun/lib/middleware";

export const fileSystemRouter = (basePath: string, middleware: Middleware) => {
  return defineMiddleware(
    async (ctx) => {
      const router = new Bun.FileSystemRouter({
        dir: Path.join(ctx.appContext.rootDir, basePath),
        style: "nextjs",
      });
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
      onAppStart(ctx, server) {
        ctx.conventions.push(new Convention("routesBasePath", basePath));
        middleware.config.onAppStart?.(ctx, server);
      },
    },
  );
};
