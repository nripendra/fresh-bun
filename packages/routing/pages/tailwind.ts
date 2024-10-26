import Path from "node:path";
import autoprefixer from "autoprefixer";
import { type BunPlugin, plugin } from "bun";
import postcss from "postcss";
import minify from "postcss-minify";
import tailwindcss from "tailwindcss";

type TailwindPluginConfig = {
  tailwindConfigPath: string;
  projectRoot: string;
};
export default function ({
  tailwindConfigPath,
  projectRoot,
}: TailwindPluginConfig) {
  return {
    name: "Tailwind loader",
    async setup(build) {
      const tailwindConfig = (await import(tailwindConfigPath)).default;
      const tailwindConfigClone = { ...tailwindConfig };

      tailwindConfigClone.content = [
        Path.join(projectRoot, "src", "**/*.{js,jsx,ts,tsx}"),
      ];
      build.onLoad(
        { filter: /\.css$/ },
        async ({ path, loader, namespace }) => {
          let file = await Bun.file(path).text();
          const hash = Bun.hash(file);

          const fileName = Path.basename(path).replace(".css", `-${hash}.css`);
          if (await Bun.file(`${projectRoot}/public/${fileName}`).exists()) {
            return {
              exports: {
                default: await Bun.file(
                  `${projectRoot}/public/${fileName}`,
                ).text(),
              },
              loader: "object",
            };
          }
          // read and compile it with the Svelte compiler

          if (file.includes("@tailwind base;")) {
            const result = await postcss([
              tailwindcss({ ...tailwindConfigClone }),
              autoprefixer,
              minify,
            ]).process(file, { from: undefined });
            file = result.content;
          }

          await Bun.write(`${projectRoot}/public/${fileName}`, file);
          // and return the compiled source code as "js"
          return {
            exports: {
              default: file,
            },
            loader: "object",
          };
        },
      );
    },
  } satisfies BunPlugin;
}
