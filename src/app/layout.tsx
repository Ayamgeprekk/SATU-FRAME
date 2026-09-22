import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const displayFont = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Satu Frame: Dua Tempat, Satu Momen',
  description: 'Studio virtual photobooth real-time untuk pasangan LDR dan sahabat. Rasakan sensasi photobox asli berdua dari browser tanpa install aplikasi.',
  icons: {
    icon: '/logo-icon.png',
    shortcut: '/favicon.png',
    apple: '/logo-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`dark ${sansFont.variable} ${displayFont.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
