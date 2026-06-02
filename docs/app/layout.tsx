import type { Metadata } from 'next';
import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import 'nextra-theme-docs/style.css';

export const metadata: Metadata = {
  title: {
    default: 'Fabrica',
    template: '%s · Fabrica',
  },
  description: 'A tiny typed HTML and CSS runtime foundation for TypeScript.',
  metadataBase: new URL('https://fabrica.rodkisten.com'),
};

const navbar = <Navbar logo={<strong>fabrica</strong>} projectLink="https://github.com/rodkisten/fabrica" />;
const footer = <Footer>MIT © {new Date().getFullYear()} Rod Kisten.</Footer>;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsEnabled = process.env.NEXT_PUBLIC_FABRICA_DOCS_ANALYTICS === 'true';

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
        {analyticsEnabled ? <meta name="fabrica-docs-analytics" content="enabled" /> : null}
      </Head>
      <body>
        <Layout
          docsRepositoryBase="https://github.com/rodkisten/fabrica/tree/main/docs"
          editLink="Edit this page"
          feedback={{ content: 'Question? Give us feedback' }}
          footer={footer}
          navbar={navbar}
          pageMap={await getPageMap()}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
