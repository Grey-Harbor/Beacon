import type { Metadata, Viewport } from 'next';
import '../src/styles.css';

export const metadata: Metadata = {
  title: 'Beacon',
  description: 'A calm place to manage redirect infrastructure.',
  icons: {
    icon: '/beacon-mark.svg',
    shortcut: '/beacon-mark.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e8ede6',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
