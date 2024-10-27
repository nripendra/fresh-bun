import type { AppServer } from "@fresh-bun/lib";

export const Logs: string[] = [];

export default {
  async beforeServerStart(appServer: AppServer, rootDir: string) {
    Logs.push("beforeServerStart");
  },
  async afterServerStart(appServer: AppServer, rootDir: string) {
    Logs.push("afterServerStart");
  },
};
