// import type { Conventions } from "./conventions";
import type { Convention } from "./convention";
import type { Middleware } from "./middleware";

export class AppContext {
  constructor(
    public readonly rootDir: string,
    public readonly staticFolders: string[],
    public readonly middlewares: Middleware[],
    public readonly conventions: Convention[],
    public errorHandler?: Middleware,
    private _port = 3000,
  ) {}

  get port() {
    return this._port;
  }
  __setPort(port: number) {
    this._port = port;
  }
}
