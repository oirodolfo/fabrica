import { createTemplate, type FabricaTemplate, type TemplateValue } from './template.js';

const HTML_TEMPLATE_KIND = 'html';

/* ────────────────────────────────────────────────────────────────────────── *\
 * HTML tagged template runtime
\* ────────────────────────────────────────────────────────────────────────── */

/**
 * Immutable HTML template returned by {@link html}.
 *
 * @remarks
 * The object stores the rendered HTML source and can create a browser
 * `HTMLTemplateElement` when a DOM is available. It intentionally does not
 * sanitize or escape values; pass only trusted content or sanitize before
 * interpolation.
 *
 * @example
 * ```ts
 * import { html } from '@rodkisten/fabrica';
 *
 * const card = html`<article><h2>${'Hello'}</h2></article>`;
 * document.body.append(card.toTemplate().content.cloneNode(true));
 * ```
 */
export interface HtmlTemplate extends FabricaTemplate<typeof HTML_TEMPLATE_KIND> {
  /**
   * Creates a DOM `HTMLTemplateElement` containing the rendered source.
   *
   * @returns A populated `HTMLTemplateElement`.
   *
   * @example
   * ```ts
   * import { html } from '@rodkisten/fabrica';
   *
   * const template = html`<button type="button">Save</button>`.toTemplate();
   * console.log(template.content.querySelector('button')?.type);
   * ```
   */
  toTemplate(): HTMLTemplateElement;
}

/**
 * Options for the {@link html} tagged template helper.
 *
 * @remarks
 * Use the debug flag while developing integrations that generate HTML strings
 * dynamically. Debug logging is disabled by default and never enabled globally.
 *
 * @example
 * ```ts
 * import { html } from '@rodkisten/fabrica';
 *
 * const quiet = html.withOptions({ debug: false })`<p>No logs</p>`;
 * console.log(quiet.source);
 * ```
 */
export interface HtmlOptions {
  /** Enables a debug-level creation log for the produced template. */
  readonly debug?: boolean;
}

/**
 * Tagged template helper for typed HTML fragments.
 *
 * @param strings - Template literal string parts supplied by JavaScript.
 * @param values - Interpolation values rendered into the final HTML source.
 * @returns An immutable HTML template object with string and DOM helpers.
 *
 * @remarks
 * `html` is intentionally tiny: it preserves the template literal source,
 * normalizes `null` and `undefined` interpolations to empty strings, and exposes
 * `toTemplate()` for browser-like runtimes. It does not perform escaping because
 * escaping requirements are application-specific.
 *
 * @example
 * ```ts
 * import { html } from '@rodkisten/fabrica';
 *
 * const name = 'Fabrica';
 * const view = html`<h1>Hello ${name}</h1>`;
 * console.log(view.toString());
 * ```
 */
interface HtmlTag {
  /**
   * Tagged template helper for typed HTML fragments.
   *
   * @param strings - Template literal string parts supplied by JavaScript.
   * @param values - Interpolation values rendered into the final HTML source.
   * @returns An immutable HTML template object with string and DOM helpers.
   *
   * @remarks
   * `html` is intentionally tiny: it preserves the template literal source,
   * normalizes `null` and `undefined` interpolations to empty strings, and exposes
   * `toTemplate()` for browser-like runtimes. It does not perform escaping because
   * escaping requirements are application-specific.
   *
   * @example
   * ```ts
   * import { html } from '@rodkisten/fabrica';
   *
   * const name = 'Fabrica';
   * const view = html`<h1>Hello ${name}</h1>`;
   * console.log(view.toString());
   * ```
   */
  (strings: TemplateStringsArray, ...values: TemplateValue[]): HtmlTemplate;
  /**
   * Creates an HTML tag helper with local options.
   *
   * @param options - Runtime options for templates created by the returned tag.
   * @returns A configured HTML tagged template helper.
   *
   * @remarks
   * The configured helper is useful when debug logs should be enabled in a
   * narrow integration point without changing global behavior.
   *
   * @example
   * ```ts
   * import { html } from '@rodkisten/fabrica';
   *
   * const debugHtml = html.withOptions({ debug: true });
   * debugHtml`<p>Logged once</p>`;
   * ```
   */
  withOptions(options: HtmlOptions): (strings: TemplateStringsArray, ...values: TemplateValue[]) => HtmlTemplate;
}

/**
 * Tagged template helper for typed HTML fragments.
 *
 * @param strings - Template literal string parts supplied by JavaScript.
 * @param values - Interpolation values rendered into the final HTML source.
 * @returns An immutable HTML template object with string and DOM helpers.
 *
 * @remarks
 * The helper preserves source text, normalizes `null` and `undefined`
 * interpolations to empty strings, and keeps debug logging opt-in via
 * `withOptions({ debug: true })`.
 *
 * @example
 * ```ts
 * import { html } from '@rodkisten/fabrica';
 *
 * const fragment = html`<p>Hello</p>`;
 * console.log(fragment.source);
 * ```
 */
export const html: HtmlTag = Object.assign(
  (strings: TemplateStringsArray, ...values: TemplateValue[]): HtmlTemplate =>
    createHtmlTemplate(strings, values, {}),
  {
    withOptions: (options: HtmlOptions) => {
      return (strings: TemplateStringsArray, ...values: TemplateValue[]): HtmlTemplate =>
        createHtmlTemplate(strings, values, options);
    },
  },
);

function createHtmlTemplate(
  strings: TemplateStringsArray,
  values: readonly TemplateValue[],
  options: HtmlOptions,
): HtmlTemplate {
  const template = createTemplate({
    debug: options.debug ?? false,
    kind: HTML_TEMPLATE_KIND,
    strings,
    values,
  });

  return Object.freeze({
    ...template,
    toTemplate() {
      const element = document.createElement('template');
      element.innerHTML = template.source;
      return element;
    },
  });
}
