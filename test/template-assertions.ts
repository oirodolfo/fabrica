import { expect } from 'vitest';

import type { FabricaTemplate } from '../src/index.js';

export function expectImmutableTemplate<TemplateKind extends string>(
  template: FabricaTemplate<TemplateKind>,
  expectedKind: TemplateKind,
  expectedSource: string,
): void {
  expect(template.kind).toBe(expectedKind);
  expect(template.source).toBe(expectedSource);
  expect(template.toString()).toBe(expectedSource);
  expect(Object.isFrozen(template)).toBe(true);
  expect(Object.isFrozen(template.strings)).toBe(true);
  expect(Object.isFrozen(template.values)).toBe(true);
}
