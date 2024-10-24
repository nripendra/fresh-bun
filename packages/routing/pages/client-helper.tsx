import manifest from "client-manifest";
import Path from "node:path";
import { lazy } from "preact/compat";

export function createStyle(path: string) {
  return lazy(async () => {
    const css = (await import(manifest[path])).default;
    const style = () => (
      <style type={"text/css"} dangerouslySetInnerHTML={{ __html: css }} />
    );
    return { default: style };
  });
}

export function createScript(path: string) {
  return lazy(async () => {
    const parsed = Path.parse(path);
    parsed.base = parsed.name;
    const js = await Bun.file(manifest[Path.format(parsed)]).text();
    const script = () => (
      <script type="module" dangerouslySetInnerHTML={{ __html: js }} />
    );
    return { default: script };
  });
}
