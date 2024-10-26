import type { RequestContext } from "@fresh-bun/lib/request-context";
import { type ComponentType, lazy } from "preact/compat";
import type { JSX } from "preact/jsx-runtime";
import { isHyperMediaAjaxRequest } from "./hyper-media-helper";

export const Config = {
  defaultHyperMediaBehavior: "NoLayout" as "NoLayout" | "Layout",
};
export interface LayoutProps<T = unknown> {
  ctx: RequestContext;
  hyperMediaBehavior?: "NoLayout" | "Layout";
  /**
   * A handler can specify the layout it wants to use. By default _layout.tsx is used if layout is not speficied, or set to "default".
   * Set layout to null if you want to supress the layout
   */
  layout?: T | "default" | null;
  /**
   * Page specific head elements like title, meta tags etc.
   */
  head?: JSX.Element;
  children: JSX.Element;
}

export default function LayoutProvider<T>(props: LayoutProps<T>) {
  if (props.layout !== null) {
    if (props.layout === undefined) {
      if (isHyperMediaAjaxRequest(props.ctx)) {
        props.hyperMediaBehavior =
          props.hyperMediaBehavior ?? Config.defaultHyperMediaBehavior;
        if (props.hyperMediaBehavior === "NoLayout") {
          props.layout = null;
        }
      }
    }
    if (props.layout === undefined || props.layout === "default") {
      const convention = props.ctx.appContext.conventions.find(
        (x) => x.name === "layoutFile",
      );

      const defaultLayoutPath = convention?.resolve(
        props.ctx.appContext.rootDir,
      );
      if (!defaultLayoutPath) {
        throw new Error(
          "Incomplete Setup, defaultLayoutFile for pages handler",
        );
      }
      const Page = lazy(async () => {
        let module: {
          default: (props: LayoutProps<unknown>) => JSX.Element;
        } | null = null;
        try {
          module = await import(defaultLayoutPath);
        } catch (e) {
          console.log(e);
        }
        if (module) {
          const LayoutNode = module.default;
          return {
            default: () => <LayoutNode {...props}>{props.children}</LayoutNode>,
          };
        }
        return {
          default: () => <>{props.children}</>,
        };
      });
      return <Page />;
    }
    const LayoutNode = (props as { layout: ComponentType }).layout;
    if (LayoutNode == null) {
      return <>{props.children}</>;
    }
    return <LayoutNode {...props}>{props.children}</LayoutNode>;
  }
  return props.children;
}

export function defineLayout<T extends LayoutProps>(
  factory: (props: T) => JSX.Element,
) {
  return factory;
}
