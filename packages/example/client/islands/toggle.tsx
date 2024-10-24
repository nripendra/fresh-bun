import { useSignal } from "@preact/signals";

export default function (props: { initial: boolean, children: any }) {
  const toggle = useSignal(props.initial);
  return (
    <div style={{ border: "1px solid red" }} className={"mt-10 mb-10"}>
      <div>Value: {toggle.value ? "YES" : "NO"}</div>
      <button className={"btn"} onClick={() => {alert("un"); (toggle.value = !toggle.value)}}>
        Toggle {props.children}
      </button>
    </div>
  );
}
