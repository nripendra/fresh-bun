import { defineHandler } from "@fresh-bun/routing/core";
import { definePage } from "@fresh-bun/routing/pages";
import { island } from "@fresh-bun/routing/pages/island";
import LayoutProvider from "@fresh-bun/routing/pages/layout-provider";

const Counter = island(() => import("../client/islands/counter"));

export const GET = defineHandler((ctx) => {
  return { name: "World" };
});

type IndexPageData = { name?: string };
export default definePage<IndexPageData>(({ ctx, data }) => {
  return (
    <LayoutProvider ctx={ctx}>
      <div>
        <h1>Hello {data.name}</h1>
        <div>
          <Counter />
        </div>
      </div>
    </LayoutProvider>
  );
});
