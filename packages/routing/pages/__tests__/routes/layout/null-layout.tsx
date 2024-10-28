// @jsxImportSource preact
import { definePage } from "../../..";
import LayoutProvider from "../../../layout-provider";

export default definePage(({ ctx }) => {
  return (
    <LayoutProvider ctx={ctx} layout={null}>
      <h1>Hello world</h1>
    </LayoutProvider>
  );
});
