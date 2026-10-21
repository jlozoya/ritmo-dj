import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL('https://ritmo-live-fernando.neatloon16.chatgpt.site'),
  applicationName: 'Ritmo DJ',
  title: {
    default: 'Ritmo DJ · Peticiones de canciones',
    template: '%s · Ritmo DJ',
  },
  description:
    'Selecciona canciones en Spotify y envía peticiones al DJ mediante el enlace o QR de su evento.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: {
      url: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Ritmo DJ',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'Ritmo DJ',
    title: 'Ritmo DJ · Peticiones de canciones',
    description:
      'Pide canciones de Spotify al DJ desde el enlace o QR del evento.',
    images: [
      {
        url: '/social-preview.png',
        width: 1200,
        height: 630,
        alt: 'Ritmo DJ · Peticiones de canciones por QR',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ritmo DJ · Peticiones de canciones',
    description:
      'Pide canciones de Spotify al DJ desde el enlace o QR del evento.',
    images: ['/social-preview.png'],
  },
};
export const viewport: Viewport = {
  themeColor: '#0d0e12',
  colorScheme: 'dark',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
