import Path from "node:path";
import type { FreshBunBuildConfig } from "./build-config";
import { parseArgs } from "util";
import { plugin } from "bun";

console.log("........Preload......");
Bun.plugin({
  name: "client-manifest",
  async setup(builder) {
    console.log("........Setup......");
    builder.module("client-manifest", async () => {
      console.log("Resolving");
      return {
        contents: await Bun.file(
          Path.resolve(".fresh-bun", "manifest.js")
        ).text(),
        loader: "js",
      };
    });
  },
});

export async function buildBrowserArtifactsAndManifest(
  config: FreshBunBuildConfig
) {
  const { rootDir } = config;
  const { minify } = config.build;
  const distFolder = Path.join(".fresh-bun", ".dist");
  const clientFiles = Array.from(
    new Bun.Glob(Path.join(rootDir, "./client/**/*.{ts,tsx}")).scanSync()
  );
  const cssFiles = Array.from(
    new Bun.Glob(Path.join(rootDir, `./styles/**/*.css`)).scanSync()
  );

  await Bun.$`mkdir -p ${distFolder}`;

  const tailwindBuild = async (args: { path: string }) => {
    const css = await Bun.file(args.path).text();

    const postcss = (await import("postcss")).default;
    const tailwindcss = (await import("tailwindcss")).default;
    const autoprefixer = (await import("autoprefixer")).default;
    // const minify = (await import("postcss-minify")).default;
    const cssnano = (await import("cssnano")).default;

    const plugins = [autoprefixer];
    if (css.includes("@tailwind")) {
      const tailwindConfigClone = { ...config.build.tailwindConfig };
      // This will need to change to support different types of configs supported by tailwind.
      // @ts-ignore
      tailwindConfigClone.content = tailwindConfigClone.content.map((it) =>
        Path.join(rootDir, it)
      );

      // @ts-ignore
      plugins.push(tailwindcss(tailwindConfigClone));
    }
    if (
      minify ||
      Bun.env.NODE_ENV === "production" ||
      Bun.env.NODE_ENV === undefined
    ) {
      // @ts-ignore
      plugins.push(cssnano);
      // plugins.push(minify);
    }
    const result = await postcss(plugins).process(css, {
      from: args.path,
    });
    return result.css;
  };

  function getHash(content: string, hashLength: number) {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(content);
    return hasher.digest("hex").slice(0, hashLength);
  }

  function hashedFilename(path: string, hash: string) {
    const parsed = Path.parse(path);
    return `${parsed.name}-${hash}${parsed.ext}`;
  }

  const manifest = {} as any;

  for (const file of cssFiles) {
    const css = await tailwindBuild({ path: file });
    const hash = getHash(css, 8);
    const filePath = import.meta
      .resolve(file)
      .replace("file://", "")
      .replace(rootDir, "");
    const filename = hashedFilename(filePath, hash);
    const parsed = Path.parse(filePath);
    parsed.base = filename;

    await Bun.write(Path.join(distFolder, `${Path.format(parsed)}`), css);
    manifest[filePath] = Path.join(distFolder, `${Path.format(parsed)}`);
  }

  // build client files for browser
  const result = await Bun.build({
    entrypoints: [...clientFiles],
    format: "esm",
    target: "browser",
    naming: "[dir]/[name]-[hash].[ext]",
    splitting: true,
    minify,
    outdir: `${distFolder}`,
  });

  const distPublic = import.meta
    .resolve(Path.join(rootDir, distFolder))
    .replace("file://", "");

  const outputFiles = result.outputs
    .filter((it) => it.kind === "entry-point")
    .map((it) => it.path.replace(distPublic, ""));

  let i = 0;
  for (const file of clientFiles) {
    const filePath = import.meta
      .resolve(file)
      .replace("file://", "")
      .replace(rootDir, "");
    const parsed = Path.parse(filePath);
    parsed.base = parsed.name;
    manifest[filePath] = Path.join(distFolder, outputFiles[i]);
    manifest[Path.format(parsed)] = Path.join(distFolder, outputFiles[i]);
    manifest["public://" + Path.format(parsed)] = outputFiles[i];
    manifest["public://" + Path.format(parsed) + ".js"] = outputFiles[i];
    manifest["public://" + filePath] = outputFiles[i];
    i++;
  }

  await Bun.write(
    Path.join(rootDir, ".fresh-bun", "/manifest.js"),
    `const manifest = ${JSON.stringify(
      manifest,
      null,
      4
    )};export default manifest;`
  );
}

const { positionals } = parseArgs({
  args: Bun.argv,
  strict: true,
  options: {
    plugin: {
      type: "string",
    },
  },
  allowPositionals: true,
});

const args = positionals.slice(1);

// assumit arg[0] will be entry point. Need to throughly test the assumption.
const config = (
  await import(
    Path.join(Path.resolve(Path.dirname(args[0])), "build.config.ts")
  )
).default;

await buildBrowserArtifactsAndManifest(config);

// Probably issue with typescript, as it doesn't understand `with { type: "text"}`,
// it expects a default export from this module.
export default "";

// ////
// async function devServer(rootDir: string) {
//   if (
//     await Bun.file(Path.join(rootDir, ".fresh-bun", ".devserver")).exists()
//   ) {
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
////
