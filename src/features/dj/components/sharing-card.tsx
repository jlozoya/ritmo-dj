'use client';
import { useRef } from 'react';
import { Button } from 'react-aria-components';
import { QRCodeCanvas } from 'qrcode.react';
import { ArrowUpRight, Copy, Download, Link2 } from 'lucide-react';
import type { EventDetail } from '@/types/music';
import { useOrigin } from '@/hooks/use-origin';

export function SharingCard({
  event,
  onToast,
}: {
  event: EventDetail | null;
  onToast: (message: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const origin = useOrigin();
  const url =
    event && origin ? `${origin}/?evento=${encodeURIComponent(event.id)}` : '';
  const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(
    origin.replace(/^https?:\/\//, ''),
  );

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      onToast('Enlace copiado al portapapeles');
    } catch {
      onToast('Copia el enlace que se muestra debajo del QR.');
    }
  }

  function downloadQR() {
    if (!event || !canvasRef.current) return;
    const anchor = document.createElement('a');
    anchor.href = canvasRef.current.toDataURL('image/png');
    anchor.download = `ritmo-qr-${event.id.slice(0, 8)}.png`;
    anchor.click();
    onToast('Código QR descargado');
  }

  if (!event) return null;
  return (
    <section className="share-card" aria-label="Compartir el evento">
      <h2>Compartir evento</h2>
      {url ? (
        <>
          <div className="qr-box">
            <QRCodeCanvas
              ref={canvasRef}
              value={url}
              size={196}
              bgColor="#ffffff"
              fgColor="#18111f"
              level="M"
              marginSize={2}
              aria-label={`Código QR para acceder a ${event!.name}`}
            />
          </div>
          <div className="share-url" title={url}>
            <Link2 size={15} />
            <span>{url}</span>
          </div>
          <div className="share-actions">
            <Button className="outline" onPress={copyLink}>
              <Copy size={15} />
              Copiar enlace
            </Button>
            <Button className="outline" onPress={downloadQR}>
              <Download size={15} />
              Descargar QR
            </Button>
          </div>
          <a
            className="preview-link"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver página del público <ArrowUpRight size={14} />
          </a>
          {local && (
            <p className="local-warning" role="note">
              No se detectó una IP de red. Conecta el equipo a una red local y
              reinicia el servidor para compartir el QR con otros dispositivos.
            </p>
          )}
        </>
      ) : (
        <div className="link-preview" role="status">
          <Link2 size={18} />
          <span>Generando código QR…</span>
        </div>
      )}
    </section>
  );
}
