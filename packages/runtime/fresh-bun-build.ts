// import Path from "node:path";
// import Fs from "node:fs";
// import type { Config } from "tailwindcss";
// import type { BunPlugin } from "bun";

// const tailwindplugin = (tailwindConfig: Config) =>
//   ({
//     name: "tailwind-css-transformer",
//     setup(builder) {
//       builder.onLoad({ filter: /\.css$/ }, async (args) => {
//         const postcss = (await import("postcss")).default;
//         const tailwindcss = (await import("tailwindcss")).default;
//         const autoprefixer = (await import("autoprefixer")).default;
//         const minify = (await import("postcss-minify")).default;
//         const cssnano = (await import("cssnano")).default;

//         const css = await Bun.file(args.path).text();
//         const plugins = [tailwindcss({ ...tailwindConfig }), autoprefixer];
//         if (
//           Bun.env.MINIFY === "true" ||
//           Bun.env.NODE_ENV === "production" ||
//           Bun.env.NODE_ENV === undefined
//         ) {
//           // @ts-ignore
//           plugins.push(cssnano);
//           plugins.push(minify);
//         }
//         const result = await postcss(plugins).process(css, {
//           from: args.path,
//         });
//         // let file = await Bun.file(args.path).text();
//         // if (file.includes("@tailwind base;")) {
//         //   const result = await postcss([
//         //     tailwindcss({ ...tailwindConfigClone }),
//         //     autoprefixer,
//         //     minify,
//         //   ]).process(file);
//         //   file = result.content;
//         // }

//         return {
//           contents: result.css,
//           loader: "text",
//         };
//       });
//     },
//   } satisfies BunPlugin);

// type BuildCssConfig = {
//   tailwindConfig: Config;
//   rootDir: string;
//   outDir: string;
//   cssFiles: string[];
//   manifest: Map<string, string>;
// };

// export async function buildCss({
//   tailwindConfig,
//   rootDir,
//   outDir,
//   cssFiles,
//   manifest,
// }: BuildCssConfig) {
//   const tailwindConfigClone = { ...tailwindConfig };
//   tailwindConfigClone.content = [Path.join(rootDir, "**/*.{js,jsx,ts,tsx}")];

//   const cssResult = await Bun.build({
//     entrypoints: [...cssFiles],
//     naming: "[dir]/[name]-[hash].[ext]",
//     experimentalCss: true,
//     plugins: [tailwindplugin(tailwindConfig)],
//     minify: true,
//   });

//   const entryPointCssOutputs = cssResult.outputs.filter(
//     (it) => it.kind === "entry-point"
//   );

//   for (let i = 0; i < cssFiles.length; i++) {
//     if (manifest.has("file://" + Path.resolve(rootDir, cssFiles[i]))) {
//       Fs.unlinkSync(
//         manifest.get("file://" + Path.resolve(rootDir, cssFiles[i]))!
//       );
//     }
//     const out = entryPointCssOutputs[i];

//     manifest.set(
//       "file://" + Path.resolve(rootDir, cssFiles[i]),
//       Path.resolve(outDir, out.path)
//     );

//     await Bun.write(
//       Path.resolve(outDir, entryPointCssOutputs[i].path),
//       await entryPointCssOutputs[i].text()
//     );
//   }
// }

// type BuildJsConfig = {
//   manifest: Map<string, string>;
//   rootDir: string;
//   clientDir: string;
//   outDir: string;
//   clientEntryPoint: string;
//   islands: string[];
// };
// export async function buildClientJs({
//   manifest,
//   rootDir,
//   clientDir,
//   outDir,
//   clientEntryPoint,
//   islands,
// }: BuildJsConfig) {
//   const styles = Array.from(
//     manifest.keys().filter((it) => it.endsWith(".css"))
//   ).map((it) => manifest.get(it));

//   Array.from(new Bun.Glob(`${outDir}/**/*.js`).scanSync()).forEach((it) => {
//     if (!styles.includes(it)) {
//       Fs.unlinkSync(it);
//     }
//   });
//   const result = await Bun.build({
//     entrypoints: [clientEntryPoint, ...islands],
//     naming: "[dir]/[name]-[hash].[ext]",
//     splitting: true,
//     minify: true,
//   });

