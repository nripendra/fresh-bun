import Path from "node:path";
import type { Config } from "tailwindcss";
// import { buildClientAssets, watchClientAssets } from "./fresh-bun-build";
import { AppServer } from "../lib/app-server";
import {
  defineMiddleware,
  type Middleware,
  type MiddlewareFunction,
} from "@fresh-bun/lib/middleware";
import { serveStatic } from "@fresh-bun/routing/serve-static";
import { fileSystemRouter } from "@fresh-bun/routing/filesystem-router";
import { pageHandler } from "@fresh-bun/routing/pages";
import cp from "node:child_process";

export type FreshBunBuildConfig = {
  rootDir: string;
  clientDir: string;
  manifestDir: string;
  tailwindConfigFile: string;
  cssFiles: string[];
  islands: string[];
  clientEntryPoint: string;
};

function isDev() {
  return Bun.env.NODE_ENV === "development";
}

// async function devServer(rootDir: string) {
//   if (await Bun.file(Path.join(rootDir, ".fresh-bun", ".devserver")).exists()) {
//     const devServerInfo = await Bun.file(
//       Path.join(rootDir, ".fresh-bun", ".devserver")
//     ).json();
//     if (devServerInfo.port) {
//       try {
//         const info = await (
//           await fetch(`http://localhost:${devServerInfo.port}/info`)
//         ).json();
//         return;
//       } catch (e) {
//         console.error(e);
//       }
//     }
//   }
//   // start child. YEAH!
//   var MANFILE = import.meta.resolve("./dev-server").replace("file:///", "/");
//   var child = cp.spawn("bun", [MANFILE, rootDir], {
//     // detached: true,
//     stdio: ["inherit", "inherit", "inherit", "ipc"],
//   });
//   // await
//   await new Promise((resolve) => {
//     child.on("message", (e) => {
//       resolve({});
//     });
//   });
// }

// async function installBunPlugin(config: FreshBunBuildConfig) {
//   return new Promise(function (resolve, reject) {
//     const {
//       rootDir,
//       clientDir,
//       clientEntryPoint,
//       islands,
//       cssFiles,
//       outDir,
//       manifestDir,
//     } = config;

//     Bun.plugin({
//       name: "client-manifest",
//       async setup(builder) {
//         if (isDev()) {
//           const tailwindConfig = (
//             await import(Path.join(rootDir, "./tailwind.config"))
//           ).default as Config;

//           await buildClientAssets({
//             rootDir,
//             tailwindConfig,
//             clientDir,
//             clientEntryPoint,
//             islands,
//             cssFiles,
//             outDir,
//             manifestDir,
//           });
//         }

//         builder.module("client-manifest", async () => {
//           if (isDev()) {
//             const tailwindConfig = (
//               await import(Path.join(rootDir, "./tailwind.config"))
//             ).default as Config;
//             watchClientAssets({
//               rootDir,
//               tailwindConfig,
//               clientDir,
//               clientEntryPoint,
//               islands,
//               cssFiles,
//               outDir,
//               manifestDir,
//             });
//           }
// return {
//   contents: await Bun.file(
//     Path.resolve(manifestDir, "manifest.js")
//   ).text(),
//   loader: "js",
// };
//         });
//         resolve({});
//       },
//     });
//   });
// }

// const websocketReloaderScript = (devServer: WebSocket) =>
//   defineMiddleware(
//     async (ctx) => {
//       const response = await ctx.consumeNext();
//       const rewriter = new HTMLRewriter();

//       rewriter.on("body", {
//         element(element) {
//           element.onEndTag(async (end) => {
//             end.before(
//               `<script>
//               const ws = new WebSocket("${devServer.url}")
//               ws.addEventListener('message', (e) => {
//                   window.location.reload(true);
//               })
//             </script>`,
//               { html: true }
//             );
//           });
//         },
//       });

//       return rewriter.transform(response);
//     },
//     { name: "websocketReloaderScript" }
//   );

export class FreshBun {
  #appServer: AppServer;
  // #manifestBuilder?: Promise<unknown>;
  private constructor(public readonly config: FreshBunBuildConfig) {
    // if (isDev()) {
    //   this.#manifestBuilder = installBunPlugin(config);
    // }
    this.#appServer = new AppServer(this.config.rootDir);
  }
  #devServer: WebSocket | null = null;

  use(middleware: MiddlewareFunction, name?: string): FreshBun;
  use(middleware: Middleware): FreshBun;
  use(middleware: Middleware | MiddlewareFunction, name?: string): FreshBun {
    // @ts-ignore
    this.#appServer.use(middleware, name);
    return this;
  }

  async serve(port = 3000) {
    this.#appServer.use(serveStatic("./public"));

    if (isDev()) {
      this.#appServer.use(serveStatic(".fresh-bun/.dist"));
      //   // await this.#manifestBuilder;
      //   // await devServer(this.config.rootDir);
      //   const devServerInfo = await Bun.file(
      //     Path.join(this.config.rootDir, ".fresh-bun", ".devserver")
      //   ).json();
      //   await new Promise((resolve) => {
      //     this.#devServer = new WebSocket(
      //       `ws://localhost:${devServerInfo.port}/subscribe`
      //     );
      //     this.#devServer?.addEventListener("open", resolve);
      //     this.#appServer.use(websocketReloaderScript(this.#devServer));
      //   });
    }

    this.#appServer.use(fileSystemRouter("./routes", pageHandler()));
    try {
      return await Promise.resolve(this.#appServer.listen(port));
    } finally {
      if (isDev()) {
        if (this.#devServer) {
          console.log(this.#devServer.url);
          this.#devServer.send("Server Restart!");
          console.log("Sent message on dev-serve!");
        }
      }
    }
  }

  static create({
    rootDir,
    tailwindConfigFile,
    clientDir,
    clientEntryPoint,
    islands,
    cssFiles,
    manifestDir,
  }: Partial<FreshBunBuildConfig> & Pick<FreshBunBuildConfig, "rootDir">) {
    Bun.env.ROOT_DIR = rootDir;
    if (!tailwindConfigFile) {
      tailwindConfigFile = Path.join(rootDir, "./tailwind.config");
    }
    if (!clientDir) {
      clientDir = Path.resolve(rootDir, "./client");
    }
    if (!clientEntryPoint) {
      clientEntryPoint = `${clientDir}/index.ts`;
    }
    if (!islands) {
      islands = Array.from(
        new Bun.Glob(
          `${Path.resolve(rootDir, "./client", "./islands")}/**/*.tsx`
        ).scanSync({
          cwd: rootDir,
        })
      );
    }
    if (!cssFiles) {
      cssFiles = Array.from(
        new Bun.Glob(`./styles/**/*.css`).scanSync({
          cwd: rootDir,
        })
      );
    }

    if (!manifestDir) {
      manifestDir = Path.resolve(rootDir, "./.fresh-bun");
    }

    return new FreshBun({
      rootDir,
      tailwindConfigFile,
      clientDir,
      clientEntryPoint,
      islands,
      cssFiles,
      manifestDir,
    });
  }
}
