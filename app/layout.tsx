import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import '@/components/editor.css';
import Navbar from '@/components/Navbar';
import { Toaster } from 'react-hot-toast';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Blog_lhabsa - Stories Worth Reading',
  description: 'A premium personal blog platform for writers and creators',
  keywords: ['blog', 'writing', 'stories', 'articles'],
  openGraph: {
    title: 'Blog_lhabsa - Stories Worth Reading',
    description: 'A premium personal blog platform for writers and creators',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${playfair.variable} ${inter.variable} font-inter bg-[#0F0F0F] text-[#EAEAEA] antialiased`}
      >
        <Navbar />
        <main>{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
