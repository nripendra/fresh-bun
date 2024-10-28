import { test, describe, expect } from "bun:test";
import { AppServer } from "../app-server";
import { upgradeWebsocket } from "../middleware";

describe("App Server - websocket", () => {
  test("create websocket", async () => {
    let messageReceivedByServer: unknown | null = null;
    const sut = new AppServer(import.meta.dir);
    using server = sut
      .use(upgradeWebsocket("/chat"))
      .websocket({
        message(ws, msg) {
          ws.data.ctx;
          messageReceivedByServer = msg;
          ws.send("PONG");
        },
      })
      .listen();
    const ws = await new Promise<WebSocket>((resolve) => {
      const w = new WebSocket(`${server.url}chat`);
      w.onopen = () => {
        resolve(w);
      };
    });

    const p = new Promise<unknown>((resolve) => {
      ws.addEventListener("message", (e) => {
        resolve(e.data);
      });
    });
    ws.send("PING");
    const messageReceivedByClient = await p;
    expect(messageReceivedByServer).toBe("PING");
    expect(messageReceivedByClient).toBe("PONG");
  });
});
