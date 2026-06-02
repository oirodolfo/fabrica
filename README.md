# fabrica

[![CI](https://github.com/rodkisten/fabrica/actions/workflows/ci.yml/badge.svg)](https://github.com/rodkisten/fabrica/actions/workflows/ci.yml)

A tiny typed HTML and CSS runtime foundation for TypeScript, published as
`@rodkisten/fabrica`.

## Install

```bash
pnpm add @rodkisten/fabrica
```

## Quick start

```ts
import { css, html } from '@rodkisten/fabrica';

const title = 'Fabrica';
const view = html`<h1>${title}</h1>`;
const styles = css`h1 { color: rebeccapurple; }`;

console.log(view.source); // <h1>Fabrica</h1>
console.log(styles.source); // h1 { color: rebeccapurple; }
```

## API overview

### `html`

Creates an immutable HTML template object.

```ts
import { html } from '@rodkisten/fabrica';

const card = html`<article><h2>${'Hello'}</h2></article>`;
document.body.append(card.toTemplate().content.cloneNode(true));
```

### `css`

Creates an immutable CSS template object.

```ts
import { css } from '@rodkisten/fabrica';

const theme = css`:root { color-scheme: dark; }`;
document.head.append(theme.toStyleElement());
```

## Runtime behavior

- Interpolated values are rendered with `String(value)`.
- `null` and `undefined` render as empty strings.
- Template objects, `strings`, and `values` are frozen.
- Debug logs are opt-in per helper with `withOptions({ debug: true })`.
- Fabrica does not sanitize HTML or validate CSS. Sanitize untrusted input before
  interpolation.

## Scripts

| Script | Description |
| --- | --- |
| `pnpm typecheck` | Runs strict TypeScript checks. |
| `pnpm test` | Runs Vitest with happy-dom. |
| `pnpm build` | Builds ESM, CJS, declarations, and source maps with tsdown. |
| `pnpm docs:generate` | Extracts TSDoc comments and examples into Nextra MDX pages. |
| `pnpm docs:build` | Generates docs and builds the Nextra site. |
| `pnpm coverage` | Runs test coverage. |
| `pnpm release` | Publishes with Changesets in CI. |

## Documentation

The docs app lives in `docs/` and uses Nextra. Generated pages are written to:

- `docs/content/en/api/generated.mdx`
- `docs/content/en/examples/generated.mdx`

Run:

```bash
pnpm docs:generate
pnpm docs:dev
```

## Publishing

Fabrica uses Changesets. Add a changeset with `pnpm changeset`, merge to `main`,
and let the release workflow create a version PR. Merging the version PR publishes
`@rodkisten/fabrica` to npm using the `NPM_TOKEN` GitHub secret.

## License

MIT © Rod Kisten.
