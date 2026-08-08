import type { Metadata } from 'next';
import Link from 'next/link';

import { ProjectLink } from '@/components/project-link';
import { SiteFooter } from '@/components/site-footer';
import { buildPageMetadata, siteDescription, siteName, siteUrl, socialCard } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Search-first redirect management',
  description: siteDescription,
  canonicalPath: '/',
});

const principles = [
  {
    key: 'search',
    title: 'Search first',
    description:
      'Find redirects, destinations, and application actions from one keyboard- and touch-friendly workspace.',
  },
  {
    key: 'drift',
    title: (
      <>
        <ProjectLink name="Drift" /> stays authoritative
      </>
    ),
    description: (
      <>
        Durable records remain tenant-scoped in <ProjectLink name="Drift" /> while Beacon keeps only
        rebuildable read projections.
      </>
    ),
  },
  {
    key: 'compactor',
    title: (
      <>
        Execution stays with <ProjectLink name="Compactor" />
      </>
    ),
    description: (
      <>
        Beacon manages definitions and events without pretending to own redirect traffic or cache
        policy.
      </>
    ),
  },
] as const;

const paths = [
  {
    title: 'Tutorial',
    description: (
      <>
        Connect <ProjectLink name="Drift" />, run Beacon locally, and create a first redirect.
      </>
    ),
    href: '/docs/tutorial',
  },
  {
    title: 'How-to',
    description: 'Deploy the complete stack and operate its credentials and projections.',
    href: '/docs/how-to',
  },
  {
    title: 'Explanation',
    description: 'Understand authority, caching, authentication, and disposable read models.',
    href: '/docs/explanation',
  },
  {
    title: 'Reference',
    description: (
      <>
        Check management routes, <ProjectLink name="Compactor" /> contracts, and environment
        variables.
      </>
    ),
    href: '/docs/reference',
  },
] as const;

const workflows = [
  {
    title: 'Redirects and destinations',
    description:
      'Manage branded paths, reuse destinations deliberately, and preserve explicit lifecycle choices.',
  },
  {
    title: 'QR export and sharing',
    description:
      'Export a redirect as a QR code without introducing a second source of redirect truth.',
  },
  {
    title: 'Activity and reports',
    description:
      'Review management changes and best-effort redirect events as operational history, not billing data.',
  },
] as const;

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteName,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  description: siteDescription,
  url: siteUrl,
  image: new URL(socialCard.url, siteUrl).toString(),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="landing" id="main">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Search-first redirect management</span>
            <h1>Beacon</h1>
            <p className="lede">
              A calm, focused place to create, find, change, and review redirects.
            </p>
            <div className="actions">
              <Link className="button primary" href="/docs/tutorial">
                Start with the tutorial
              </Link>
              <Link className="button secondary" href="/docs/reference/api">
                See the API
              </Link>
            </div>
          </div>

          <aside className="hero-panel" aria-label="What Beacon gives you">
            <div className="hero-mark" aria-hidden="true">
              <img src="/beacon-mark.svg" alt="" width={156} height={156} />
            </div>
            <div className="hero-panel-card">
              <strong>One clear management surface</strong>
              <p>
                Search, edit, disable, archive, and review without turning work into a dashboard.
              </p>
            </div>
            <div className="hero-panel-card">
              <strong>Honest system boundaries</strong>
              <p>
                <ProjectLink name="Drift" /> owns durable state. <ProjectLink name="Compactor" />{' '}
                owns execution. Beacon keeps the workflow clear.
              </p>
            </div>
            <div className="hero-panel-card">
              <strong>Propagation you can account for</strong>
              <p>
                Changes can remain cached for 30 seconds, and the interface does not imply
                otherwise.
              </p>
            </div>
          </aside>
        </section>

        <section className="section" aria-labelledby="principles-heading">
          <div className="section-heading">
            <p className="eyebrow">Focused by design</p>
            <h2 id="principles-heading">Redirect work, kept understandable</h2>
            <p>
              Beacon concentrates on management workflows and leaves persistence and execution with
              the systems that own them.
            </p>
          </div>
          <div className="card-grid">
            {principles.map((principle) => (
              <article className="info-card" key={principle.key}>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="why-heading">
          <div className="section-heading">
            <p className="eyebrow">Why it exists</p>
            <h2 id="why-heading">A management surface, not the redirect runtime</h2>
            <p>
              Redirects need deliberate editing, reusable destinations, lifecycle controls, and
              enough operational history to understand changes. The management application does not
              need to become the traffic engine or the system of record.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="docs-heading">
          <div className="section-heading">
            <p className="eyebrow">Guides &amp; reference</p>
            <h2 id="docs-heading">Choose your path</h2>
            <p>Learn, operate, look up, or understand Beacon without mixing those jobs together.</p>
          </div>
          <div className="path-grid">
            {paths.map((path) => (
              <article className="path-card" key={path.title}>
                <h3>{path.title}</h3>
                <p>{path.description}</p>
                <Link href={path.href}>Open {path.title.toLowerCase()}</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="fits-heading">
          <div className="section-heading">
            <p className="eyebrow">What it fits</p>
            <h2 id="fits-heading">The redirect workflows teams repeat</h2>
          </div>
          <div className="story-grid">
            {workflows.map((workflow) => (
              <article className="story-card" key={workflow.title}>
                <h3>{workflow.title}</h3>
                <p>{workflow.description}</p>
              </article>
            ))}
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
