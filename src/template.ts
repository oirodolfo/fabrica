const TEMPLATE_PART_SEPARATOR = '';
const DEBUG_PREFIX = '[fabrica]';

/* ────────────────────────────────────────────────────────────────────────── *\
 * Shared runtime primitives
\* ────────────────────────────────────────────────────────────────────────── */

/**
 * Values accepted by fabrica tagged template helpers.
 *
 * @remarks
 * The runtime accepts the same broad value range JavaScript template literals
 * support while making `null` and `undefined` render as empty strings. This is
 * useful for conditional fragments without leaking implementation details into
 * generated HTML or CSS text.
 *
 * @example
 * ```ts
 * import { html } from '@rodkisten/fabrica';
 *
 * const visible = true;
 * const view = html`<p>${visible ? 'Shown' : undefined}</p>`;
 * console.log(view.toString());
 * ```
 */
export type TemplateValue = string | number | boolean | bigint | null | undefined;

/**
 * Immutable metadata returned by every fabrica tagged template helper.
 *
 * @remarks
 * `FabricaTemplate` keeps the original literal parts and interpolation values
 * for tooling while exposing a stable string representation for runtime use.
 * The object is frozen so consumers can safely cache and pass it across module
 * boundaries without accidental mutation.
 *
 * @example
 * ```ts
 * import { css } from '@rodkisten/fabrica';
 *
 * const styles = css`.card { color: ${'rebeccapurple'}; }`;
 * console.log(styles.kind);
 * console.log(styles.toString());
 * ```
 */
export interface FabricaTemplate<TemplateKind extends string> {
  /** The semantic kind of template represented by this object. */
  readonly kind: TemplateKind;
  /** The raw template literal string parts. */
  readonly strings: readonly string[];
  /** The original interpolation values passed to the tag. */
  readonly values: readonly TemplateValue[];
  /** The rendered template source with normalized interpolation values. */
  readonly source: string;
  /**
   * Returns the rendered template source.
   *
   * @returns The immutable `source` string for this template.
   *
   * @example
   * ```ts
   * import { html } from '@rodkisten/fabrica';
   *
   * console.log(String(html`<strong>${'Ready'}</strong>`));
   * ```
   */
  toString(): string;
}

interface CreateTemplateOptions<TemplateKind extends string> {
  readonly debug: boolean;
  readonly kind: TemplateKind;
  readonly strings: TemplateStringsArray;
  readonly values: readonly TemplateValue[];
}

export function createTemplate<TemplateKind extends string>({
  debug,
  kind,
  strings,
  values,
}: CreateTemplateOptions<TemplateKind>): FabricaTemplate<TemplateKind> {
  const source = joinTemplate(strings, values);
  const template: FabricaTemplate<TemplateKind> = {
    kind,
    strings: Object.freeze([...strings]),
    values: Object.freeze([...values]),
    source,
    toString() {
      return source;
    },
  };

  if (debug) {
    console.debug(`${DEBUG_PREFIX} created ${kind} template`, { source });
  }

  return Object.freeze(template);
}

function joinTemplate(strings: TemplateStringsArray, values: readonly TemplateValue[]): string {
  return strings.reduce((source, part, index) => {
    const value = values[index];
    const renderedValue = value === null || value === undefined ? TEMPLATE_PART_SEPARATOR : String(value);
    return `${source}${part}${renderedValue}`;
  }, TEMPLATE_PART_SEPARATOR);
}
