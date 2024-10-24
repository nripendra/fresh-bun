// import type { Conventions } from "./conventions";
import type { Convention } from "./convention";
import type { Middleware, MiddlewareFunction } from "./middleware";

export class AppContext {
  constructor(
    public readonly rootDir: string,
    public readonly staticFolders: string[],
    public readonly middlewares: Middleware[],
    public readonly conventions: Convention[],
    public errorHandler?: Middleware,
    public readonly port: number = 3000
  ) {}
}
