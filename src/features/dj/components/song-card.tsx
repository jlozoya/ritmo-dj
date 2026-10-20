'use client';
import { Button } from 'react-aria-components';
import { Check, Music2, Play, X } from 'lucide-react';
import type { SongRequest, RequestStatus } from '@/types/music';

export function SongCard({
  song,
  index,
  onUpdate,
}: {
  song: SongRequest;
  index: number;
  onUpdate: (id: string, status: RequestStatus) => void;
}) {
  return (
    <article className="song">
      <div className={`song-cover color-${index % 4}`} aria-hidden="true">
        <Music2 size={22} />
      </div>
      <div className="song-info">
        <h3>{song.title}</h3>
        <p>{song.artist}</p>
        <small>
          {song.guest} ·{' '}
          {new Date(song.created).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </small>
        {song.message && <blockquote>“{song.message}”</blockquote>}
        {song.spotify && (
          <a href={song.spotify} target="_blank" rel="noopener noreferrer">
            Escuchar en Spotify ↗
          </a>
        )}
      </div>
      <div className="song-actions">
        {song.status === 'pending' && (
          <>
            <Button
              aria-label={`Aceptar ${song.title}`}
              onPress={() => onUpdate(song.id, 'accepted')}
            >
              <Check size={18} />
            </Button>
            <Button
              aria-label={`Descartar ${song.title}`}
              onPress={() => onUpdate(song.id, 'rejected')}
            >
              <X size={18} />
            </Button>
          </>
        )}
        {song.status === 'accepted' && (
          <Button
            aria-label={`Marcar ${song.title} como tocada`}
            onPress={() => onUpdate(song.id, 'played')}
          >
            <Play size={18} />
          </Button>
        )}
        {(song.status === 'played' || song.status === 'rejected') && (
          <Button
            aria-label={`Volver ${song.title} a pendientes`}
            onPress={() => onUpdate(song.id, 'pending')}
          >
            ↩
          </Button>
        )}
      </div>
    </article>
  );
}
