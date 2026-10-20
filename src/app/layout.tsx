import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Ritmo DJ · Peticiones de canciones',
  description: 'Peticiones de canciones en vivo para tu sesión de DJ',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
