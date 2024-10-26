import manifest from "client-manifest";
import Path from "node:path";
import { lazy } from "preact/compat";

export function createStyle(path: string) {
  return lazy(async () => {
    const rootDir = Bun.env.ROOT_DIR!
    const key = path.replace('file://', '').replace(rootDir, '');
    const css = await Bun.file(Path.join(rootDir, manifest[key])).text()
    const style = () => (
      <style type={"text/css"} dangerouslySetInnerHTML={{ __html: css }} />
    );
    return { default: style };
  });
}

export function createScript(path: string) {
  return lazy(async () => {
    const rootDir = Bun.env.ROOT_DIR!
    const key = path.replace('file://', '').replace(rootDir, '');
    const parsed = Path.parse(path);
    parsed.base = parsed.name;
    
    const js = await Bun.file(Path.join(rootDir, manifest[key])).text();
    const script = () => (
      <script type="module" dangerouslySetInnerHTML={{ __html: js }} />
    );
    return { default: script };
  });
}
