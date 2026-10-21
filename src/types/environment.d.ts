/** Local interface addresses, supplied only by the development server. */
declare const __DEV_LAN_HOSTS__: string[];

declare namespace Cloudflare {
  interface Env {
    ABLY_API_KEY?: string;
  }
}
