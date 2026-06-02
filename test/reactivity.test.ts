import { describe, expect, it, vi } from "vitest";
import { batch, computed, effect, signal, untrack } from "../src";

const tick = () => new Promise((resolve) => queueMicrotask(resolve));

describe("reactivity", () => {
  it("reads, sets, updates and peeks signals", () => {
    const count = signal(1);

    expect(count()).toBe(1);
    count.set(2);
    expect(count.peek()).toBe(2);
    count.update((value) => value + 1);
    expect(count()).toBe(3);
  });

  it("runs effects once initially and again after signal writes", async () => {
    const count = signal(0);
    const spy = vi.fn();

    effect(() => spy(count()));
    count.set(1);
    count.set(2);

    await tick();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(2);
  });

  it("cleans stale dependencies when branches change", async () => {
    const enabled = signal(true);
    const first = signal("a");
    const second = signal("b");
    const spy = vi.fn();

    effect(() => {
      spy(enabled() ? first() : second());
    });

    enabled.set(false);
    await tick();
    first.set("ignored");
    await tick();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith("b");
  });

  it("supports computed signals", async () => {
    const count = signal(2);
    const doubled = computed(() => count() * 2);

    expect(doubled()).toBe(4);
    count.set(3);
    await tick();
    expect(doubled()).toBe(6);
  });

  it("supports untracked reads", async () => {
    const count = signal(1);
    const spy = vi.fn();

    effect(() => spy(untrack(() => count())));
    count.set(2);
    await tick();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("batches multiple writes", async () => {
    const first = signal("a");
    const second = signal("b");
    const spy = vi.fn();

    effect(() => spy(`${first()}-${second()}`));

    batch(() => {
      first.set("x");
      second.set("y");
    });

    await tick();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith("x-y");
  });
});
