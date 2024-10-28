import { parseArgs } from "node:util";
import type { Middleware, MiddlewareFunction } from "@fresh-bun/lib/middleware";
import type { RequestContext } from "@fresh-bun/lib/request-context";
import { fileSystemRouter } from "@fresh-bun/routing/filesystem-router";
import { pageHandler } from "@fresh-bun/routing/pages";
import { serveStatic } from "@fresh-bun/routing/serve-static";
import type { WebSocketHandler } from "bun";
import { AppServer } from "../lib/app-server";

export type FreshBunRuntimeConfig = {
  rootDir: string;
};

const { values } = parseArgs({
  args: Bun.argv,
  strict: true,
  options: {
    plugin: {
      type: "string",
    },
  },
  allowPositionals: true,
});

let appPlugin: {
  beforeServerStart(appServer: AppServer, rootDir: string): Promise<void>;
  afterServerStart(appServer: AppServer, rootDir: string): Promise<void>;
} | null = null;

export class FreshBun {
  #appServer: AppServer;
  private constructor(public readonly config: FreshBunRuntimeConfig) {
    this.#appServer = new AppServer(this.config.rootDir);
  }

  use(middleware: MiddlewareFunction, name?: string): FreshBun;
  use(middleware: Middleware): FreshBun;
  use(middleware: Middleware | MiddlewareFunction, name?: string): FreshBun {
    // @ts-ignore
    this.#appServer.use(middleware, name);
    return this;
  }
  websocket<WebSocketDataType extends { ctx: RequestContext }>(
    websocket: WebSocketHandler<WebSocketDataType>,
  ) {
    this.#appServer.websocket(websocket);
    return this;
  }
  async serve(port = 3000) {
    this.#appServer.use(serveStatic("./public"));
    if (values.plugin) {
      appPlugin = (await import(values.plugin)).default;
    }

    if (appPlugin) {
      await appPlugin.beforeServerStart(this.#appServer, this.config.rootDir);
    }
    this.#appServer.use(fileSystemRouter("./routes", pageHandler()));
    try {
      return await Promise.resolve(this.#appServer.listen(port));
    } finally {
      if (appPlugin) {
        await appPlugin.afterServerStart(this.#appServer, this.config.rootDir);
      }
    }
  }

  static create({
    rootDir,
  }: Partial<FreshBunRuntimeConfig> & Pick<FreshBunRuntimeConfig, "rootDir">) {
    Bun.env.FRESH_BUN_ROOT_DIR = rootDir;

    return new FreshBun({
      rootDir,
    });
  }
}
