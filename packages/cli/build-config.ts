import type { Config } from "tailwindcss";

export type FreshBunBuildConfig = {
  rootDir: string;
  serverEntryPoint: string;
  build: {
    distFolder: string;
    minify: boolean;
    tailwindConfig: Config;
  };
};
