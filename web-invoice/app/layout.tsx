import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TLC Landscape — Invoice',
  description: 'View your TLC Landscape invoice',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
