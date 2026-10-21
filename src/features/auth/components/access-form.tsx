'use client';

import { useState, type FormEvent } from 'react';
import {
  Button,
  FieldError,
  Input,
  Label,
  Text,
  TextField,
} from 'react-aria-components';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { FieldInput } from '@/components/field-input';
import { authClient } from '@/features/auth/lib/auth-client';
import { parseAccessForm, type AccessErrors } from '../lib/access-form';
import { Brand } from '@/components/brand';

function authError(code?: string, status?: number) {
  if (status === 429)
    return 'Demasiados intentos. Espera un minuto y vuelve a intentar.';
  switch (code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
    case 'INVALID_PASSWORD':
      return 'El correo o la contraseña no son correctos.';
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return 'Ya existe una cuenta con ese correo. Inicia sesión.';
    case 'INVALID_EMAIL':
      return 'Escribe un correo válido.';
    case 'PASSWORD_TOO_SHORT':
      return 'Usa una contraseña de al menos 8 caracteres.';
    case 'PASSWORD_TOO_LONG':
      return 'La contraseña debe tener como máximo 128 caracteres.';
    default:
      return 'No se pudo completar el acceso. Intenta de nuevo.';
  }
}

export function DJAccessForm({
  onAuthenticated,
  sessionError,
  onRetry,
}: {
  onAuthenticated: () => Promise<unknown>;
  sessionError?: boolean;
  onRetry: () => void;
}) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AccessErrors>({});

  function switchMode(value: boolean) {
    setRegister(value);
    setError('');
    setFieldErrors({});
    setPassword('');
    setConfirmation('');
    setVisible(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // FormData reads the visible fields, including values filled by password managers.
    const { data, errors } = parseAccessForm(
      new FormData(event.currentTarget),
      register ? 'register' : 'sign-in',
    );
    setFieldErrors(errors);
    if (!data) return;
    setBusy(true);
    setError('');
    try {
      const credentials = { email: data.email, password: data.password };
      const result = register
        ? await authClient.signUp.email({ ...credentials, name: data.name })
        : await authClient.signIn.email(credentials);
      if (result.error) {
        setError(authError(result.error.code, result.error.status));
        return;
      }
      setPassword('');
      setConfirmation('');
      await onAuthenticated();
    } catch {
      setError('No se pudo conectar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand />
      </header>
      <main className="auth-main">
        <h1>{register ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
        <div className="auth-modes" role="group" aria-label="Tipo de acceso">
          <Button
            aria-pressed={!register}
            isDisabled={busy}
            onPress={() => switchMode(false)}
          >
            Iniciar sesión
          </Button>
          <Button
            aria-pressed={register}
            isDisabled={busy}
            onPress={() => switchMode(true)}
          >
            Crear cuenta
          </Button>
        </div>
        {sessionError && (
          <div className="error" role="alert">
            No se pudo comprobar tu sesión.
            <Button onPress={onRetry}>Reintentar</Button>
          </div>
        )}
        <form
          className="auth-form"
          onSubmit={submit}
          aria-busy={busy}
          noValidate
        >
          {register && (
            <TextField
              isRequired
              value={name}
              onChange={setName}
              isDisabled={busy}
              validationBehavior="aria"
              isInvalid={Boolean(fieldErrors.name)}
            >
              <Label>Nombre del DJ</Label>
              <FieldInput icon={UserRound}>
                <Input
                  name="name"
                  autoComplete="nickname"
                  maxLength={80}
                  placeholder="Ej. DJ Fernando"
                />
              </FieldInput>
              <FieldError>{fieldErrors.name}</FieldError>
            </TextField>
          )}
          <TextField
            isRequired
            type="email"
            value={email}
            onChange={setEmail}
            isDisabled={busy}
            validationBehavior="aria"
            isInvalid={Boolean(fieldErrors.email)}
          >
            <Label>Correo electrónico</Label>
            <FieldInput icon={Mail}>
              <Input
                name="email"
                autoComplete={register ? 'email' : 'username'}
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                placeholder="tu@correo.com"
              />
            </FieldInput>
            <FieldError>{fieldErrors.email}</FieldError>
          </TextField>
          <TextField
            isRequired
            type={visible ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            isDisabled={busy}
            validationBehavior="aria"
            isInvalid={Boolean(fieldErrors.password)}
          >
            <Label>Contraseña</Label>
            <FieldInput icon={LockKeyhole} className="password-field">
              <Input
                name="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                minLength={register ? 8 : undefined}
                maxLength={128}
              />
              <Button
                className="password-toggle"
                aria-label={
                  visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
                aria-pressed={visible}
                onPress={() => setVisible((value) => !value)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </FieldInput>
            {register && !fieldErrors.password && (
              <Text className="field-help" slot="description">
                Entre 8 y 128 caracteres.
              </Text>
            )}
            <FieldError>{fieldErrors.password}</FieldError>
          </TextField>
          {register && (
            <TextField
              isRequired
              type={visible ? 'text' : 'password'}
              value={confirmation}
              onChange={setConfirmation}
              isDisabled={busy}
              validationBehavior="aria"
              isInvalid={Boolean(fieldErrors.confirmation)}
            >
              <Label>Confirmar contraseña</Label>
              <FieldInput icon={ShieldCheck}>
                <Input
                  name="password-confirmation"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  placeholder="Repite la contraseña"
                />
              </FieldInput>
              <FieldError>{fieldErrors.confirmation}</FieldError>
            </TextField>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button className="primary wide" type="submit" isDisabled={busy}>
            {busy
              ? 'Espera un momento…'
              : register
                ? 'Crear cuenta'
                : 'Iniciar sesión'}
            <ArrowRight size={18} />
          </Button>
        </form>
      </main>
    </div>
  );
}
