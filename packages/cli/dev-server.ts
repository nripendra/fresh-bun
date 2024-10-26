import Path from "node:path";

export async function devServer(rootDir: string) {
  const server = Bun.serve({
    port: 0,
    fetch(request, server) {
      const url = new URL(request.url);
      if (url.pathname === "/subscribe") {
        if (server.upgrade(request)) {
          return undefined;
        }
      }
      return new Response(
        JSON.stringify({ port: server.port, id: server.id, url: server.url }),
      );
    },
    websocket: {
      open(ws) {
        ws.subscribe("refresh");
      },
      message(ws, message) {
        ws.publish("refresh", `You said: ${message}`);
      },
    },
  });

  await Bun.write(
    Bun.file(Path.join(rootDir, ".fresh-bun", ".devserver")),
    JSON.stringify({
      port: server.port,
      url: server.url,
    }),
  );
  // process.send?.("READY");
  return server;
}
