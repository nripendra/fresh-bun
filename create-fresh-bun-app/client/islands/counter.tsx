import { useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";

export default function (props: { children?: ComponentChildren }) {
  const count = useSignal(0);
  return (
    <div>
      <div>
        <button
          type={"button"}
          className={"btn btn-primary"}
          onClick={() => count.value--}
        >
          -
        </button>
        {count.value}
        <button
          type={"button"}
          className={"btn btn-primary"}
          onClick={() => {
            count.value += 1;
          }}
        >
          +
        </button>
      </div>
      <div>
        SLOT 123:
        <div>{props.children}</div>
      </div>
    </div>
  );
}
