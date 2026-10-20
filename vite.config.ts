import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';
import localDatabaseConfig from './wrangler.local.json';
import { readExecutionProfile } from './scripts/execution-profile.mjs';
import { getLocalNetworkHosts } from './scripts/local-network.mjs';
import { sites } from './infrastructure/sites/sites-vite-plugin';
import { connectorPreview } from './infrastructure/sites/connector-preview-plugin.mjs';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';
const managedLinux = readExecutionProfile() === 'managed-linux';

const localBindingConfig = {
  main: './infrastructure/sites/sites-worker.ts',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          ...localDatabaseConfig.d1_databases[0],
          binding: d1,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async ({ command }) => {
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= 'false';
  process.env.WRANGLER_SEND_METRICS ??= 'false';

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.WRANGLER_REGISTRY_PATH ??= '.wrangler/dev-registry';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    // Keep Zod 3 (legacy tools) and Zod 4 (Better Auth) resolved per importer.
    // A single optimized bare "zod" entry can incorrectly replace the other version.
    optimizeDeps: { exclude: ['zod', 'zod/v4'] },
    define: {
      __DEV_LAN_HOSTS__: JSON.stringify(
        command === 'serve' && !managedLinux ? getLocalNetworkHosts() : [],
      ),
    },
    environments: {
      rsc: { optimizeDeps: { exclude: ['zod', 'zod/v4'] } },
      ssr: { optimizeDeps: { exclude: ['zod', 'zod/v4'] } },
    },
    server: {
      host: '0.0.0.0',
      ...(managedLinux
        ? { host: '0.0.0.0', allowedHosts: ['terminal.local'] }
        : {}),
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      sites({ mockAuth: false }),
      connectorPreview(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        inspectorPort: false,
        config: {
          ...localBindingConfig,
          ...(command === 'serve'
            ? {
                services: [
                  {
                    binding: 'CONNECTORS',
                    service: 'sites-connector-preview',
                    entrypoint: 'ConnectorPreview',
                  },
                ],
              }
            : {}),
        },
        ...(command === 'serve'
          ? {
              auxiliaryWorkers: [
                {
                  config: {
                    name: 'sites-connector-preview',
                    main: './infrastructure/sites/connector-preview-worker.mjs',
                    compatibility_date: '2026-05-15',
                  },
                },
              ],
            }
          : {}),
      }),
    ],
  };
});
