import { hydrate, h, type VNode } from "preact";

class IslandMarker extends HTMLElement {
  constructor() {
    super();
  }
  async connectedCallback() {
    if (this.parentElement?.closest("island-marker")) {
      // do not hydrate if it is island within another island. It's parent island will do the job.
      return;
    }
    const vnode = await traverse(this);
    hydrate(vnode, this.parentElement!);
  }
}

function getAttributes(element: Element) {
  const attributes: Record<string, unknown> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];

    attributes[attr.nodeName] =
      typeof (element as any)[attr.nodeName] === "boolean"
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

async function traverse(element: Node): Promise<VNode<any> | string | null> {
  if (element instanceof HTMLElement && element.localName == "island-marker") {
    const localName = element.localName;
    const ComponentModule = await import(element.dataset.module!);
    const Component = ComponentModule.default;
    const slot = element.querySelector("island-marker-slot")! as HTMLElement;
    const attributes = getAttributes(element);
    const props = JSON.parse(element.dataset.props!);
    return h(
      localName,
      { ...JSON.parse(element.dataset.props!), ...attributes },
      h(Component, { ...props }, await traverse(slot))
    );
  } else if (element instanceof Element) {
    const localName = element.localName;
    const attributes = getAttributes(element);

    return h(localName, { ...attributes }, await traverseChildren(element));
  } else if (element) {
    // need to check how to deal with various other node types.
    // For now assuming we are dealing with text node, which is works fine enough for my
    // small example scenario but in the wild there simply many be a lot of other cases.
    return element.nodeValue;
  } else return null;
}

customElements.define("island-marker", IslandMarker);
