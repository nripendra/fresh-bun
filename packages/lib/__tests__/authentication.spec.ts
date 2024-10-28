import { test, describe, expect } from "bun:test";
import { AppServer } from "../app-server";
import {
  AnonymousPrincipal,
  Authentication,
  Principal,
} from "../authentication";

describe("App Server - authentication", () => {
  test("authenticate principal", async () => {
    const sut = new AppServer(import.meta.dir);
    let principal: Principal = new AnonymousPrincipal();
    sut.use(async (ctx) => {
      const res = ctx.consumeNext();
      principal = ctx.authentication.principal;
      return res;
    });
    sut.use(async (ctx) => {
      ctx.authentication.authenticate(
        new Principal("123", {
          username: "peter",
          roles: ["facility_manager"],
        }),
      );
      return new Response("");
    });
    using server = sut.listen();
    await fetch(server.url);
    expect(principal).not.toBeInstanceOf(AnonymousPrincipal);
    expect(principal.hasClaim("username")).toBe(true);
    expect(principal.hasClaim("roles")).toBe(true);
    expect(principal.hasClaim("firsnamae")).toBe(false);
    expect(principal.getClaim<string>("firsnamae", "N/A")).toBe("N/A");
    expect(principal.getClaim<string>("username")).toBe("peter");
    expect(principal.getClaim<string[]>("roles")).toBeArrayOfSize(1);
    expect(principal.getClaim<string[]>("roles")).toContain("facility_manager");
    expect(principal.getClaim<string>("firsnamae", "N/A")).toBe("N/A");
    expect(principal.getClaim<string>("firsnamae")).toBe(null);
  });

  test("authenticate restore", async () => {
    const sut = new AppServer(import.meta.dir);
    let principal: Principal = new AnonymousPrincipal();
    let auth: Authentication | null = null;
    sut.use(async (ctx) => {
      ctx.authentication.restore(
        new Authentication(
          "TEST",
          new Principal("123", {
            username: "peter",
            roles: ["facility_manager"],
          }),
        ),
      );
      const res = ctx.consumeNext();
      principal = ctx.authentication.principal;
      return res;
    });
    sut.use(async (ctx) => {
      auth = ctx.authentication;
      principal = ctx.authentication.principal;
      return new Response("");
    });
    using server = sut.listen();
    await fetch(server.url);
    expect(auth).not.toBe(null);
    expect((auth as unknown as Authentication).authenticationType).toBe("TEST");
    expect(principal).not.toBeInstanceOf(AnonymousPrincipal);
    expect(principal.hasClaim("username")).toBe(true);
    expect(principal.hasClaim("roles")).toBe(true);
    expect(principal.getClaim<string>("username")).toBe("peter");
    expect(principal.getClaim<string[]>("roles")).toBeArrayOfSize(1);
    expect(principal.getClaim<string[]>("roles")).toContain("facility_manager");
  });

  test("authenticate clear", async () => {
    const sut = new AppServer(import.meta.dir);
    let principal: Principal = new AnonymousPrincipal();
    let auth: Authentication | null = null;
    sut.use(async (ctx) => {
      ctx.authentication.restore(
        new Authentication(
          "TEST",
          new Principal("123", {
            username: "peter",
            roles: ["facility_manager"],
          }),
        ),
      );
      const res = ctx.consumeNext();
      principal = ctx.authentication.principal;
      return res;
    });
    sut.use(async (ctx) => {
      const url = new URL(ctx.request.url);
      if (url.pathname === "/logout") {
        ctx.authentication.clear();
      }
      auth = ctx.authentication;
      principal = ctx.authentication.principal;
      return new Response("");
    });
    using server = sut.listen();
    await fetch(server.url);
    expect(auth).not.toBe(null);
    expect((auth as unknown as Authentication).authenticationType).toBe("TEST");
    expect(principal).not.toBeInstanceOf(AnonymousPrincipal);
    expect(principal.hasClaim("username")).toBe(true);
    expect(principal.hasClaim("roles")).toBe(true);
    expect(principal.getClaim<string>("username")).toBe("peter");
    expect(principal.getClaim<string[]>("roles")).toBeArrayOfSize(1);
    expect(principal.getClaim<string[]>("roles")).toContain("facility_manager");
    await fetch(`${server.url}logout`);
    expect(principal).toBeInstanceOf(AnonymousPrincipal);
  });
});
