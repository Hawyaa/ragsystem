import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Customer_Support',
  description: 'Intelligent customer support system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
