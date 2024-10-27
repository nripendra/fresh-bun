// @jsxImportSource preact
import { definePage } from "../../..";
import LayoutProvider from "../../../layout-provider";

export default definePage(({ ctx }) => {
  return (
    <LayoutProvider
      ctx={ctx}
      layout={() => import("./_layout2")}
      hyperMediaBehavior="NoLayout"
    >
      <h1>Hello world</h1>
    </LayoutProvider>
  );
});
