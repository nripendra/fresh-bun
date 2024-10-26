import Path from "node:path";

export class Convention {
  constructor(
    public name: string,
    public readonly path: string,
  ) {}
  resolve(rootDir: string) {
    return Path.resolve(rootDir, this.path);
  }
}
