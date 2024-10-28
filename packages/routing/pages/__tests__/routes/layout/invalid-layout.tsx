// @jsxImportSource preact
import { definePage } from "../../..";
import LayoutProvider from "../../../layout-provider";

export default definePage(({ ctx }) => {
  const l = "somelayout";
  return (
    <LayoutProvider ctx={ctx} layout={() => import(l)}>
      <h1>Hello world</h1>
    </LayoutProvider>
  );
});
