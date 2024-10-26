import Path from "node:path";
import manifest from "client-manifest";
import type {
  Component,
  ComponentChild,
  ComponentChildren,
  ComponentProps,
  ComponentType,
} from "preact";
import { Suspense, lazy } from "preact/compat";

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      // biome-ignore lint: no-check
      "island-marker": any;
      // biome-ignore lint: no-check
      "island-marker-slot": any;
      // biome-ignore lint: no-check
      "island-holder": any;
    }
  }
}

function extractModulePath(importStr: string): string {
  const match = importStr.match(/import\(['"](.*)['"]\)/);
  return match ? match[1] : "";
}

export function island<
  T extends ComponentType<{ children: ComponentChildren }>,
>(importFn: () => Promise<{ default: T }>): T {
  const modulePath = Path.join("/", extractModulePath(importFn.toString()));
  const ActualComponent = lazy(importFn) as ComponentType<{
    children: ComponentChildren;
  }>;

  return ((props: ComponentProps<T>) => {
    const id = crypto.randomUUID();
    const { children, ...rest } = props;
    const vnode = (
      <Suspense fallback={null}>
        <island-holder>
          <island-marker
            data-island={id}
            data-module={manifest[`public://${modulePath}`]}
            data-props={JSON.stringify({ ...rest })}
          >
            <ActualComponent {...rest}>
              <island-marker-slot>{children}</island-marker-slot>
            </ActualComponent>
          </island-marker>
        </island-holder>
      </Suspense>
    );
    return vnode;
  }) as unknown as T;
}
