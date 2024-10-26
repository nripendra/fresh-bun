import { defineHandler } from "@fresh-bun/routing/core";
import { type PageProps, definePage } from "@fresh-bun/routing/pages";
import { island } from "@fresh-bun/routing/pages/island";
import LayoutProvider from "@fresh-bun/routing/pages/layout-provider";
import { type FlashData, getFlash } from "@fresh-bun/session";

const Counter = island(() => import("../client/islands/counter"));
const Flash = island(() => import("../client/islands/Flash"));

export const GET = defineHandler((ctx) => {
  const flash = getFlash(ctx);
  return { flash };
});

type IndexPageData = { flash?: FlashData<string> };
export default definePage<IndexPageData>(({ ctx, data }) => {
  const flash = data?.flash;

  return (
    <LayoutProvider ctx={ctx}>
      <div>
        {!flash ? null : (
          <Flash
            type={flash?.type ?? "info"}
            position="bottom"
            targetSelector="#navbar"
            offsetY={-10}
            timeout={2000}
          >
            <div className={"flex items-start gap-3"}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 shrink-0 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <title>Success</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className={"flex-1"}>{flash?.content}</div>
            </div>
          </Flash>
        )}
        <div class={"pb-10"}>
          <h1>HELLO</h1>
          <Counter>
            <div />
          </Counter>
        </div>
        <div class={"pb-10"}>
          <h1>HELLO</h1>
          <Counter>
            <div />
          </Counter>
        </div>
        <div class={"pb-10"}>
          <h1>HELLO</h1>
          <Counter>
            <div />
          </Counter>
        </div>
        <div class={"pb-10"}>
          <h1>HELLO</h1>
          <Counter>
            <div />
          </Counter>
        </div>
        <div class={"pb-10"}>
          <h1>HELLO</h1>
          <Counter>
            <div />
          </Counter>
        </div>
        <div class={"pb-10"}>
          <h1>HELLO</h1>
          <Counter>
            <div />
          </Counter>
        </div>
        <div class={"pb-10"}>
          <h1>HELLO</h1>
          <Counter>
            <div />
          </Counter>
        </div>
        <div class={"pb-10"}>
          <h1>HELLO</h1>
          <Counter>
            <div />
          </Counter>
        </div>
        <div class={"pb-10"}>
          <h1>HELLO</h1>
          <Counter>
            <div />
          </Counter>
        </div>
      </div>
    </LayoutProvider>
  );
});
