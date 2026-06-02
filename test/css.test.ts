import { describe, expect, it, vi } from 'vitest';

import { css } from '../src/index.js';
import { expectImmutableTemplate } from './template-assertions.js';

describe('css', () => {
  it('renders CSS template source with interpolated values', () => {
    const styles = css`.title { color: ${'rebeccapurple'}; z-index: ${10}; }`;

    expectImmutableTemplate(styles, 'css', '.title { color: rebeccapurple; z-index: 10; }');
    expect(styles.strings).toEqual(['.title { color: ', '; z-index: ', '; }']);
    expect(styles.values).toEqual(['rebeccapurple', 10]);
  });

  it('normalizes nullish interpolations to empty strings', () => {
    const styles = css`.optional { ${undefined}${null}display: block; }`;

    expect(styles.source).toBe('.optional { display: block; }');
  });

  it('creates a style element in DOM runtimes', () => {
    const style = css`body { margin: 0; }`.toStyleElement();

    expect(style).toBeInstanceOf(HTMLStyleElement);
    expect(style.textContent).toBe('body { margin: 0; }');
  });

  it('logs debug output only when configured', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    css`body { color: black; }`;
    expect(debugSpy).not.toHaveBeenCalled();

    css.withOptions({ debug: true })`body { color: white; }`;
    expect(debugSpy).toHaveBeenCalledOnce();
    expect(debugSpy.mock.calls[0]?.[0]).toContain('[fabrica] created css template');

    debugSpy.mockRestore();
  });
});
