import { createTemplate, type FabricaTemplate, type TemplateValue } from './template.js';

const CSS_TEMPLATE_KIND = 'css';

/* ────────────────────────────────────────────────────────────────────────── *\
 * CSS tagged template runtime
\* ────────────────────────────────────────────────────────────────────────── */

/**
 * Immutable CSS template returned by {@link css}.
 *
 * @remarks
 * The object stores rendered CSS source and can create a `HTMLStyleElement` in
 * DOM-capable runtimes. It does not validate browser support for the resulting
 * CSS syntax, which keeps the helper framework-agnostic and fast.
 *
 * @example
 * ```ts
 * import { css } from '@rodkisten/fabrica';
 *
 * const theme = css`:root { color-scheme: dark; }`;
 * document.head.append(theme.toStyleElement());
 * ```
 */
export interface CssTemplate extends FabricaTemplate<typeof CSS_TEMPLATE_KIND> {
  /**
   * Creates a DOM `HTMLStyleElement` containing the rendered source.
   *
   * @returns A populated `HTMLStyleElement`.
   *
   * @example
   * ```ts
   * import { css } from '@rodkisten/fabrica';
   *
   * const style = css`button { font: inherit; }`.toStyleElement();
   * console.log(style.textContent);
   * ```
   */
  toStyleElement(): HTMLStyleElement;
}

/**
 * Options for the {@link css} tagged template helper.
 *
 * @remarks
 * Use `debug` only when diagnosing dynamic style generation. Debug logging is
 * deliberately local to each configured tag to avoid noisy production output.
 *
 * @example
 * ```ts
 * import { css } from '@rodkisten/fabrica';
 *
 * const loggedCss = css.withOptions({ debug: true })`body { margin: 0; }`;
 * console.log(loggedCss.kind);
 * ```
 */
export interface CssOptions {
  /** Enables a debug-level creation log for the produced template. */
  readonly debug?: boolean;
}

/**
 * Tagged template helper for typed CSS fragments.
 *
 * @param strings - Template literal string parts supplied by JavaScript.
 * @param values - Interpolation values rendered into the final CSS source.
 * @returns An immutable CSS template object with string and DOM helpers.
 *
 * @remarks
 * `css` preserves source text, normalizes `null` and `undefined` interpolations
 * to empty strings, and creates style elements for browser-like runtimes. It is
 * intentionally not a CSS-in-JS compiler.
 *
 * @example
 * ```ts
 * import { css } from '@rodkisten/fabrica';
 *
 * const color = 'rebeccapurple';
 * const styles = css`.title { color: ${color}; }`;
 * console.log(styles.source);
 * ```
 */
interface CssTag {
  /**
   * Tagged template helper for typed CSS fragments.
   *
   * @param strings - Template literal string parts supplied by JavaScript.
   * @param values - Interpolation values rendered into the final CSS source.
   * @returns An immutable CSS template object with string and DOM helpers.
   *
   * @remarks
   * `css` preserves source text, normalizes `null` and `undefined` interpolations
   * to empty strings, and creates style elements for browser-like runtimes. It is
   * intentionally not a CSS-in-JS compiler.
   *
   * @example
   * ```ts
   * import { css } from '@rodkisten/fabrica';
   *
   * const color = 'rebeccapurple';
   * const styles = css`.title { color: ${color}; }`;
   * console.log(styles.source);
   * ```
   */
  (strings: TemplateStringsArray, ...values: TemplateValue[]): CssTemplate;
  /**
   * Creates a CSS tag helper with local options.
   *
   * @param options - Runtime options for templates created by the returned tag.
   * @returns A configured CSS tagged template helper.
   *
   * @remarks
   * The configured helper is useful when debug logs should be enabled in a
   * narrow integration point without changing global behavior.
   *
   * @example
   * ```ts
   * import { css } from '@rodkisten/fabrica';
   *
   * const debugCss = css.withOptions({ debug: true });
   * debugCss`body { margin: 0; }`;
   * ```
   */
  withOptions(options: CssOptions): (strings: TemplateStringsArray, ...values: TemplateValue[]) => CssTemplate;
}

/**
 * Tagged template helper for typed CSS fragments.
 *
 * @param strings - Template literal string parts supplied by JavaScript.
 * @param values - Interpolation values rendered into the final CSS source.
 * @returns An immutable CSS template object with string and DOM helpers.
 *
 * @remarks
 * The helper preserves source text, normalizes `null` and `undefined`
 * interpolations to empty strings, and keeps debug logging opt-in via
 * `withOptions({ debug: true })`.
 *
 * @example
 * ```ts
 * import { css } from '@rodkisten/fabrica';
 *
 * const fragment = css`body { margin: 0; }`;
 * console.log(fragment.source);
 * ```
 */
export const css: CssTag = Object.assign(
  (strings: TemplateStringsArray, ...values: TemplateValue[]): CssTemplate =>
    createCssTemplate(strings, values, {}),
  {
    withOptions: (options: CssOptions) => {
      return (strings: TemplateStringsArray, ...values: TemplateValue[]): CssTemplate =>
        createCssTemplate(strings, values, options);
    },
  },
);

function createCssTemplate(
  strings: TemplateStringsArray,
  values: readonly TemplateValue[],
  options: CssOptions,
): CssTemplate {
  const template = createTemplate({
    debug: options.debug ?? false,
    kind: CSS_TEMPLATE_KIND,
    strings,
    values,
  });

  return Object.freeze({
    ...template,
    toStyleElement() {
      const element = document.createElement('style');
      element.textContent = template.source;
      return element;
    },
  });
}
