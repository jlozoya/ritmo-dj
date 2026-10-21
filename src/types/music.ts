/** Contratos compartidos por el backend y las pantallas de Ritmo DJ. */
export type RequestStatus = 'pending' | 'accepted' | 'played' | 'rejected';

export interface PublicEvent {
  id: string;
  name: string;
  open: number;
  archived: number;
  tipUrl: string | null;
}

export interface SongRequest {
  id: string;
  title: string;
  artist: string;
  guest: string;
  message: string;
  spotify: string;
  image: string | null;
  status: RequestStatus;
  created: string;
  tipOpened: boolean;
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  image: string | null;
  spotify: string;
  durationMs: number;
}

export type EventSummary = Pick<
  PublicEvent,
  'id' | 'name' | 'open' | 'archived'
>;
export type EventDetail = PublicEvent & {
  owner: boolean;
  tipOpenCount?: number;
  requests: SongRequest[];
};
export type DJUser = { name: string; email: string };
