import { useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import Button from "../../components/button";

export default function (props: { children: ComponentChildren }) {
  const count = useSignal(0);
  return (
    <div>
      <div>
        <Button
          type={"button"}
          className={"btn btn-primary"}
          onClick={() => count.value--}
        >
          -
        </Button>
        {count.value}
        <Button
          type={"button"}
          className={"btn btn-primary"}
          onClick={() => {
            count.value += 1;
          }}
        >
          +
        </Button>
      </div>
      <div>
        <div>{props.children}</div>
      </div>
    </div>
  );
}
