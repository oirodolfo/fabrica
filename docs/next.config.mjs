import nextra from 'nextra';

const withNextra = nextra({
  contentDirBasePath: '/',
});

export default withNextra({
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  env: {
    NEXT_PUBLIC_FABRICA_DOCS_ANALYTICS: process.env.NEXT_PUBLIC_FABRICA_DOCS_ANALYTICS ?? 'false',
  },
});
