'use client';
import { useState, type FormEvent } from 'react';
import { Button, Input, Label, Text, TextField } from 'react-aria-components';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { DJLayout } from '@/components/dj-layout';
import { authClient } from '@/features/auth/lib/auth-client';
import type { DJUser } from '@/types/music';

export function ProfilePage({
  user,
  onSignOut,
  onSaved,
}: {
  user: DJUser;
  onSignOut: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [changing, setChanging] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setProfileError('');
    setProfileSaved(false);
    if (!name.trim()) {
      setProfileError('Escribe tu nombre de DJ.');
      return;
    }
    setSaving(true);
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) throw new Error();
      setName(name.trim());
      setProfileSaved(true);
      onSaved();
    } catch {
      setProfileError('No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (changing) return;
    setPasswordError('');
    setPasswordSaved(false);
    if (password.length < 8) {
      setPasswordError('Usa al menos 8 caracteres para la nueva contraseña.');
      return;
    }
    if (password !== confirmation) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    setChanging(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword: password,
        revokeOtherSessions: true,
      });
      if (result.error) {
        setPasswordError(
          result.error.code === 'INVALID_PASSWORD'
            ? 'La contraseña actual no es correcta.'
            : 'No se pudo cambiar la contraseña. Comprueba la contraseña actual e intenta de nuevo.',
        );
        return;
      }
      setCurrentPassword('');
      setPassword('');
      setConfirmation('');
      setVisible(false);
      setPasswordSaved(true);
      onSaved();
    } catch {
      setPasswordError('No se pudo conectar. Intenta de nuevo.');
    } finally {
      setChanging(false);
    }
  }

  return (
    <DJLayout user={user} onSignOut={onSignOut} active="profile">
      <main className="profile-main">
        <div className="title-row">
          <h1>Perfil</h1>
        </div>
        <div className="profile-grid">
          <section
            className="profile-card"
            aria-labelledby="profile-data-title"
          >
            <h2 id="profile-data-title">
              <UserRound size={19} />
              Datos de la cuenta
            </h2>
            <form onSubmit={saveProfile}>
              <TextField
                value={name}
                onChange={(value) => {
                  setName(value);
                  setProfileSaved(false);
                }}
                isRequired
                isDisabled={saving}
              >
                <Label>Nombre del DJ</Label>
                <Input maxLength={80} autoComplete="nickname" />
              </TextField>
              <TextField value={user.email} isReadOnly>
                <Label>Correo electrónico</Label>
                <Input type="email" autoComplete="username" />
                <Text slot="description">
                  Correo asociado al inicio de sesión.
                </Text>
              </TextField>
              {profileError && (
                <p className="tip-error" role="alert">
                  {profileError}
                </p>
              )}
              {profileSaved && (
                <p className="tip-saved" role="status">
                  Perfil guardado
                </p>
              )}
              <Button
                type="submit"
                className="primary"
                isDisabled={saving || name.trim() === user.name}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </form>
          </section>
          <section
            className="profile-card"
            aria-labelledby="profile-password-title"
          >
            <h2 id="profile-password-title">
              <LockKeyhole size={19} />
              Cambiar contraseña
            </h2>
            <form onSubmit={changePassword}>
              <TextField
                type={visible ? 'text' : 'password'}
                value={currentPassword}
                onChange={setCurrentPassword}
                isRequired
                isDisabled={changing}
              >
                <Label>Contraseña actual</Label>
                <Input maxLength={128} autoComplete="current-password" />
              </TextField>
              <TextField
                type={visible ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                isRequired
                isDisabled={changing}
              >
                <Label>Nueva contraseña</Label>
                <Input
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <Text slot="description">
                  Al menos 8 caracteres. Se cerrarán las sesiones de otros
                  dispositivos.
                </Text>
              </TextField>
              <TextField
                type={visible ? 'text' : 'password'}
                value={confirmation}
                onChange={setConfirmation}
                isRequired
                isDisabled={changing}
              >
                <Label>Confirmar nueva contraseña</Label>
                <Input
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </TextField>
              <Button
                className="password-visibility"
                type="button"
                onPress={() => setVisible((previous) => !previous)}
                aria-pressed={visible}
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}{' '}
                {visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
              </Button>
              {passwordError && (
                <p className="tip-error" role="alert">
                  {passwordError}
                </p>
              )}
              {passwordSaved && (
                <p className="tip-saved" role="status">
                  Contraseña actualizada
                </p>
              )}
              <Button type="submit" className="primary" isDisabled={changing}>
                {changing ? 'Actualizando…' : 'Actualizar contraseña'}
              </Button>
            </form>
          </section>
        </div>
      </main>
    </DJLayout>
  );
}
