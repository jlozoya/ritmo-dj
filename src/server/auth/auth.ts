import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from 'cloudflare:workers';
import { getDb } from '@/server/db';
import * as schema from '@/server/db/schema';

export function getAuth() {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      'Configura BETTER_AUTH_SECRET para habilitar las cuentas de DJ.',
    );
  }
  const baseURL =
    env.BETTER_AUTH_URL?.trim() ||
    (import.meta.env.DEV
      ? {
          allowedHosts: [
            'localhost:*',
            '127.0.0.1:*',
            ...__DEV_LAN_HOSTS__.map((host) => `${host}:*`),
          ],
          fallback: 'http://127.0.0.1:5173',
          protocol: 'http' as const,
        }
      : undefined);
  if (!baseURL)
    throw new Error(
      'Configura BETTER_AUTH_URL con la URL pública de Ritmo DJ.',
    );

  return betterAuth({
    appName: 'Ritmo DJ',
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    database: drizzleAdapter(getDb(), {
      provider: 'sqlite',
      schema,
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 3 },
      },
    },
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
  });
}
