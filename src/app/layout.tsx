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
      <body>{children}</body>
    </html>
  );
}
