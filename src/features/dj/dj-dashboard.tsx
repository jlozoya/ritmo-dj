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
  Text,
} from 'react-aria-components';
import { ArrowUpRight, Bell, CalendarDays, X } from 'lucide-react';
import { FieldInput } from '@/components/field-input';
import { api } from '@/lib/http';
import type { EventDetail, EventSummary, RequestStatus } from '@/types/music';
import { DJPanel } from './components/dashboard-panel';
import { ArchivedEventsDialog } from './components/archived-events-dialog';
import { EventDeleteDialog } from './components/event-delete-dialog';
import { startEventSync, type EventSyncMode } from './lib/event-sync';
import { subscribeToEvent } from './lib/ably-subscription';

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
  const [syncMode, setSyncMode] = useState<EventSyncMode>('polling');
  const [updatingRequests, setUpdatingRequests] = useState<string[]>([]);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedEvents, setArchivedEvents] = useState<EventSummary[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState('');
  const [eventBusy, setEventBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventSummary | null>(null);
  const activeIdRef = useRef('');
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
        undefined,
        'GET',
        AbortSignal.timeout(12000),
      );
      if (activeIdRef.current !== id) return;
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
      return detail.realtimeAvailable !== false;
    },
    [notify],
  );

  useEffect(() => {
    const controller = new AbortController();
    api<EventSummary[]>('/api/events', undefined, 'GET', controller.signal)
      .then((list) => {
        setEvents(list);
        const remembered = window.localStorage.getItem('ritmo-active-event');
        const selected =
          list.find((item) => item.id === remembered)?.id || list[0]?.id || '';
        activeIdRef.current = selected;
        setActiveId(selected);
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
    const sync = startEventSync({
      refresh: () => refresh(activeId),
      onMode: setSyncMode,
      onError: (e) => {
        if (activeIdRef.current === activeId) {
          setLastSync(false);
          setError((e as Error).message);
          onSessionCheck();
        }
      },
    });
    const unsubscribe = subscribeToEvent(
      activeId,
      sync.changed,
      sync.connected,
    );
    return () => {
      sync.stop();
      unsubscribe();
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
    activeIdRef.current = id;
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

  async function saveTipLink(tipUrl: string | null) {
    if (!event) throw new Error('Selecciona un evento.');
    const id = event.id;
    await api(`/api/event/${encodeURIComponent(id)}`, { tipUrl }, 'PATCH');
    setEvent((current) =>
      current?.id === id ? { ...current, tipUrl } : current,
    );
  }

  function removeActiveEvent(id: string) {
    const remaining = events.filter((item) => item.id !== id);
    setEvents(remaining);
    if (activeIdRef.current === id) selectEvent(remaining[0]?.id || '');
  }

  async function showArchived() {
    setArchivedOpen(true);
    setArchivedLoading(true);
    setArchivedError('');
    try {
      setArchivedEvents(await api<EventSummary[]>('/api/events?archived=1'));
    } catch (e) {
      setArchivedError((e as Error).message);
    } finally {
      setArchivedLoading(false);
    }
  }

  async function archiveEvent() {
    if (!event || eventBusy) return;
    const id = event.id;
    setEventBusy(true);
    setError('');
    try {
      await api(
        `/api/event/${encodeURIComponent(id)}`,
        { archived: true },
        'PATCH',
      );
      removeActiveEvent(id);
      notify('Evento archivado. Puedes recuperarlo desde Archivados.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEventBusy(false);
    }
  }

  async function restoreEvent(item: EventSummary) {
    if (eventBusy) return;
    setEventBusy(true);
    setArchivedError('');
    try {
      await api(
        `/api/event/${encodeURIComponent(item.id)}`,
        { archived: false },
        'PATCH',
      );
      setEvents((previous) => [
        { ...item, archived: 0, open: 0 },
        ...previous.filter((event) => event.id !== item.id),
      ]);
      setArchivedEvents((previous) =>
        previous.filter((event) => event.id !== item.id),
      );
      selectEvent(item.id);
      setArchivedOpen(false);
      notify('Evento restaurado. Las peticiones están pausadas.');
    } catch (e) {
      setArchivedError((e as Error).message);
    } finally {
      setEventBusy(false);
    }
  }

  async function deleteEvent(confirmationName: string) {
    if (!deleteTarget || eventBusy) return;
    const id = deleteTarget.id;
    setEventBusy(true);
    try {
      await api(
        `/api/event/${encodeURIComponent(id)}`,
        { confirmationName },
        'DELETE',
      );
      removeActiveEvent(id);
      setArchivedEvents((previous) =>
        previous.filter((item) => item.id !== id),
      );
      notify('Evento eliminado');
    } finally {
      setEventBusy(false);
    }
  }

  return (
    <>
      <DJPanel
        user={user}
        onSignOut={onSignOut}
        event={event}
        events={events}
        busy={loading || Boolean(activeId && !event && !error)}
        error={error}
        lastSync={lastSync}
        syncMode={syncMode}
        sound={sound}
        updatingRequests={updatingRequests}
        onNewEvent={() => {
          setError('');
          setModal(true);
        }}
        onSelect={selectEvent}
        onUpdate={updateEvent}
        onSaveTipLink={saveTipLink}
        eventBusy={eventBusy}
        onArchivedEvents={() => void showArchived()}
        onArchive={() => void archiveEvent()}
        onDelete={() => setDeleteTarget(event)}
        onAlerts={() => {
          alerts().catch(() => notify('No se pudieron activar los avisos.'));
        }}
        onDismissError={() => setError('')}
        onToast={notify}
      />
      {archivedOpen && (
        <ArchivedEventsDialog
          events={archivedEvents}
          loading={archivedLoading}
          busy={eventBusy}
          error={archivedError}
          onClose={() => setArchivedOpen(false)}
          onRetry={() => void showArchived()}
          onRestore={(item) => void restoreEvent(item)}
          onDelete={(item) => {
            setArchivedOpen(false);
            setDeleteTarget(item);
          }}
        />
      )}
      {deleteTarget && (
        <EventDeleteDialog
          key={deleteTarget.id}
          event={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={deleteEvent}
        />
      )}
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
                  <FieldInput icon={CalendarDays}>
                    <Input
                      name="event-name"
                      autoComplete="off"
                      maxLength={80}
                      placeholder="Ej. Sábado en la terraza"
                    />
                  </FieldInput>
                  <Text slot="description" className="field-help">
                    Este nombre se muestra al abrir el QR del evento.
                  </Text>
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
