import { ArrowUpRight, Heart } from 'lucide-react';
import { parseTipLink } from '../lib/tip-link';
import { getClientId } from '@/features/requests/lib/client-id';

export function GuestTipCard({
  eventId,
  tipUrl,
}: {
  eventId: string;
  tipUrl: string | null;
}) {
  const link = tipUrl ? parseTipLink(tipUrl) : null;
  if (!link) return null;

  function recordOpening() {
    try {
      // Keep the native link immediate; a tracking failure must never block payment.
      void fetch(`/api/event/${encodeURIComponent(eventId)}/tip-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: getClientId() }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // The payment link remains usable even when browser storage/crypto fails.
    }
  }
  return (
    <section className="guest-tip-card" aria-label="Propina al DJ">
      <div className="tip-heading">
        <span className="tip-icon" aria-hidden="true">
          <Heart size={21} />
        </span>
        <div>
          <h2>Propina al DJ</h2>
          <p>El pago se completa en {link.label}.</p>
        </div>
      </div>
      <a
        className="tip-pay-link"
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={recordOpening}
        onAuxClick={(event) => {
          if (event.button === 1) recordOpening();
        }}
        aria-label={`Dejar propina con ${link.label} (se abre en otra pestaña)`}
      >
        Dejar propina <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </section>
  );
}
