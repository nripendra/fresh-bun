import { LogLevel, Logger } from "@fresh-bun/lib/logging";
import { FreshBun } from "@fresh-bun/runtime";

const rootDir = import.meta.dir;
Logger.setLogLevel(LogLevel.INFO);

const server = await FreshBun.create({
  rootDir,
}).serve();

console.log(`Started server at http://localhost:${server.port}`);
