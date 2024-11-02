// @jsxImportSource preact
import { definePage } from "../../..";
import LayoutProvider from "../../../layout-provider";

export default definePage(({ ctx }) => {
  return (
    <LayoutProvider ctx={ctx}>
      <h1>Hello world</h1>
    </LayoutProvider>
  );
});