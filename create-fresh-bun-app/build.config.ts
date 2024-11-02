import tailwindConfig from "./tailwind.config";

const build = {
  rootDir: import.meta.dir,
  serverEntryPoint: "index.ts",
  build: {
    distFolder: "./dist",
    minify: false,
    tailwindConfig,
  },
};
export default build;
