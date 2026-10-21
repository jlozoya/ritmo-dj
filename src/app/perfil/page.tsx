import { DJSessionGate } from '@/features/auth/components/session-gate';

export default function ProfilePage() {
  return <DJSessionGate view="profile" />;
}
