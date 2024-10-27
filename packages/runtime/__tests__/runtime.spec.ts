import { beforeEach, describe, expect, mock, test } from "bun:test";

describe("initialize runtime", () => {
  beforeEach(() => {
    Loader.registry.clear();
  });
  test("initialize runtime", async () => {
    const { FreshBun } = await import("..");
    using server = await FreshBun.create({ rootDir: import.meta.dir }).serve(0);
    const response = await fetch(`${server.url}`);
    const body = await response.text();
    expect(body).toBe("<h1>Hello world</h1>");
  });

  test("initialize runtime with plugin", async () => {
    mock.module("node:util", () => {
      return {
        parseArgs() {
          return {
            values: {
              plugin: `${import.meta.dir}/plugin.ts`,
            },
          };
        },
      };
    });

    const { Logs } = await import("./plugin.ts");
    const { FreshBun } = await import("..");

    using server = await FreshBun.create({ rootDir: import.meta.dir }).serve(0);
    const response = await fetch(`${server.url}`);
    const body = await response.text();
    expect(body).toBe("<h1>Hello world</h1>");
    expect(Logs).toContain("beforeServerStart");
    expect(Logs).toContain("afterServerStart");
  });
});

describe("Freshbun runtime - websocket", () => {
  beforeEach(() => {
    Loader.registry.clear();
  });
  test("create websocket", async () => {
    const { upgradeWebsocket } = await import("@fresh-bun/lib/middleware");
    const { FreshBun } = await import("..");
    let messageReceivedByServer: unknown | null = null;

    using server = await FreshBun.create({ rootDir: import.meta.dir })
      .use(upgradeWebsocket("/chat"))
      .websocket({
        message(ws, msg) {
          ws.data.ctx;
          messageReceivedByServer = msg;
          ws.send("PONG");
        },
      })
      .serve();
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
