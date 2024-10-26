import Path from "node:path";
import { type ComponentProps, type ComponentType } from "preact";
import { lazy, Suspense } from "preact/compat";
import manifest from "client-manifest";

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      "island-marker": any;
      "island-marker-slot": any;
      "island-holder": any;
    }
  }
}

function extractModulePath(importStr: string): string {
  const match = importStr.match(/import\(['"](.*)['"]\)/);
  return match ? match[1] : "";
}

export function island<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): T {
  const modulePath = Path.join("/", extractModulePath(importFn.toString()));
  const ActualComponent = lazy(importFn) as any;

  return ((props: ComponentProps<T>) => {
    const id = crypto.randomUUID();
    const { children, ...rest } = props;
    const vnode = (
      <Suspense fallback={null}>
        <island-holder>
          <island-marker
            data-island={id}
            data-module={manifest['public://' + modulePath]}
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
