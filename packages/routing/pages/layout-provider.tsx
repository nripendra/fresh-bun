// @jsxImportSource preact
import type { RequestContext } from "@fresh-bun/lib/request-context";
import { Suspense, lazy } from "preact/compat";
import type { JSX } from "preact/jsx-runtime";
import { isHyperMediaAjaxRequest } from "./hyper-media-helper";

export interface LayoutProps {
  ctx: RequestContext;
  hyperMediaBehavior?: "NoLayout" | "Layout";
  /**
   * A handler can specify the layout it wants to use. By default _layout.tsx is used if layout is not speficied, or set to "default".
   * Set layout to null if you want to supress the layout
   */
  layout?:
    | (() => Promise<{ default: (props: LayoutProps) => JSX.Element }>)
    | "default"
    | null;
  /**
   * Page specific head elements like title, meta tags etc.
   */
  head?: JSX.Element;
  children: JSX.Element;
}

export default function LayoutProvider(props: LayoutProps) {
  if (props.layout !== null) {
    if (isHyperMediaAjaxRequest(props.ctx)) {
      if (props.hyperMediaBehavior === "NoLayout") {
        props.layout = null;
      }
    }

    const Page = lazy(async () => {
      let module: {
        default: (props: LayoutProps) => JSX.Element;
      } | null = null;

      console.log(props.layout);
      if (props.layout === undefined || props.layout === "default") {
        const convention = props.ctx.appContext.conventions.find(
          (x) => x.name === "layoutFile",
        );

        const defaultLayoutPath = convention?.resolve(
          props.ctx.appContext.rootDir,
        );

        try {
          module = await import(defaultLayoutPath ?? "");
        } catch (e) {
          console.log(e);
        }
      }
      if (props.layout instanceof Function) {
        try {
          module = await props.layout();
          console.log("Layout module", module);
        } catch (e) {
          console.log(e);
        }
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
    return (
      <Suspense fallback={null}>
        <Page />
      </Suspense>
    );
  }
  return props.children;
}

export function defineLayout<T extends LayoutProps>(
  factory: (props: T) => JSX.Element,
  config: { hypermediaBehaviour?: "NoLayout" | "Layout"; name?: string } = {
    hypermediaBehaviour: "NoLayout",
    name: "",
  },
) {
  return (props: T) => {
    if (isHyperMediaAjaxRequest(props.ctx)) {
      if ((config?.hypermediaBehaviour ?? "NoLayout") === "NoLayout") {
        return <>{props.children}</>;
      }
    }
    return factory(props);
  };
}
