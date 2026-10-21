import { DJSessionGate } from '@/features/auth/components/session-gate';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Perfil',
  description:
    'Configura tu nombre de DJ y la contraseña de tu cuenta de Ritmo.',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <DJSessionGate view="profile" />;
}
