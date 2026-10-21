'use client';
import { useCallback, useState } from 'react';
import { authClient } from '../lib/auth-client';
import { DJAccessForm } from './access-form';
import { DJDashboard } from '@/features/dj/dj-dashboard';
import { LoadingState } from '@/components/loading-state';
import { ProfilePage } from '@/features/profile/profile-page';

export function DJSessionGate({
  view = 'dashboard',
}: {
  view?: 'dashboard' | 'profile';
}) {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const [signOutError, setSignOutError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const checkSession = useCallback(() => {
    void refetch();
  }, [refetch]);

  async function signOut() {
    setSigningOut(true);
    setSignOutError('');
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      window.localStorage.removeItem('ritmo-active-event');
      await refetch();
    } catch {
      setSignOutError('No se pudo cerrar la sesión. Intenta de nuevo.');
    } finally {
      setSigningOut(false);
    }
  }

  if (isPending || signingOut)
    return (
      <LoadingState
        fullScreen
        message={signingOut ? 'Cerrando sesión…' : 'Comprobando sesión…'}
      />
    );
  if (!session)
    return (
      <DJAccessForm
        onAuthenticated={refetch}
        sessionError={Boolean(error)}
        onRetry={checkSession}
      />
    );
  return (
    <>
      {signOutError && (
        <div className="toast" role="alert">
          {signOutError}
        </div>
      )}
      {view === 'profile' ? (
        <ProfilePage
          user={session.user}
          onSignOut={signOut}
          onSaved={checkSession}
        />
      ) : (
        <DJDashboard
          key={session.user.id}
          user={session.user}
          onSignOut={signOut}
          onSessionCheck={checkSession}
        />
      )}
    </>
  );
}
