import { describe, expect, it, vi } from 'vitest';

import { html } from '../src/index.js';
import { expectImmutableTemplate } from './template-assertions.js';

describe('html', () => {
  it('renders HTML template source with interpolated values', () => {
    const view = html`<h1>Hello ${'Fabrica'}</h1><span>${1}</span>`;

    expectImmutableTemplate(view, 'html', '<h1>Hello Fabrica</h1><span>1</span>');
    expect(view.strings).toEqual(['<h1>Hello ', '</h1><span>', '</span>']);
    expect(view.values).toEqual(['Fabrica', 1]);
  });

  it('normalizes nullish interpolations to empty strings', () => {
    const view = html`<p>${null}${undefined}${false}</p>`;

    expect(view.source).toBe('<p>false</p>');
  });

  it('creates an HTMLTemplateElement in DOM runtimes', () => {
    const template = html`<button type="button">Save</button>`.toTemplate();

    expect(template).toBeInstanceOf(HTMLTemplateElement);
    expect(template.content.querySelector('button')?.textContent).toBe('Save');
    expect(template.content.querySelector('button')?.getAttribute('type')).toBe('button');
  });

  it('logs debug output only when configured', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    html`<p>quiet</p>`;
    expect(debugSpy).not.toHaveBeenCalled();

    html.withOptions({ debug: true })`<p>${'logged'}</p>`;
    expect(debugSpy).toHaveBeenCalledOnce();
    expect(debugSpy.mock.calls[0]?.[0]).toContain('[fabrica] created html template');

    debugSpy.mockRestore();
  });
});
