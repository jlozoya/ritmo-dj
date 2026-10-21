import { ArrowUpRight, Heart } from 'lucide-react';
import { parseTipLink } from '../lib/tip-link';

export function GuestTipCard({ tipUrl }: { tipUrl: string | null }) {
  const link = tipUrl ? parseTipLink(tipUrl) : null;
  if (!link) return null;
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
        aria-label={`Dejar propina con ${link.label} (se abre en otra pestaña)`}
      >
        Dejar propina <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </section>
  );
}
