import type { MatchedRoute } from "bun";

import * as FileSystem from "node:fs";
import * as Path from "node:path";

import { Logger } from "@fresh-bun/lib/logging";
import {
  type MiddlewareContext,
  defineMiddleware,
} from "@fresh-bun/lib/middleware";
import type { Router } from "@fresh-bun/lib/router";

export class StaticRouter implements Router {
  constructor(private staticFolder: string) {}
  match(input: string | Request | Response): MatchedRoute | null {
    return Logger.startSpan("StaticRouter").do((logger) => {
      let searchPath: string;
      if (input instanceof Request) {
        logger.debug("Resolving from request ", input.url);
        const url = new URL(input.url);
        searchPath = url.pathname;
        logger.debug("Pathname", searchPath);
      } else if (input instanceof Response) {
        logger.debug("Resolving from response ", input.url);
        const url = new URL(input.url);
        searchPath = url.pathname;
        logger.debug("Pathname", searchPath);
      } else {
        searchPath = input;
        logger.debug("Pathname", searchPath);
      }
      if (searchPath.startsWith("/")) searchPath = `.${searchPath}`;
      if (searchPath === "./") searchPath = "./index.html";
      logger.debug("SearchPath", searchPath);
      const filePath = Path.resolve(this.staticFolder, searchPath);
      logger.debug(`${searchPath} mapped to ${filePath}`);
      let isFile: boolean;
      try {
        isFile = FileSystem.lstatSync(filePath).isFile();
      } catch {
        isFile = false;
      }
      if (isFile) {
        logger.debug(`${filePath} found`);
        return {
          filePath,
          kind: "exact",
          name: Path.basename(filePath),
          params: {},
          pathname: searchPath,
          query: {},
          src: Path.basename(filePath),
        };
      }
      logger.debug("No file found for ", searchPath);
      return null;
    });
  }
}

type ServeStaticConfig = {
  cacheControl: string | ((ctx: MiddlewareContext) => string);
  pragma: string | ((ctx: MiddlewareContext) => string);
};
export const serveStatic = (
  folder: string,
  { cacheControl, pragma }: ServeStaticConfig = {
    cacheControl: "max-age=10000, public",
    pragma: "",
  },
) => {
  const router = new StaticRouter(folder);
  return defineMiddleware(
    async (ctx: MiddlewareContext) => {
      return Logger.startSpan("serve-static").do((logger) => {
        logger.debug("Start");
        const match = router.match(ctx.request);
        if (match) {
          if (cacheControl instanceof Function) {
            cacheControl = cacheControl(ctx);
          }
          if (pragma instanceof Function) {
            pragma = pragma(ctx);
          }
          const headers = new Headers();
          headers.append("Cache-Control", cacheControl);
          headers.append("Pragma", pragma);
          return new Response(Bun.file(match.filePath), { headers });
        }

        return ctx.moveForward();
      });
    },
    {
      name: "serve-static",
      async onAppStart(ctx, _server) {
        ctx.staticFolders.push(folder);
      },
    },
  );
};
