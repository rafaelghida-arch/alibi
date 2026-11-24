import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ÁLIBI — casos de investigação',
  description: 'Jogo brasileiro de investigação com casos fictícios, documentos para examinar e uma acusação para sustentar.',
};
export const viewport: Viewport = { themeColor: '#121214', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Special+Elite&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
