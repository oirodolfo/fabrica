import { beforeEach, describe, expect, it, vi } from "vitest";
import { $, classMap, component, css, html, mount, rawHtml, ref, render, repeat, signal, styleMap, when } from "../src";

const tick = () => new Promise((resolve) => queueMicrotask(resolve));

beforeEach(() => {
  document.body.replaceChildren();
});

describe("html and render", () => {
  it("renders static and dynamic text", () => {
    render(document.body, html`<main>Hello ${"Rod"}</main>`);
    expect(document.body.textContent).toBe("Hello Rod");
  });

  it("updates reactive text in place", async () => {
    const label = signal("one");
    render(document.body, html`<p>${label}</p>`);
    const textNode = document.querySelector("p")?.firstChild;

    label.set("two");
    await tick();

    expect(document.body.textContent).toBe("two");
    expect(document.querySelector("p")?.firstChild).toBe(textNode);
  });

  it("binds attributes, properties and boolean attributes", async () => {
    const title = signal("A");
    const value = signal("hello");
    const disabled = signal(false);

    render(document.body, html`<input title=${title} .value=${value} ?disabled=${disabled} />`);
    const input = document.querySelector("input") as HTMLInputElement;

    expect(input.title).toBe("A");
    expect(input.value).toBe("hello");
    expect(input.hasAttribute("disabled")).toBe(false);

    title.set("B");
    value.set("world");
    disabled.set(true);
    await tick();

    expect(input.title).toBe("B");
    expect(input.value).toBe("world");
    expect(input.hasAttribute("disabled")).toBe(true);
  });

  it("binds classMap and styleMap with removal", async () => {
    const active = signal(true);
    const muted = signal(false);
    const opacity = signal("1");

    render(document.body, html`<div class=${classMap({ active, muted })} style=${styleMap({ opacity })}></div>`);
    const div = document.querySelector("div") as HTMLDivElement;

    expect(div.classList.contains("active")).toBe(true);
    expect(div.classList.contains("muted")).toBe(false);
    expect(div.style.opacity).toBe("1");

    active.set(false);
    muted.set(true);
    opacity.set("0.5");
    await tick();

    expect(div.classList.contains("active")).toBe(false);
    expect(div.classList.contains("muted")).toBe(true);
    expect(div.style.opacity).toBe("0.5");
  });

  it("supports event modifiers", () => {
    const spy = vi.fn((event: Event) => expect(event.defaultPrevented).toBe(true));
    render(document.body, html`<button @click.prevent=${spy}>Run</button>`);

    document.querySelector("button")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("supports refs and cleanup on render replacement", () => {
    const cleanup = vi.fn();
    const callback = vi.fn(() => cleanup);

    render(document.body, html`<input ref=${ref(callback)} />`);
    expect(callback).toHaveBeenCalledTimes(1);

    render(document.body, html`<p>Next</p>`);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("supports raw HTML explicitly", () => {
    render(document.body, html`<article>${rawHtml("<strong>Trusted</strong>")}</article>`);
    expect(document.querySelector("strong")?.textContent).toBe("Trusted");
  });
});

describe("directives", () => {
  it("supports when", async () => {
    const open = signal(false);
    render(document.body, html`${when(open, () => html`<p>Open</p>`, () => html`<p>Closed</p>`)}`);

    expect(document.body.textContent).toBe("Closed");
    open.set(true);
    await tick();
    expect(document.body.textContent).toBe("Open");
  });

  it("supports keyed repeat with node reuse", async () => {
    const items = signal([
      { id: "a", label: "Alpha" },
      { id: "b", label: "Beta" },
    ]);

    render(document.body, html`<ul>${repeat(items, (item) => item.id, ({ item }) => html`<li>${() => item().label}</li>`)}</ul>`);
    const beta = document.querySelectorAll("li")[1];

    items.set([
      { id: "b", label: "Beta 2" },
      { id: "a", label: "Alpha" },
    ]);
    await tick();

    expect(document.querySelectorAll("li")[0]).toBe(beta);
    expect(document.body.textContent).toBe("Beta 2Alpha");
  });

  it("renders repeat empty state", () => {
    render(document.body, html`${repeat([], (item: { id: string }) => item.id, () => html`<p>Item</p>`, { empty: () => html`<p>Empty</p>` })}`);
    expect(document.body.textContent).toBe("Empty");
  });
});

describe("components", () => {
  it("supports local state", async () => {
    const Counter = component(() => {
      const count = signal(0);
      return html`<button @click=${() => count.update((value) => value + 1)}>${count}</button>`;
    });

    render(document.body, html`${Counter()}`);
    const button = document.querySelector("button") as HTMLButtonElement;

    button.click();
    await tick();

    expect(button.textContent).toBe("1");
  });

  it("runs component lifecycle cleanup", async () => {
    const cleanup = vi.fn();
    const Widget = component((_props, context) => {
      context.onMount(() => cleanup);
      return html`<p>Widget</p>`;
    });

    render(document.body, html`${Widget()}`);
    await tick();
    render(document.body, html`<p>Other</p>`);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe("bag API", () => {
  it("queries, applies props and renders html", () => {
    document.body.innerHTML = `<button></button>`;
    $("button")({ text: "Save", class: "primary" });

    expect(document.querySelector("button")?.textContent).toBe("Save");
    expect(document.querySelector("button")?.className).toBe("primary");

    $("body").html`<main>Hi</main>`;
    expect(document.body.textContent).toBe("Hi");
  });

  it("creates elements and shadow roots", () => {
    const bag = $.create("section.panel#app").shadow.html`<button>Inside</button>`.appendTo(document.body);

    expect(bag.el?.id).toBe("app");
    expect(bag.el?.shadowRoot?.textContent).toBe("Inside");
  });

  it("applies css and important css", () => {
    const button = document.createElement("button");
    document.body.append(button);

    $(button).important.css`color: red;`;

    expect(button.getAttribute("style")).toContain("important");
  });

  it("returns css text helper", () => {
    expect(css({ backgroundColor: "black", color: "white" })).toContain("background-color: black");
  });

  it("mounts without replacing", () => {
    document.body.innerHTML = `<p>Existing</p>`;
    const dispose = $("body").mount(html`<strong>New</strong>`);

    expect(document.body.textContent).toBe("ExistingNew");
    dispose();
    expect(document.body.textContent).toBe("Existing");
  });
});
