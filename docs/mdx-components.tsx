import { useMDXComponents as getNextraComponents } from 'nextra-theme-docs';

export function useMDXComponents(components = {}) {
  return {
    ...getNextraComponents(),
    ...components,
  };
}
