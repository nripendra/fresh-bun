#!/usr/bin/env bun

import type { BunPlugin } from "bun";
import Path from "node:path";
import { parseArgs } from "util";
import preloadCode from "./dev-preload" with { type: "text"}
import type { FreshBunBuildConfig } from "./build-config";

// const freshBunConfig = {
//   rootDir: import.meta.dir,
//   serverEntryPoint: "index.ts",
//   build: {
//     distFolder: "./dist",
//     minify: false,
//     tailwindConfig: (await import("./tailwind.config")).default,
//   },
// };


export async function build(config: FreshBunBuildConfig) {
  const { rootDir } = config;
  const { distFolder, minify } = config.build;
  const routes = Array.from(
    new Bun.Glob(Path.join(rootDir, `./routes/**/*.{ts,tsx}`)).scanSync()
  );
  const clientFiles = Array.from(
    new Bun.Glob(Path.join(rootDir, "./client/**/*.{ts,tsx}")).scanSync()
  );
  const cssFiles = Array.from(
    new Bun.Glob(Path.join(rootDir, `./styles/**/*.css`)).scanSync()
  );

  const manifestPlugin: BunPlugin = {
    name: "client-manifest",
    async setup(builder) {
      builder.onResolve({ filter: /client-manifest/ }, (args) => {
        return {
          path: Path.resolve(distFolder, "manifest.js"),
        };
      });
    },
  };

  await Bun.$`rm -rf ${distFolder}`;
  await Bun.$`mkdir ${distFolder}`;
  await Bun.$`cp -r public ${distFolder}`;

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

    await Bun.write(
      Path.join(rootDir, distFolder, `public/${Path.format(parsed)}`),
      css
    );
    manifest[filePath] = Path.join("./public", `${Path.format(parsed)}`);
  }

  // build client files for browser
  const result = await Bun.build({
    entrypoints: [...clientFiles],
    format: "esm",
    target: "browser",
    naming: "[dir]/[name]-[hash].[ext]",
    splitting: true,
    minify,
    outdir: `${distFolder}/public`,
  });

  const distPublic = import.meta
    .resolve(Path.join(rootDir, distFolder, "public"))
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
    manifest[filePath] = Path.join("public", outputFiles[i]);
    manifest[Path.format(parsed)] = Path.join("public", outputFiles[i]);
    manifest["public://" + Path.format(parsed)] = outputFiles[i];
    manifest["public://" + Path.format(parsed) + ".js"] = outputFiles[i];
    manifest["public://" + filePath] = outputFiles[i];
    i++;
  }

  await Bun.write(
    Path.join(rootDir, distFolder, "/manifest.js"),
    `const manifest = ${JSON.stringify(
      manifest,
      null,
      4
    )};export default manifest;`
  );

  // build for server
  await Bun.build({
    entrypoints: [
      Path.join(rootDir, config.serverEntryPoint),
      ...routes,
      ...clientFiles,
    ],
    format: "esm",
    target: "bun",
    minify,
    splitting: true,
    plugins: [manifestPlugin],
    naming: "[dir]/[name].[ext]",
    // additional config
    outdir: distFolder,
  });
}

export async function dev(config: FreshBunBuildConfig) {
  const { rootDir } = config;

  const entryPoint = Path.join(rootDir, config.serverEntryPoint);

  const preloadDestFilePath = Path.join(
    rootDir,
    ".fresh-bun",
    "dev-preload.ts"
  );

  await Bun.write(preloadDestFilePath, preloadCode);

  await Bun.$`NODE_ENV=development bun --preload ${preloadDestFilePath} --watch ${entryPoint} -- --plugin .fresh-bun/plugin.ts`;
}

const { positionals } = parseArgs({
  args: Bun.argv,
  strict: true,
  allowPositionals: true,
});

const args = positionals.slice(2);

if (args[0] === "build") {
  const config = (
    await import(Path.join(Path.resolve(args[1]), "build.config.ts"))
  ).default;
  await build(config);
}

if (args[0] === "dev") {
  const config = (
    await import(Path.join(Path.resolve(args[1]), "build.config.ts"))
  ).default;
  await dev(config);
}
