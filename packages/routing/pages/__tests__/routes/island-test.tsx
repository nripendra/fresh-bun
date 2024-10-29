// @jsxImportSource preact
import { definePage } from "../..";
import { island } from "../../island";

const MyIsland = island(() => import("../client/islands/my-island"));

const Page = definePage(() => {
  return (
    <div>
      Hello
      <MyIsland />
    </div>
  );
});

export default Page;
