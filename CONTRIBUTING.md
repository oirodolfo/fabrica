# Contributing

Thanks for helping improve Fabrica.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm docs:generate
pnpm docs:build
```

## Public API expectations

- Add or update tests whenever behavior changes.
- Keep public APIs documented with TSDoc.
- Include useful `@remarks`, `@param`, `@returns`, and `@example` blocks where
  they apply.
- Keep examples valid TypeScript because `pnpm docs:generate` extracts them into
  the docs site.

## Releases

Fabrica uses Changesets for semantic versioning and changelog generation.

```bash
pnpm changeset
```

Merge the resulting changeset to `main`. The release workflow will create a
version PR or publish the package when the version PR is merged.
