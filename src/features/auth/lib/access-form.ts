import { z } from 'zod/v4';

export type AccessMode = 'register' | 'sign-in';
export type AccessField = 'name' | 'email' | 'password' | 'confirmation';
export type AccessErrors = Partial<Record<AccessField, string>>;

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Escribe un correo válido.')
    .max(254),
  password: z
    .string()
    .min(1, 'Escribe tu contraseña.')
    .max(128, 'Usa como máximo 128 caracteres.'),
  name: z.string().default(''),
  confirmation: z.string().default(''),
});

export function parseAccessForm(form: FormData, mode: AccessMode) {
  const schema = credentialsSchema.superRefine((values, context) => {
    if (mode !== 'register') return;
    if (!values.name.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['name'],
        message: 'Escribe tu nombre.',
      });
    }
    if (values.password.length < 8) {
      context.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Usa al menos 8 caracteres.',
      });
    }
    if (values.password !== values.confirmation) {
      context.addIssue({
        code: 'custom',
        path: ['confirmation'],
        message: 'Las contraseñas no coinciden.',
      });
    }
  });
  const result = schema.safeParse({
    email: form.get('email') ?? '',
    password: form.get('password') ?? '',
    name: form.get('name') ?? '',
    confirmation: form.get('password-confirmation') ?? '',
  });
  if (result.success)
    return {
      data: { ...result.data, name: result.data.name.trim() },
      errors: {} as AccessErrors,
    };
  const errors: AccessErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as AccessField;
    errors[field] ??= issue.message;
  }
  return { data: null, errors };
}
