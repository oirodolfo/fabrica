import { beforeEach, describe, expect, it, vi } from "vitest";
import Fabrica, {
  $,
  batch,
  classMap,
  component,
  computed,
  css,
  debug,
  effect,
  html,
  memo,
  mount,
  rawHtml,
  ref,
  render,
  repeat,
  setDebug,
  signal,
  styleMap,
  untrack,
  when,
} from "../src";
import { createFabricaApi } from "../src/public-api";
import type { Cleanup, Signal } from "../src";

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await new Promise<void>((resolve) => queueMicrotask(resolve));
};

const click = (element: Element): boolean =>
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

beforeEach(() => {
  document.body.replaceChildren();
  document.head.replaceChildren();
});

describe("FabricaDOM v7 extensive integration suite", () => {
  describe("reactivity core", () => {
    it("supports signal read, set, update, peek, and direct subscription", async () => {
      const count = signal(0);
      const subscriber = vi.fn() as unknown as (() => void) & {
        deps: Array<Set<unknown>>;
        cleanups: Cleanup[];
        disposed: boolean;
        sync: boolean;
      };

      subscriber.deps = [];
      subscriber.cleanups = [];
      subscriber.disposed = false;
      subscriber.sync = false;

      const unsubscribe = count.subscribe(subscriber);

      expect(count()).toBe(0);
      expect(count.peek()).toBe(0);

      count.set(1);
      await flush();

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(count()).toBe(1);

      unsubscribe();
      count.update((currentValue) => currentValue + 1);
      await flush();

      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(count.peek()).toBe(2);
    });

    it("deduplicates async effect flushes and keeps only the latest value", async () => {
      const count = signal(0);
      const spy = vi.fn();

      effect(() => {
        spy(count());
      });

      count.set(1);
      count.set(2);
      count.set(3);

      await flush();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenNthCalledWith(1, 0);
      expect(spy).toHaveBeenNthCalledWith(2, 3);
    });

    it("supports sync effects when immediate reaction is required", () => {
      const count = signal(0);
      const spy = vi.fn();

      effect(
        () => {
          spy(count());
        },
        { sync: true },
      );

      count.set(1);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenLastCalledWith(1);
    });

    it("cleans stale branch dependencies", async () => {
      const enabled = signal(true);
      const first = signal("first");
      const second = signal("second");
      const spy = vi.fn();

      effect(() => {
        spy(enabled() ? first() : second());
      });

      enabled.set(false);
      await flush();

      first.set("ignored");
      await flush();

      second.set("used");
      await flush();

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenLastCalledWith("used");
    });

    it("runs effect cleanup before rerun and again on dispose", async () => {
      const count = signal(0);
      const cleanup = vi.fn();

      const stop = effect((onCleanup) => {
        count();
        onCleanup(cleanup);
      });

      count.set(1);
      await flush();

      expect(cleanup).toHaveBeenCalledTimes(1);

      stop();

      expect(cleanup).toHaveBeenCalledTimes(2);
    });

    it("supports computed, memo, batch, and untrack", async () => {
      const first = signal("Rod");
      const last = signal("Dev");
      const fullName = computed(() => `${first()} ${last()}`);
      const loudName = memo(() => fullName().toUpperCase());
      const spy = vi.fn();

      effect(() => {
        spy(loudName(), untrack(() => first()));
      });

      batch(() => {
        first.set("Rodolfo");
        last.set("Silva");
      });

      await flush();
      await flush();

      expect(fullName()).toBe("Rodolfo Silva");
      expect(loudName()).toBe("RODOLFO SILVA");
      expect(spy).toHaveBeenLastCalledWith("RODOLFO SILVA", "Rodolfo");
    });
  });

  describe("template rendering and child parts", () => {
    it("renders static HTML, primitive values, bigint values, arrays, nodes, fragments, and bags", () => {
      const strong = document.createElement("strong");
      const fragment = document.createDocumentFragment();
      const badge = $.create("span.badge")({ text: "Bag" });

      strong.textContent = "Node";
      fragment.append(document.createTextNode("Fragment"));

      render(
        document.body,
        html`
          <main>
            ${"Text"}
            ${123}
            ${10n}
            ${true}
            ${false}
            ${null}
            ${undefined}
            ${["A", "B"]}
            ${strong}
            ${fragment}
            ${badge}
          </main>
        `,
      );

      expect(document.body.textContent?.replace(/\s+/g, "")).toBe("Text12310ABNodeFragmentBag");
      expect(document.querySelector("span.badge")?.textContent).toBe("Bag");
    });

    it("updates reactive text in place instead of replacing its text node", async () => {
      const label = signal("before");

      render(document.body, html`<p>${label}</p>`);

      const paragraph = document.querySelector("p");
      const originalTextNode = paragraph?.firstChild;

      label.set("after");
      await flush();

      expect(document.body.textContent).toBe("after");
      expect(document.querySelector("p")?.firstChild).toBe(originalTextNode);
    });

    it("replaces child part shape cleanly between text, node, array, raw HTML, and empty", async () => {
      const view = signal<unknown>("hello");
      const node = document.createElement("em");

      node.textContent = "node";
      render(document.body, html`<section>${view}</section>`);

      expect(document.body.textContent).toBe("hello");

      view.set(node);
      await flush();
      expect(document.querySelector("em")?.textContent).toBe("node");

      view.set(["a", html`<strong>b</strong>`]);
      await flush();
      expect(document.body.textContent).toBe("ab");
      expect(document.querySelector("strong")?.textContent).toBe("b");

      view.set(rawHtml("<mark>raw</mark>"));
      await flush();
      expect(document.querySelector("mark")?.textContent).toBe("raw");

      view.set(false);
      await flush();
      expect(document.querySelector("section")?.textContent).toBe("");
    });

    it("disposes old render trees before replacing the container", async () => {
      const cleanup = vi.fn();
      const Field = component((_props, context) => {
        context.onMount(() => cleanup);
        return html`<input />`;
      });

      render(document.body, html`${Field()}`);
      await flush();

      render(document.body, html`<p>replacement</p>`);

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toBe("replacement");
    });

    it("mounts multiple ranges and disposes only the selected range", () => {
      const firstDispose = mount(document.body, html`<strong>first</strong>`);
      mount(document.body, html`<em>second</em>`);

      expect(document.body.textContent).toBe("firstsecond");

      firstDispose();

      expect(document.body.textContent).toBe("second");
      expect(document.querySelector("strong")).toBeNull();
      expect(document.querySelector("em")?.textContent).toBe("second");
    });
  });

  describe("attribute, property, boolean, class, style, and ref bindings", () => {
    it("binds plain attributes, DOM properties, and boolean attributes reactively", async () => {
      const title = signal("initial-title");
      const value = signal("initial-value");
      const disabled = signal(false);

      render(document.body, html`<input title=${title} .value=${value} ?disabled=${disabled} />`);

      const input = document.querySelector("input") as HTMLInputElement;

      expect(input.getAttribute("title")).toBe("initial-title");
      expect(input.value).toBe("initial-value");
      expect(input.hasAttribute("disabled")).toBe(false);

      title.set("next-title");
      value.set("next-value");
      disabled.set(true);
      await flush();

      expect(input.getAttribute("title")).toBe("next-title");
      expect(input.value).toBe("next-value");
      expect(input.hasAttribute("disabled")).toBe(true);
    });

    it("removes falsey plain attributes while preserving zero as a valid value", async () => {
      const title = signal<unknown>("visible");
      const order = signal<unknown>(0);

      render(document.body, html`<div title=${title} data-order=${order}></div>`);
      const div = document.querySelector("div") as HTMLDivElement;

      expect(div.getAttribute("title")).toBe("visible");
      expect(div.getAttribute("data-order")).toBe("0");

      title.set(false);
      order.set(null);
      await flush();

      expect(div.hasAttribute("title")).toBe(false);
      expect(div.hasAttribute("data-order")).toBe(false);
    });

    it("diffs classMap and styleMap updates without leaving stale keys", async () => {
      const active = signal(true);
      const muted = signal(false);
      const tone = signal("tomato");
      const spacing = signal("4px");

      render(
        document.body,
        html`
          <div
            class=${classMap({ active, muted })}
            style=${styleMap({ color: tone, marginTop: spacing })}
          ></div>
        `,
      );

      const div = document.querySelector("div") as HTMLDivElement;

      expect(div.classList.contains("active")).toBe(true);
      expect(div.classList.contains("muted")).toBe(false);
      expect(div.style.color).toBe("tomato");
      expect(div.style.marginTop).toBe("4px");

      active.set(false);
      muted.set(true);
      tone.set("skyblue");
      spacing.set(false as unknown as string);
      await flush();

      expect(div.classList.contains("active")).toBe(false);
      expect(div.classList.contains("muted")).toBe(true);
      expect(div.style.color).toBe("skyblue");
      expect(div.style.marginTop).toBe("");
    });

    it("supports conditional class bindings with class:name syntax", async () => {
      const active = signal(false);

      render(document.body, html`<button class:active=${active}>Toggle</button>`);
      const button = document.querySelector("button") as HTMLButtonElement;

      expect(button.classList.contains("active")).toBe(false);

      active.set(true);
      await flush();

      expect(button.classList.contains("active")).toBe(true);
    });

    it("runs ref callbacks and disposes ref cleanups on replacement", () => {
      const cleanup = vi.fn();
      const callback = vi.fn(() => cleanup);

      render(document.body, html`<input ref=${ref(callback)} />`);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0]?.[0]).toBeInstanceOf(HTMLInputElement);

      render(document.body, html`<p>next</p>`);

      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe("events", () => {
    it("binds click handlers and applies prevent and stop modifiers", () => {
      const parentSpy = vi.fn();
      const childSpy = vi.fn((event: Event) => {
        expect(event.defaultPrevented).toBe(true);
      });

      render(
        document.body,
        html`
          <section @click=${parentSpy}>
            <button @click.prevent.stop=${childSpy}>Run</button>
          </section>
        `,
      );

      const button = document.querySelector("button") as HTMLButtonElement;
      const dispatchResult = click(button);

      expect(dispatchResult).toBe(false);
      expect(childSpy).toHaveBeenCalledTimes(1);
      expect(parentSpy).not.toHaveBeenCalled();
    });

    it("supports once listeners", () => {
      const spy = vi.fn();

      render(document.body, html`<button @click.once=${spy}>Run</button>`);
      const button = document.querySelector("button") as HTMLButtonElement;

      click(button);
      click(button);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("updates signal-backed event handlers and removes the previous listener", async () => {
      const first = vi.fn();
      const second = vi.fn();
      const handler = signal<(event: Event) => void>(first);

      render(document.body, html`<button @click=${handler}>Run</button>`);
      const button = document.querySelector("button") as HTMLButtonElement;

      click(button);
      handler.set(second);
      await flush();
      click(button);

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).toHaveBeenCalledTimes(1);
    });

    it("supports delegated event handlers and removes them during cleanup", () => {
      const spy = vi.fn();

      render(document.body, html`<button @click.delegate=${spy}>Delegated</button>`);
      const button = document.querySelector("button") as HTMLButtonElement;

      click(button);
      expect(spy).toHaveBeenCalledTimes(1);

      render(document.body, html`<p>gone</p>`);
      click(button);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("directives", () => {
    it("switches when branches only when the selected branch changes", async () => {
      const open = signal(false);

      render(
        document.body,
        html`
          ${when(
            open,
            () => html`<section data-state="open">Open</section>`,
            () => html`<section data-state="closed">Closed</section>`,
          )}
        `,
      );

      expect(document.querySelector("section")?.getAttribute("data-state")).toBe("closed");
      expect(document.body.textContent?.trim()).toBe("Closed");

      open.set(true);
      await flush();

      expect(document.querySelector("section")?.getAttribute("data-state")).toBe("open");
      expect(document.body.textContent?.trim()).toBe("Open");
    });

    it("supports when without a falsy renderer", async () => {
      const visible = signal(false);

      render(document.body, html`<main>${when(visible, () => html`<p>Visible</p>`)}</main>`);
      expect(document.querySelector("main")?.textContent).toBe("");

      visible.set(true);
      await flush();

      expect(document.querySelector("main")?.textContent).toBe("Visible");
    });

    it("reuses keyed repeat nodes while updating item, index, and key signals", async () => {
      const items = signal([
        { id: "a", label: "Alpha" },
        { id: "b", label: "Beta" },
        { id: "c", label: "Gamma" },
      ]);

      render(
        document.body,
        html`
          <ol>
            ${repeat(
              items,
              (item) => item.id,
              ({ item, index, key }) => html`
                <li data-key=${key}>${() => index() + 1}. ${() => item().label}</li>
              `,
            )}
          </ol>
        `,
      );

      const originalNodes = document.querySelectorAll("li");
      const alphaNode = originalNodes[0];
      const gammaNode = originalNodes[2];

      items.set([
        { id: "c", label: "Gamma updated" },
        { id: "a", label: "Alpha" },
        { id: "d", label: "Delta" },
      ]);
      await flush();

      const nextNodes = document.querySelectorAll("li");

      expect(nextNodes[0]).toBe(gammaNode);
      expect(nextNodes[1]).toBe(alphaNode);
      expect(nextNodes[0]?.textContent?.trim()).toBe("1. Gamma updated");
      expect(nextNodes[0]?.getAttribute("data-key")).toBe("c");
      expect(nextNodes[2]?.textContent?.trim()).toBe("3. Delta");
    });

    it("renders and removes repeat empty states", async () => {
      const items = signal<Array<{ id: string; label: string }>>([]);

      render(
        document.body,
        html`
          ${repeat(items, (item) => item.id, ({ item }) => html`<p>${() => item().label}</p>`, {
            empty: () => html`<p data-empty="true">Empty</p>`,
          })}
        `,
      );

      expect(document.querySelector("[data-empty='true']")?.textContent).toBe("Empty");

      items.set([{ id: "one", label: "One" }]);
      await flush();

      expect(document.querySelector("[data-empty='true']")).toBeNull();
      expect(document.body.textContent?.trim()).toBe("One");

      items.set([]);
      await flush();

      expect(document.querySelector("[data-empty='true']")?.textContent).toBe("Empty");
    });
  });

  describe("components", () => {
    it("passes typed props, supports local state, and responds to user events", async () => {
      const Counter = component<{ initial: number; label: string }>((props) => {
        const count = signal(props.initial);

        return html`
          <button @click=${() => count.update((currentValue) => currentValue + 1)}>
            ${props.label}: ${count}
          </button>
        `;
      });

      render(document.body, html`${Counter({ initial: 4, label: "Count" })}`);

      const button = document.querySelector("button") as HTMLButtonElement;
      expect(button.textContent?.replace(/\s+/g, " ").trim()).toBe("Count: 4");

      click(button);
      await flush();

      expect(button.textContent?.replace(/\s+/g, " ").trim()).toBe("Count: 5");
    });

    it("supports component context helpers, mount lifecycle, dispose lifecycle, and scoped refs", async () => {
      const mounted = vi.fn();
      const disposed = vi.fn();
      const refCleanup = vi.fn();
      let capturedId = "";

      const Widget = component((_props, context) => {
        const name = context.signal("Rod");
        const loud = context.computed(() => name().toUpperCase());

        capturedId = context.id;
        context.onMount(() => {
          mounted(loud());
          return disposed;
        });
        context.onDispose(refCleanup);

        return html`<input ref=${context.ref((node) => node.setAttribute("data-ref", "ok"))} .value=${loud} />`;
      });

      render(document.body, html`${Widget()}`);
      await flush();

      const input = document.querySelector("input") as HTMLInputElement;

      expect(capturedId).toMatch(/^fabrica-/);
      expect(input.value).toBe("ROD");
      expect(input.getAttribute("data-ref")).toBe("ok");
      expect(mounted).toHaveBeenCalledWith("ROD");

      render(document.body, html`<p>next</p>`);

      expect(disposed).toHaveBeenCalledTimes(1);
      expect(refCleanup).toHaveBeenCalledTimes(1);
    });

    it("can compose nested components through children-like props", () => {
      const Card = component<{ title: string; children: ReturnType<typeof html> }>((props) => html`
        <article>
          <h2>${props.title}</h2>
          <div>${props.children}</div>
        </article>
      `);

      render(document.body, html`${Card({ title: "Profile", children: html`<p>Rod</p>` })}`);

      expect(document.querySelector("h2")?.textContent).toBe("Profile");
      expect(document.querySelector("article p")?.textContent).toBe("Rod");
    });
  });

  describe("DOM bag API", () => {
    it("queries elements, applies props, exposes metadata, and supports chaining", () => {
      document.body.innerHTML = `<button></button><button></button>`;

      const buttons = $("button")({
        text: "Save",
        class: "primary",
        attrs: { type: "button", "aria-label": "Save" },
        dataset: { role: "action" },
      });

      expect(buttons.length).toBe(2);
      expect(buttons.count).toBe(2);
      expect(buttons.size).toBe(2);
      expect(buttons.el).toBe(document.querySelector("button"));

      const first = document.querySelector("button") as HTMLButtonElement;

      expect(first.textContent).toBe("Save");
      expect(first.className).toBe("primary");
      expect(first.type).toBe("button");
      expect(first.getAttribute("aria-label")).toBe("Save");
      expect(first.dataset.role).toBe("action");
    });

    it("creates elements from shorthand expressions and respects find-only mode", () => {
      const created = $.create("section.panel#app").appendTo(document.body);
      const missing = $.find(".does-not-exist");

      expect(created.el?.tagName).toBe("SECTION");
      expect(created.el?.id).toBe("app");
      expect(created.el?.classList.contains("panel")).toBe(true);
      expect(missing.length).toBe(0);
    });

    it("creates an element from a selector miss when the expression is safe", () => {
      const bag = $("article.card").html`<h1>Card</h1>`.appendTo(document.body);

      expect(bag.el?.tagName).toBe("ARTICLE");
      expect(bag.el?.classList.contains("card")).toBe(true);
      expect(document.body.textContent).toBe("Card");
    });

    it("renders bag HTML, disposes previous bag render, and removes bag elements", async () => {
      const cleanup = vi.fn();
      const Widget = component((_props, context) => {
        context.onMount(() => cleanup);
        return html`<strong>Mounted</strong>`;
      });

      const host = $.create("div.host").appendTo(document.body);

      host.html`${Widget()}`;
      await flush();
      host.html`<em>Next</em>`;

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(host.el?.textContent).toBe("Next");

      host.remove();
      expect(document.querySelector(".host")).toBeNull();
    });

    it("mounts bag content without replacing existing children", () => {
      document.body.innerHTML = `<main><p>Existing</p></main>`;
      const dispose = $("main").mount(html`<strong>Mounted</strong>`);

      expect(document.querySelector("main")?.textContent).toBe("ExistingMounted");

      dispose();

      expect(document.querySelector("main")?.textContent).toBe("Existing");
    });

    it("supports Shadow DOM rendering through bag.shadow", () => {
      const host = $.create("section.shell").shadow.html`<button>Inside</button>`.appendTo(document.body);

      expect(host.el?.shadowRoot).toBeTruthy();
      expect(host.el?.shadowRoot?.textContent).toBe("Inside");
      expect(host.el?.textContent).toBe("");
    });

    it("applies normal CSS, important CSS, object CSS, and style tag CSS", () => {
      const button = document.createElement("button");
      const style = document.createElement("style");

      document.body.append(button);
      document.head.append(style);

      $(button).css`color: red; background-color: black;`;
      expect(button.style.color).toBe("red");
      expect(button.style.backgroundColor).toBe("black");

      $(button).important.css({ borderColor: "blue" });
      expect(button.getAttribute("style")).toContain("important");

      $(style).css`.card { color: red; }`;
      expect(style.textContent).toContain(".card");
    });

    it("supports SVG shorthand creation", () => {
      const icon = $.create("svg.icon").appendTo(document.body);

      expect(icon.el?.namespaceURI).toBe("http://www.w3.org/2000/svg");
      expect(icon.el?.classList.contains("icon")).toBe(true);
    });
  });

  describe("CSS helpers and raw HTML helpers", () => {
    it("builds CSS from strings, template strings, and objects", () => {
      const color = signal("tomato");

      expect(css("color: red;")).toBe("color: red;");
      expect(css`color: ${color};`).toBe("color: tomato;");
      expect(css({ backgroundColor: "black", marginTop: "4px" })).toBe("background-color: black;margin-top: 4px;");
    });

    it("supports rawHtml export and html.raw alias", () => {
      render(document.body, html`<section>${rawHtml("<strong>raw</strong>")}${html.raw("<em>alias</em>")}</section>`);

      expect(document.querySelector("strong")?.textContent).toBe("raw");
      expect(document.querySelector("em")?.textContent).toBe("alias");
    });
  });

  describe("global installation, noConflict, and debug", () => {
    it("installs Fabrica globally without overwriting an existing $ by default", () => {
      const previousDollar = globalThis.$;
      const previousDollarEl = globalThis.$el;
      const existingDollar = { owner: "site" };
      const api = createFabricaApi();

      globalThis.$ = existingDollar;
      Reflect.deleteProperty(globalThis, "$rod");

      api.install({ exposeDollar: true, exposeDollarEl: true, dollarAlias: "$rod", forceAlias: false });

      expect(globalThis.Fabrica).toBe(api);
      expect(globalThis.$).toBe(existingDollar);
      expect((globalThis as unknown as Record<string, unknown>).$rod).toBe(api.$);

      globalThis.$ = previousDollar;
      globalThis.$el = previousDollarEl;
      Reflect.deleteProperty(globalThis, "$rod");
    });

    it("can force $ ownership and then restore through noConflict", () => {
      const previousDollar = globalThis.$;
      const api = createFabricaApi();

      api.install({ exposeDollar: true, forceAlias: true });
      expect(globalThis.$).toBe(api.$);

      api.noConflict();
      expect(globalThis.$).toBe(previousDollar);
    });

    it("exposes the default singleton API and debug counters", () => {
      setDebug(true);
      render(document.body, html`<p>${"debug"}</p>`);

      const snapshot = debug();

      expect(Fabrica.html).toBe(html);
      expect(snapshot.enabled).toBe(true);
      expect(snapshot.templates).toBeGreaterThanOrEqual(1);
      expect(snapshot.parts).toBeGreaterThanOrEqual(1);
    });
  });

  describe("stress and cleanup behavior", () => {
    it("handles a larger keyed list without replacing stable nodes", async () => {
      type Row = { id: string; label: string };

      const rows = signal<Row[]>([]);
      const initialRows: Row[] = [];
      const reversedRows: Row[] = [];

      for (let index = 0; index < 75; index += 1) {
        initialRows.push({ id: `row-${index}`, label: `Row ${index}` });
      }

      for (let index = initialRows.length - 1; index >= 0; index -= 1) {
        const row = initialRows[index];

        if (row) {
          reversedRows.push({ id: row.id, label: `${row.label} updated` });
        }
      }

      rows.set(initialRows);

      render(
        document.body,
        html`
          <ul>
            ${repeat(rows, (row) => row.id, ({ item }) => html`<li>${() => item().label}</li>`)}
          </ul>
        `,
      );

      const originalFirst = document.querySelector("li");

      rows.set(reversedRows);
      await flush();

      const allRows = document.querySelectorAll("li");

      expect(allRows.length).toBe(75);
      expect(allRows[74]).toBe(originalFirst);
      expect(allRows[0]?.textContent).toBe("Row 74 updated");
    });

    it("removes event listeners and effect subscriptions when a large mounted view is disposed", async () => {
      const count = signal(0);
      const clickSpy = vi.fn();
      const dispose = mount(
        document.body,
        html`
          <section>
            ${repeat(
              [0, 1, 2, 3, 4],
              (item) => item,
              ({ item }) => html`<button @click=${clickSpy}>${() => count()}-${item}</button>`,
            )}
          </section>
        `,
      );

      const firstButton = document.querySelector("button") as HTMLButtonElement;
      click(firstButton);
      expect(clickSpy).toHaveBeenCalledTimes(1);

      dispose();
      count.set(1);
      await flush();
      click(firstButton);

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toBe("");
    });
  });
});
