import Image from 'next/image';
import { Button } from 'react-aria-components';
import { ArrowUpRight, Music2, X } from 'lucide-react';
import type { SpotifyTrack } from '@/types/music';

export function SelectedTrack({
  track,
  onRemove,
  isDisabled,
}: {
  track: SpotifyTrack;
  onRemove: () => void;
  isDisabled: boolean;
}) {
  return (
    <section className="selected-track" aria-label="Canción seleccionada">
      {track.image ? (
        <Image
          className="selected-track-cover"
          src={track.image}
          alt={`Portada de ${track.album || track.title}`}
          width={80}
          height={80}
          unoptimized
        />
      ) : (
        <div
          className="selected-track-cover track-placeholder"
          aria-hidden="true"
        >
          <Music2 size={28} />
        </div>
      )}
      <div className="selected-track-details">
        <h2>{track.title}</h2>
        <p>{track.artist}</p>
        <a href={track.spotify} target="_blank" rel="noopener noreferrer">
          Ver en Spotify <ArrowUpRight size={13} />
        </a>
      </div>
      <Button
        className="selected-track-remove"
        aria-label="Quitar canción seleccionada"
        onPress={onRemove}
        isDisabled={isDisabled}
      >
        <X size={18} />
      </Button>
    </section>
  );
}
