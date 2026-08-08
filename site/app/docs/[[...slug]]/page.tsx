import type { Metadata } from 'next';

import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsTitle } from 'fumadocs-ui/page';

import { SiteFooter } from '@/components/site-footer';
import { getDocDescription, getDocPage, getDocParams, routeFromSlug } from '@/lib/docs';
import { titleForDoc } from '@/lib/format';
import { buildPageMetadata } from '@/lib/seo';

interface DocsPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

const docsIndexDescription =
  'Browse Beacon tutorials, how-to guides, API reference, and explanations for redirect management.';

const docsIndexKeywords = [
  'Beacon documentation',
  'Beacon redirect management tutorial',
  'Beacon API reference',
  'redirect management guides',
  'Compactor integration',
] as const;

export function generateStaticParams() {
  return getDocParams();
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getDocPage(slug);

  if (!page) {
    return {};
  }

  const title = page.title ?? titleForDoc(page.filePath.replace(/\.md$/, ''), 'Documentation');
  const isDocsIndex = (slug ?? []).length === 0;
  const description = isDocsIndex ? docsIndexDescription : page.description;
  const metadata = buildPageMetadata({
    title,
    description,
    canonicalPath: routeFromSlug(slug ?? []),
  });

  if (isDocsIndex) {
    metadata.keywords = [...docsIndexKeywords];
  }

  return metadata;
}

export default async function DocsPageRoute({ params }: DocsPageProps) {
  const { slug } = await params;
  const page = getDocPage(slug);

  if (!page) {
    notFound();
  }

  const title = page.title ?? titleForDoc(page.filePath.replace(/\.md$/, ''), 'Documentation');
  const description = getDocDescription(slug);

  return (
    <>
      <main className="docs-shell" id="main">
        <div className="docs-frame">
          {page.toc.length > 0 ? (
            <details className="docs-toc-mobile">
              <summary>On this page</summary>
              <nav>
                {page.toc.map((item) => (
                  <a className={`toc-depth-${item.depth}`} href={item.url} key={item.url}>
                    {item.title}
                  </a>
                ))}
              </nav>
            </details>
          ) : null}
          <div className="docs-root">
            <article className="docs-article">
              <DocsTitle>{title}</DocsTitle>
              {description ? <DocsDescription>{description}</DocsDescription> : null}
              <DocsBody>{page.body}</DocsBody>
            </article>
            {page.toc.length > 0 ? (
              <aside className="docs-toc" aria-label="On this page">
                <h2>On this page</h2>
                <nav>
                  {page.toc.map((item) => (
                    <a className={`toc-depth-${item.depth}`} href={item.url} key={item.url}>
                      {item.title}
                    </a>
                  ))}
                </nav>
              </aside>
            ) : null}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
