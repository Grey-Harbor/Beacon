import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-links" aria-label="Related links">
        <Link href="/docs/how-to/self-hosting">Deploy Beacon with Compose</Link>
        <a href="https://github.com/Grey-Harbor/Beacon" target="_blank" rel="noreferrer">
          GitHub repository
        </a>
        <a href="https://www.greyharborsoftware.com" target="_blank" rel="noreferrer">
          Grey Harbor Software
        </a>
      </div>
      <p>&copy; {new Date().getFullYear()} Grey Harbor Software. All rights reserved.</p>
    </footer>
  );
}
