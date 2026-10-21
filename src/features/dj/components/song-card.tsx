'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from 'react-aria-components';
import {
  ArrowUpRight,
  Check,
  Clock3,
  Heart,
  LoaderCircle,
  Music2,
  Play,
  Undo2,
  UserRound,
  X,
} from 'lucide-react';
import type { SongRequest, RequestStatus } from '@/types/music';

export function SongCard({
  song,
  index,
  onUpdate,
  isUpdating = false,
}: {
  song: SongRequest;
  index: number;
  onUpdate: (id: string, status: RequestStatus) => void;
  isUpdating?: boolean;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const created = new Date(song.created);
  return (
    <article
      className="song"
      data-status={song.status}
      aria-label={`${song.title}, ${song.artist}`}
      aria-busy={isUpdating}
    >
      <div className="song-body">
        <div className="song-heading">
          {song.image && song.image !== failedImage ? (
            <Image
              className="song-cover"
              src={song.image}
              alt=""
              width={64}
              height={64}
              unoptimized
              onError={() => setFailedImage(song.image)}
            />
          ) : (
            <div className={`song-cover color-${index % 4}`} aria-hidden="true">
              <Music2 size={26} />
            </div>
          )}
          <div className="song-info">
            <h3>{song.title}</h3>
            <p className="song-artist">{song.artist}</p>
            <div className="song-meta">
              <span>
                <UserRound size={13} aria-hidden="true" />
                {song.guest}
              </span>
              <time
                dateTime={song.created}
                title={created.toLocaleString('es-MX')}
              >
                <Clock3 size={13} aria-hidden="true" />
                {created.toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
            {song.tipOpened && (
              <span
                className="song-tip-indicator"
                title="Registramos el clic; el pago no está confirmado."
              >
                <Heart size={13} aria-hidden="true" /> Abrió enlace de propina
              </span>
            )}
          </div>
        </div>
        {song.message && (
          <blockquote className="song-message">{song.message}</blockquote>
        )}
      </div>
      <div className="song-footer">
        {song.spotify && (
          <a
            className="song-spotify"
            href={song.spotify}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en Spotify <ArrowUpRight size={14} />
          </a>
        )}
        {isUpdating && (
          <span className="song-saving" role="status">
            <LoaderCircle className="song-spinner" size={14} /> Guardando…
          </span>
        )}
        <div
          className="song-actions"
          role="group"
          aria-label={`Acciones para ${song.title}`}
        >
          {song.status === 'pending' && (
            <>
              <Button
                aria-label={`Aceptar ${song.title}`}
                className="song-accept"
                isDisabled={isUpdating}
                onPress={() => onUpdate(song.id, 'accepted')}
              >
                <Check size={16} />
                Aceptar
              </Button>
              <Button
                aria-label={`Descartar ${song.title}`}
                className="song-reject"
                isDisabled={isUpdating}
                onPress={() => onUpdate(song.id, 'rejected')}
              >
                <X size={16} /> Descartar
              </Button>
            </>
          )}
          {song.status === 'accepted' && (
            <Button
              aria-label={`Marcar ${song.title} como tocada`}
              className="song-accept"
              isDisabled={isUpdating}
              onPress={() => onUpdate(song.id, 'played')}
            >
              <Play size={16} />
              Marcar tocada
            </Button>
          )}
          {(song.status === 'played' || song.status === 'rejected') && (
            <Button
              aria-label={`Volver ${song.title} a pendientes`}
              className="song-restore"
              isDisabled={isUpdating}
              onPress={() => onUpdate(song.id, 'pending')}
            >
              <Undo2 size={16} />
              Volver a pendientes
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
