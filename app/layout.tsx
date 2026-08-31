import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Prophet — Portfolio Intelligence',
  description: 'Historical market monitoring and AI investment thesis tracking.',
  openGraph: {
    title: 'Prophet — Portfolio Intelligence',
    description: 'Historical market monitoring and AI investment thesis tracking.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Prophet portfolio intelligence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prophet — Portfolio Intelligence',
    description: 'Historical market monitoring and AI investment thesis tracking.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
