export type TipLink = {
  url: string;
  provider: 'paypal' | 'mercado-pago';
  label: 'PayPal' | 'Mercado Pago';
};

/** Accept payment links, never arbitrary redirects or executable URLs. */
export function parseTipLink(value: string): TipLink | null {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      value.length > 500
    )
      return null;
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/$/, '');
    const paypalName = ['paypal.me', 'www.paypal.me'].includes(host)
      ? /^\/([A-Za-z0-9._-]{1,80})$/.exec(path)?.[1]
      : ['paypal.com', 'www.paypal.com'].includes(host)
        ? /^\/paypalme\/([A-Za-z0-9._-]{1,80})$/.exec(path)?.[1]
        : null;
    if (paypalName)
      return {
        url: `https://paypal.me/${paypalName}`,
        provider: 'paypal',
        label: 'PayPal',
      };
    if (
      (host === 'mpago.la' && /^\/[A-Za-z0-9]{1,80}$/.test(path)) ||
      (host === 'link.mercadopago.com.mx' &&
        /^\/[A-Za-z0-9._-]{1,100}$/.test(path))
    )
      return {
        url: `https://${host}${path}`,
        provider: 'mercado-pago',
        label: 'Mercado Pago',
      };
    return null;
  } catch {
    return null;
  }
}
