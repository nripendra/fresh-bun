import { type VNode, h, hydrate } from "preact";

class IslandMarker extends HTMLElement {
  async connectedCallback() {
    if (this.parentElement?.closest("island-marker")) {
      // do not hydrate if it is island within another island. It's parent island will do the job.
      return;
    }
    const vnode = await traverse(this);
    if (this.parentElement) hydrate(vnode, this.parentElement);
  }
}

function getAttributes(element: Element) {
  const attributes: Record<string, unknown> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];

    attributes[attr.nodeName] =
      typeof (element as unknown as Record<string, string>)[attr.nodeName] ===
      "boolean"
        ? true
        : attr.nodeValue;
  }
  return attributes;
}
async function traverseChildren(element: Element) {
  const children = Array.from(element.childNodes) as Node[];
  const result: (VNode | string | null)[] = [];

  for (const child of children) {
    result.push(await traverse(child));
  }
  return result;
}

async function traverse<T>(element: Node): Promise<VNode<T> | string | null> {
  if (element instanceof HTMLElement && element.localName === "island-marker") {
    const localName = element.localName;
    const ComponentModule = await import(element.dataset.module ?? "");
    const Component = ComponentModule.default;
    const slot = element.querySelector("island-marker-slot") as HTMLElement;
    const attributes = getAttributes(element);
    const props = JSON.parse(element.dataset.props ?? "{}");
    return h(
      localName,
      { ...JSON.parse(element.dataset.props ?? "{}"), ...attributes },
      h(Component, { ...props }, await traverse(slot)),
    );
  }
  if (element instanceof Element) {
    const localName = element.localName;
    const attributes = getAttributes(element);

    return h(
      localName,
      { ...attributes },
      await traverseChildren(element),
    ) as VNode<T>;
  }
  if (element) {
    // need to check how to deal with various other node types.
    // For now assuming we are dealing with text node, which is works fine enough for my
    // small example scenario but in the wild there simply many be a lot of other cases.
    return element.nodeValue;
  }
  return null;
}

customElements.define("island-marker", IslandMarker);
