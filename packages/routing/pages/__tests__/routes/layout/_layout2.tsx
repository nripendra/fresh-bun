// @jsxImportSource preact
import LayoutProvider, { defineLayout } from "../../../layout-provider";

export default defineLayout(
  ({ ctx, children }) => {
    return (
      <LayoutProvider ctx={ctx}>
        <div>
          <h1>Header</h1>
          {children}
          <footer>Footer</footer>
        </div>
      </LayoutProvider>
    );
  },
  { hypermediaBehaviour: "Layout" },
);