//   for (const out of result.outputs) {
//     if (out.kind == "entry-point") {
//       const path = Path.parse(out.path);
//       path.base = path.name.replace(`-${out.hash}`, "");
//       // mapping for island.
//       manifest.set(
//         Path.resolve("/", "./client", Path.format(path)),
//         Path.resolve("/", out.path)
//       );
//       // mapping for script tag with src.
//       manifest.set(
//         "public://" + Path.resolve(rootDir, clientDir, Path.format(path)),
//         Path.resolve("/", out.path)
//       );
//       // mapping for script tag with inlined script.
//       manifest.set(
//         "file://" + Path.resolve(rootDir, clientDir, Path.format(path)),
//         Path.resolve(outDir, out.path)
//       );
//     }
//     await Bun.write(Path.resolve(outDir, out.path), await out.text());
//   }
// }

// export async function writeManifest(
//   manifestDir: string,
//   manifest: Map<string, string>
// ) {
//   await Bun.write(
//     Path.resolve(manifestDir, "manifest.js"),
//     "export default " + JSON.stringify(Object.fromEntries(manifest))
//   );
// }

// export async function buildClientAssets({
//   tailwindConfig,
//   rootDir,
//   cssFiles,
//   islands,
//   clientEntryPoint,
//   clientDir,
//   outDir,
//   manifestDir,
// }: {
//   tailwindConfig: Config;
//   rootDir: string;
//   cssFiles: string[];
//   islands: string[];
//   clientDir: string;
//   clientEntryPoint: string;
//   outDir: string;
//   manifestDir: string;
// }) {
//   const manifest = new Map<string, string>();
//   manifest.set("outDir", outDir);

//   // await buildCss(cssFiles, manifest, outDir);
//   await buildCss({
//     tailwindConfig,
//     rootDir,
//     outDir,
//     cssFiles,
//     manifest,
//   });

//   ////////////

//   await buildClientJs({
//     clientEntryPoint,
//     islands,
//     manifest,
//     clientDir,
//     outDir,
//     rootDir,
//   });

//   await writeManifest(manifestDir, manifest);
//   return { manifest };
// }

// export function watchClientAssets({
//   tailwindConfig,
//   rootDir,
//   cssFiles,
//   islands,
//   clientEntryPoint,
//   clientDir,
//   outDir,
//   manifestDir,
// }: {
//   tailwindConfig: Config;
//   rootDir: string;
//   cssFiles: string[];
//   islands: string[];
//   clientDir: string;
//   clientEntryPoint: string;
//   outDir: string;
//   manifestDir: string;
// }) {
//   for (const file of [...cssFiles, clientEntryPoint, ...islands]) {
//     Fs.watch(Path.resolve(rootDir, file), async (e, f) => {
//       if (f) {
//         const manifest = new Map<string, string>(
//           Object.entries(
//             (await import(Path.resolve(manifestDir, "manifest.js"))).default
//           )
//         );

//         if (Path.extname(f) == ".css") {
//           await buildCss({
//             tailwindConfig,
//             rootDir,
//             outDir,
//             cssFiles,
//             manifest,
//           });
//           await writeManifest(manifestDir, manifest);
//           clearManifestRegistry();
//         } else {
//           await buildClientJs({
//             rootDir,
//             clientEntryPoint,
//             islands,
//             manifest,
//             clientDir,
//             outDir,
//           });
//           await writeManifest(manifestDir, manifest);
//           clearManifestRegistry();
//           Loader.registry
//             .keys()
//             .filter((it) => it.includes("client-helper"))
//             .forEach((it) => {
//               Loader.registry.delete(it);
//             });
//         }
//       }
//     });
//   }
// }

// function clearManifestRegistry() {
//   Loader.registry
//     .keys()
//     .filter((it) => it.includes("_layout"))
//     .forEach((it) => {
//       Loader.registry.delete(it);
//     });
//   Loader.registry.delete("client-manifest");
// }
