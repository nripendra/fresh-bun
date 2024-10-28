import { describe, expect, test } from "bun:test";
import { AppServer } from "@fresh-bun/lib";
import { pageHandler } from "..";
import { fileSystemRouter } from "../../filesystem-router";

describe("pages-handler", () => {
  test("serves the default exported simple function", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}`);

    expect(await response.text()).toBe("<h1>Hello world</h1>");
  });

  test("serves the page defined using the definePage helper function", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}defined-page`);

    expect(await response.text()).toBe("<h1>Welcome to defined page</h1>");
  });

  test("GET handler defined as a simple function gets executed for GET request", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(
      `${server.url}simple-get-handler?query=from%20test`,
    );

    expect(await response.text()).toBe("<h1>Hello from test</h1>");
  });

  test("GET handler defined using the defineHandler helper gets executed for GET request", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(
      `${server.url}defined-get-handler?query=defined+get`,
    );

    expect(await response.text()).toBe("<h1>Hello defined get</h1>");
  });

  test("POST handler defined as a simple function gets executed for POST request", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const form = new FormData();
    form.append("who", "simple post test");
    const response = await fetch(`${server.url}simple-post-handler`, {
      method: "POST",
      body: form,
    });

    expect(await response.text()).toBe("<h1>Hello simple post test</h1>");
  });

  test("POST handler defined using defineHandler gets executed for POST request", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const form = new FormData();
    form.append("who", "defined post test");
    const response = await fetch(`${server.url}defined-post-handler`, {
      method: "POST",
      body: form,
    });

    expect(await response.text()).toBe("<h1>Hello defined post test</h1>");
  });

  test("Folder guard gets executed", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}guarded`);

    expect(await response.text()).toBe("<h1>Hello world</h1>");
    expect(response.headers.has("X-GUARDED")).toBe(true);
  });

  test("Module guard gets executed", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}guarded/module-guarded`);

    expect(await response.text()).toBe("<h1>Hello world</h1>");
    expect(response.headers.has("X-GUARDED")).toBe(true);
    expect(response.headers.has("X-MODULE-GUARD")).toBe(true);
  });

  test("Page guard gets executed", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}guarded/page-guarded`);

    expect(await response.text()).toBe("<h1>Hello world</h1>");
    expect(response.headers.has("X-GUARDED")).toBe(true);
    expect(response.headers.has("X-MODULE-GUARD")).toBe(true);
    expect(response.headers.has("X-PAGE-GUARD")).toBe(true);
  });

  test("GET handler guard gets executed", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}guarded/get-handler-guarded`);

    expect(await response.text()).toBe("<h1>Hello test</h1>");
    expect(response.headers.has("X-GUARDED")).toBe(true);
    expect(response.headers.has("X-MODULE-GUARD")).toBe(true);
    expect(response.headers.has("X-PAGE-GUARD")).toBe(true);
    expect(response.headers.has("X-GET-GUARD")).toBe(true);
  });

  test("_error page gets rendered when error is thrown", async () => {
    const app = new AppServer(import.meta.dir);
    using server = app
      .use(fileSystemRouter("./routes", pageHandler()))
      .listen(0);
    const response = await fetch(`${server.url}error`);

    expect(await response.text()).toBe(
      "<h1>Error Page: GET method not allowed</h1>",
    );

    const responsePost = await fetch(`${server.url}error`, { method: "POST" });
    expect(await responsePost.text()).toBe("<h1>Hello world</h1>");
  });
});
