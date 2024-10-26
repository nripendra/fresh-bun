import Path from "node:path";
import type { AppServer } from "@fresh-bun/lib";
import { serveStatic } from "@fresh-bun/routing/serve-static";
import { defineMiddleware } from "@fresh-bun/lib/middleware";

const websocketReloaderScript = (devServer: WebSocket) =>
  defineMiddleware(
    async (ctx) => {
      const response = await ctx.consumeNext();
      const rewriter = new HTMLRewriter();

      rewriter.on("body", {
        element(element) {
          element.onEndTag(async (end) => {
            end.before(
              `<script>
              const ws = new WebSocket("${devServer.url}")
              ws.addEventListener('message', (e) => {
                  window.location.reload(true);
              })
            </script>`,
              { html: true }
            );
          });
        },
      });

      return rewriter.transform(response);
    },
    { name: "websocketReloaderScript" }
  );

let ws: WebSocket | null;
export function getWs() {
  return ws;
}
export default {
  async beforeServerStart(appServer: AppServer, rootDir: string) {
    appServer.use(serveStatic(".fresh-bun/.dist"));

    const devServerInfo = await Bun.file(
      Path.join(rootDir, ".fresh-bun", ".devserver")
    ).json();

    await new Promise((resolve) => {
      ws = new WebSocket(`ws://localhost:${devServerInfo.port}/subscribe`);
      ws.addEventListener("open", resolve);
      appServer.use(websocketReloaderScript(ws));
    });
  },
  async afterServerStart(appServer: AppServer, rootDir: string) {
    if (ws) {
      ws.send("Server Restart!");
    }
  },
};
