'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import {
  Button,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  TextArea,
  TextField,
} from 'react-aria-components';
import {
  ArrowUpRight,
  Check,
  Music2,
  Pause,
  Plus,
  Radio,
  Search,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { LoadingState } from '@/components/loading-state';
import { api } from '@/lib/http';
import type { EventDetail, SpotifyTrack } from '@/types/music';
import { useTrackSearch } from '@/features/spotify/hooks/use-track-search';
import { SelectedTrack } from './components/selected-track';
import { createClientId } from './lib/client-id';

type RequestForm = {
  guest: string;
  message: string;
};
const emptyForm: RequestForm = {
  guest: '',
  message: '',
};

export function RequestPage({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const { tracks, searchError, searching } = useTrackSearch(
    query,
    Boolean(configured),
  );
  const [form, setForm] = useState<RequestForm>(emptyForm);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<EventDetail>(
      `/api/event/${encodeURIComponent(eventId)}`,
      undefined,
      'GET',
      controller.signal,
    )
      .then(setEvent)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => setLoading(false));
    api<{ configured: boolean }>(
      '/api/search',
      undefined,
      'GET',
      controller.signal,
    )
      .then((data) => setConfigured(data.configured))
      .catch(() => setConfigured(false));
    const timer = window.setInterval(() => {
      api<EventDetail>(`/api/event/${encodeURIComponent(eventId)}`)
        .then(setEvent)
        .catch(() => {});
    }, 10000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [eventId]);

  function chooseTrack(track: SpotifyTrack) {
    setSelectedTrack(track);
    setError('');
    setQuery('');
  }

  function removeTrack() {
    setSelectedTrack(null);
    setQuery('');
    setError('');
    requestAnimationFrame(() => searchInput.current?.focus());
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    if (!selectedTrack) {
      setError('Selecciona una canción de Spotify.');
      searchInput.current?.focus();
      return;
    }
    setSending(true);
    setError('');
    try {
      let client = window.localStorage.getItem('ritmo-client');
      if (!client) {
        client = createClientId();
        window.localStorage.setItem('ritmo-client', client);
      }
      await api<{ ok: boolean }>(`/api/event/${encodeURIComponent(eventId)}`, {
        ...form,
        title: selectedTrack.title,
        artist: selectedTrack.artist,
        spotify: selectedTrack.spotify,
        client,
      });
      setForm((previous) => ({ ...emptyForm, guest: previous.guest }));
      setSelectedTrack(null);
      setQuery('');
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="guest-app">
      <div className="main-shell">
        <header>
          <div className="breadcrumb">
            <Brand />
          </div>
          {event && (
            <div className="header-right">
              <span className="live-dot" />{' '}
              {event.open ? 'Peticiones abiertas' : 'Peticiones pausadas'}
            </div>
          )}
        </header>
        <main className="guest-main">
          {event && (
            <div className="eyebrow">
              <Radio size={14} /> {event.name}
            </div>
          )}
          <h1>
            Pide una
            <br />
            <em>canción al DJ</em>
          </h1>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <LoadingState message="Cargando evento…" />
          ) : !event ? (
            <div className="empty">
              No encontramos este evento. Verifica el código QR.
            </div>
          ) : !event.open ? (
            <div className="empty">
              <Pause />
              Las peticiones están pausadas.
            </div>
          ) : sent ? (
            <div className="success">
              <div className="success-icon">
                <Check />
              </div>
              <h2>Petición enviada</h2>
              <Button className="primary" onPress={() => setSent(false)}>
                Pedir otra canción <Plus size={17} />
              </Button>
            </div>
          ) : (
            <form className="guest-form" onSubmit={submit}>
              {selectedTrack ? (
                <SelectedTrack
                  track={selectedTrack}
                  onRemove={removeTrack}
                  isDisabled={sending}
                />
              ) : (
                <div className="spotify-search">
                  <TextField
                    value={query}
                    onChange={setQuery}
                    isDisabled={!configured}
                  >
                    <Label>
                      <span className="label-icon">
                        <Search size={17} />
                      </span>
                      Buscar en Spotify
                    </Label>
                    <Input
                      ref={searchInput}
                      autoComplete="off"
                      placeholder={
                        configured === false
                          ? 'Búsqueda no disponible'
                          : 'Canción o artista…'
                      }
                    />
                  </TextField>
                  {searching && (
                    <p className="search-hint" role="status">
                      Buscando canciones…
                    </p>
                  )}
                  {searchError && (
                    <p className="search-hint search-error" role="alert">
                      {searchError}
                    </p>
                  )}
                  {configured === false && (
                    <p className="search-hint">
                      La búsqueda de Spotify no está disponible. Inténtalo más
                      tarde.
                    </p>
                  )}
                  {tracks.length > 0 && (
                    <ListBox
                      className="spotify-results"
                      aria-label="Resultados de Spotify"
                      onAction={(key) => {
                        const track = tracks.find((t) => t.id === String(key));
                        if (track) chooseTrack(track);
                      }}
                    >
                      {tracks.map((track) => (
                        <ListBoxItem
                          id={track.id}
                          key={track.id}
                          textValue={`${track.title} — ${track.artist}`}
                          className="spotify-option"
                        >
                          {track.image ? (
                            <Image
                              src={track.image}
                              alt=""
                              width={44}
                              height={44}
                              loading="lazy"
                              unoptimized
                            />
                          ) : (
                            <div className="track-placeholder">
                              <Music2 size={20} />
                            </div>
                          )}
                          <span>
                            <strong>{track.title}</strong>
                            <small>{track.artist}</small>
                          </span>
                          <Plus size={18} />
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  )}
                  {!searching &&
                    query.trim().length >= 2 &&
                    configured &&
                    tracks.length === 0 &&
                    !searchError && (
                      <p className="search-hint">
                        Sin resultados. Prueba con otro título o artista.
                      </p>
                    )}
                </div>
              )}
              <TextField
                value={form.guest}
                onChange={(value) =>
                  setForm((previous) => ({ ...previous, guest: value }))
                }
              >
                <Label>
                  Tu nombre <small>Opcional</small>
                </Label>
                <Input maxLength={60} />
              </TextField>
              <TextField
                value={form.message}
                onChange={(value) =>
                  setForm((previous) => ({ ...previous, message: value }))
                }
              >
                <Label>
                  Un mensaje para el DJ <small>Opcional</small>
                </Label>
                <TextArea
                  maxLength={240}
                  placeholder="Una dedicatoria, una ocasión especial…"
                />
              </TextField>
              <Button
                type="submit"
                className="primary wide"
                isDisabled={sending || !selectedTrack}
              >
                {sending ? 'Enviando…' : 'Enviar petición'}{' '}
                <ArrowUpRight size={19} />
              </Button>
              <p className="form-note">
                Puedes enviar una petición cada 30 segundos.
              </p>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
