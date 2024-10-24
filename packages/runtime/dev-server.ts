import Path from "node:path";

const devServer = Bun.serve({
  port: 0,
  fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/subscribe") {
      if (server.upgrade(request)) {
        return undefined;
      }
    }
    return new Response(
      JSON.stringify({ port: server.port, id: server.id, url: server.url })
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

const rootDir = Bun.argv[2];
await Bun.write(
  Bun.file(Path.join(rootDir, ".fresh-bun", ".devserver")),
  JSON.stringify({
    port: devServer.port,
    url: devServer.url,
  })
);
process.send?.("READY");
// export { devServer };
