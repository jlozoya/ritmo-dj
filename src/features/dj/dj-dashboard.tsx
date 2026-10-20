'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Button,
  Dialog,
  Input,
  Label,
  Modal,
  ModalOverlay,
  TextField,
} from 'react-aria-components';
import { ArrowUpRight, Bell, X } from 'lucide-react';
import { api } from '@/lib/http';
import type { EventDetail, EventSummary, RequestStatus } from '@/types/music';
import { DJPanel } from './components/dashboard-panel';

export function DJDashboard({
  user,
  onSignOut,
  onSessionCheck,
}: {
  user: { name: string; email: string };
  onSignOut: () => void;
  onSessionCheck: () => void;
}) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [activeId, setActiveId] = useState('');
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [sound, setSound] = useState(false);
  const [lastSync, setLastSync] = useState(false);
  const [updatingRequests, setUpdatingRequests] = useState<string[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  soundRef.current = sound;

  const notify = useCallback((message: string) => {
    setToast(message);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const refresh = useCallback(
    async (id: string) => {
      const detail = await api<EventDetail>(
        `/api/event/${encodeURIComponent(id)}`,
      );
      if (!detail.owner) throw new Error('No tienes acceso a este evento.');
      setEvent(detail);
      setLastSync(true);
      const ids = new Set(detail.requests.map((song) => song.id));
      const fresh =
        seen.current === null
          ? []
          : detail.requests.filter((song) => !seen.current!.has(song.id));
      seen.current = ids;
      if (fresh.length) {
        const first = fresh[0];
        notify(
          `${fresh.length} nueva${fresh.length > 1 ? 's' : ''} petición${fresh.length > 1 ? 'es' : ''}: ${first.title}`,
        );
        if (soundRef.current) {
          const context = audio.current;
          if (context) {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.frequency.value = 880;
            gain.gain.setValueAtTime(0.12, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(
              0.001,
              context.currentTime + 0.35,
            );
            oscillator.start();
            oscillator.stop(context.currentTime + 0.35);
          }
          if (
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification('Nueva petición en Ritmo DJ', {
              body: `${first.title} · ${first.artist}`,
            });
          }
        }
      }
    },
    [notify],
  );

  useEffect(() => {
    const controller = new AbortController();
    api<EventSummary[]>('/api/events', undefined, 'GET', controller.signal)
      .then((list) => {
        setEvents(list);
        const remembered = window.localStorage.getItem('ritmo-active-event');
        setActiveId(
          list.find((item) => item.id === remembered)?.id || list[0]?.id || '',
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError((e as Error).message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    seen.current = null;
    let cancelled = false;
    const tick = () =>
      refresh(activeId).catch((e) => {
        if (!cancelled) {
          setLastSync(false);
          setError((e as Error).message);
          onSessionCheck();
        }
      });
    tick();
    const timer = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeId, refresh, onSessionCheck]);

  async function createEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await api<EventSummary>('/api/events', {
        name: eventName.trim(),
      });
      setEvents((previous) => [created, ...previous]);
      selectEvent(created.id);
      setModal(false);
      setEventName('');
      notify('Evento creado');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function selectEvent(id: string) {
    setLastSync(false);
    seen.current = null;
    setEvent(null);
    setError('');
    setActiveId(id);
    window.localStorage.setItem('ritmo-active-event', id);
  }

  async function updateEvent(body: {
    open?: boolean;
    requestId?: string;
    status?: RequestStatus;
  }) {
    if (!event) return;
    const requestId = body.requestId;
    if (requestId && updatingRequests.includes(requestId)) return;
    if (requestId) setUpdatingRequests((previous) => [...previous, requestId]);
    try {
      await api(`/api/event/${encodeURIComponent(event.id)}`, body, 'PATCH');
      await refresh(event.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (requestId)
        setUpdatingRequests((previous) =>
          previous.filter((id) => id !== requestId),
        );
    }
  }

  async function alerts() {
    if (!sound && !audio.current) audio.current = new AudioContext();
    if (!sound) await audio.current?.resume();
    setSound((previous) => !previous);
    if (
      !sound &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      await Notification.requestPermission();
    }
  }

  return (
    <>
      <DJPanel
        user={user}
        onSignOut={onSignOut}
        event={event}
        events={events}
        busy={loading}
        error={error}
        lastSync={lastSync}
        sound={sound}
        updatingRequests={updatingRequests}
        onNewEvent={() => {
          setError('');
          setModal(true);
        }}
        onSelect={selectEvent}
        onUpdate={updateEvent}
        onAlerts={() => {
          alerts().catch(() => notify('No se pudieron activar los avisos.'));
        }}
        onDismissError={() => setError('')}
        onToast={notify}
      />
      {toast && (
        <div className="toast" role="status">
          <Bell size={18} />
          {toast}
        </div>
      )}
      <ModalOverlay
        className="modal-backdrop"
        isOpen={modal}
        onOpenChange={setModal}
        isDismissable
      >
        <Modal className="modal">
          <Dialog aria-label="Crear un evento nuevo">
            {({ close }) => (
              <form onSubmit={createEvent}>
                <Button
                  type="button"
                  className="close"
                  aria-label="Cerrar"
                  onPress={close}
                >
                  <X size={20} />
                </Button>
                <h2>Nuevo evento</h2>
                <TextField
                  className="event-name-field"
                  isRequired
                  value={eventName}
                  onChange={setEventName}
                  autoFocus
                >
                  <Label>Nombre del evento</Label>
                  <Input
                    maxLength={80}
                    placeholder="Ej. Sábado en la terraza"
                  />
                </TextField>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="primary wide"
                  isDisabled={busy || !eventName.trim()}
                >
                  {busy ? 'Creando…' : 'Crear evento'}
                  <ArrowUpRight size={18} />
                </Button>
              </form>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
