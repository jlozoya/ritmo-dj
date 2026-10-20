'use client';
import { useState } from 'react';
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from 'react-aria-components';
import {
  ArrowUpRight,
  AudioLines,
  Check,
  Headphones,
  Link2,
  LogOut,
  Music2,
  Pause,
  Play,
  Plus,
  Volume2,
  X,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { LoadingState } from '@/components/loading-state';
import type { EventDetail, EventSummary, RequestStatus } from '@/types/music';
import { statuses, labels } from '../request-status';
import { SharingCard } from './sharing-card';
import { SongCard } from './song-card';

export function DJPanel({
  user,
  onSignOut,
  event,
  events,
  busy,
  error,
  lastSync,
  sound,
  onNewEvent,
  onSelect,
  onUpdate,
  onAlerts,
  onDismissError,
  onToast,
  updatingRequests = [],
}: {
  user: { name: string; email: string };
  onSignOut: () => void;
  event: EventDetail | null;
  events: EventSummary[];
  busy: boolean;
  error: string;
  lastSync: boolean;
  sound: boolean;
  onNewEvent: () => void;
  onSelect: (id: string) => void;
  onUpdate: (body: {
    open?: boolean;
    requestId?: string;
    status?: RequestStatus;
  }) => void;
  onAlerts: () => void;
  onDismissError: () => void;
  onToast: (message: string) => void;
  updatingRequests?: string[];
}) {
  const [filter, setFilter] = useState<RequestStatus>('pending');
  const rows = event?.requests || [];
  const pending = rows.filter((song) => song.status === 'pending').length;
  const played = rows.filter((song) => song.status === 'played').length;

  function share() {
    if (!event) return;
    navigator.clipboard
      .writeText(
        `${window.location.origin}/?evento=${encodeURIComponent(event.id)}`,
      )
      .then(() => onToast('Enlace del evento copiado'))
      .catch(() =>
        onToast('Selecciona el enlace de la tarjeta QR para copiarlo.'),
      );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">DJ</div>
            <span>
              {user.name}
              <small>{user.email}</small>
            </span>
            <Headphones size={18} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <div className="header-right">
            <span className="live-dot" />{' '}
            {event?.open
              ? 'Peticiones abiertas'
              : event
                ? 'Peticiones pausadas'
                : 'Sin evento'}{' '}
            <Button className="outline sign-out" onPress={onSignOut}>
              <LogOut size={15} />
              Cerrar sesión
            </Button>
          </div>
        </header>
        <main>
          <div className="title-row">
            <div>
              <h1>Cabina</h1>
            </div>
            <Button className="primary" onPress={onNewEvent}>
              <Plus size={18} />
              Nuevo evento
            </Button>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <Button aria-label="Cerrar aviso" onPress={onDismissError}>
                <X size={17} />
              </Button>
            </div>
          )}
          <section className="event-banner">
            <div className="banner-copy">
              <h2>
                {event?.name ||
                  (events.length
                    ? 'No hay un evento seleccionado'
                    : 'No tienes eventos')}
              </h2>
              <div className="banner-actions">
                {event ? (
                  <>
                    <Button className="light-button" onPress={share}>
                      <Link2 size={16} />
                      Compartir enlace <ArrowUpRight size={16} />
                    </Button>
                    <Button
                      className="ghost"
                      onPress={() => onUpdate({ open: !event.open })}
                    >
                      {event.open ? <Pause size={15} /> : <Play size={15} />}
                      {event.open ? 'Pausar peticiones' : 'Abrir peticiones'}
                    </Button>
                  </>
                ) : (
                  <Button className="light-button" onPress={onNewEvent}>
                    Crear evento <ArrowUpRight size={16} />
                  </Button>
                )}
              </div>
            </div>
            <div className="record-art" aria-hidden="true">
              <div className="record">
                <div className="record-label">
                  <AudioLines size={40} />
                </div>
              </div>
            </div>
          </section>
          {event && (
            <div className="stats">
              <div>
                <span className="stat-icon purple">
                  <Music2 size={20} />
                </span>
                <div>
                  <span>Peticiones recibidas</span>
                  <strong>{rows.length.toString().padStart(2, '0')}</strong>
                </div>
              </div>
              <div>
                <span className="stat-icon amber">
                  <Headphones size={20} />
                </span>
                <div>
                  <span>Por revisar</span>
                  <strong>{pending.toString().padStart(2, '0')}</strong>
                </div>
              </div>
              <div>
                <span className="stat-icon green">
                  <Check size={20} />
                </span>
                <div>
                  <span>Tocadas</span>
                  <strong>{played.toString().padStart(2, '0')}</strong>
                </div>
              </div>
            </div>
          )}
          {(event || busy || events.length > 0) && (
            <div className="content-grid">
              <section className="queue" aria-label="Solicitudes de canciones">
                <div className="section-title">
                  <h2>
                    Peticiones <span>{rows.length}</span>
                  </h2>
                  <Button
                    className={`alert-btn${sound ? ' enabled' : ''}`}
                    onPress={onAlerts}
                  >
                    <Volume2 size={16} />
                    {sound ? 'Avisos activos' : 'Activar avisos'}
                  </Button>
                </div>
                <Tabs
                  selectedKey={filter}
                  onSelectionChange={(key) => setFilter(key as RequestStatus)}
                  aria-label="Estado de las peticiones"
                >
                  <TabList className="tabs" aria-label="Filtrar solicitudes">
                    {statuses.map((status) => (
                      <Tab className="queue-tab" id={status} key={status}>
                        {labels[status]}{' '}
                        <span>
                          {rows.filter((song) => song.status === status).length}
                        </span>
                      </Tab>
                    ))}
                  </TabList>
                  {statuses.map((status) => (
                    <TabPanel id={status} key={status} className="queue-panel">
                      {!event ? (
                        busy ? (
                          <LoadingState message="Cargando eventos…" />
                        ) : (
                          <div className="empty">
                            No se pudo cargar el evento.
                          </div>
                        )
                      ) : rows.filter((song) => song.status === status)
                          .length === 0 ? (
                        <div className="empty">
                          <div className="empty-disc">
                            <Music2 size={29} />
                          </div>
                          <h3>
                            {status === 'pending'
                              ? 'No hay peticiones pendientes'
                              : status === 'accepted'
                                ? 'No hay canciones aceptadas'
                                : status === 'played'
                                  ? 'No hay canciones marcadas como tocadas'
                                  : 'No hay peticiones descartadas'}
                          </h3>
                          {event &&
                            status === 'pending' &&
                            rows.length === 0 &&
                            Boolean(event.open) && (
                              <>
                                <p>
                                  Comparte el enlace del evento para recibir
                                  peticiones.
                                </p>
                                <Button className="text-button" onPress={share}>
                                  Copiar enlace <ArrowUpRight size={15} />
                                </Button>
                              </>
                            )}
                          {status === 'accepted' && pending > 0 && (
                            <p>
                              Acepta canciones desde la pestaña «Por revisar».
                            </p>
                          )}
                          {status === 'played' &&
                            rows.some((song) => song.status === 'accepted') && (
                              <p>
                                Después de tocar una canción, márcala como
                                tocada desde «En la lista».
                              </p>
                            )}
                        </div>
                      ) : (
                        <div className="song-list">
                          {rows
                            .filter((song) => song.status === status)
                            .map((song, i) => (
                              <SongCard
                                key={song.id}
                                song={song}
                                index={i}
                                isUpdating={updatingRequests.includes(song.id)}
                                onUpdate={(id, state) =>
                                  onUpdate({ requestId: id, status: state })
                                }
                              />
                            ))}
                        </div>
                      )}
                    </TabPanel>
                  ))}
                </Tabs>
                <div className="queue-footer">
                  <span className={`live-dot ${lastSync ? '' : 'offline'}`} />
                  {lastSync
                    ? 'Actualización automática cada 3 s'
                    : 'Esperando conexión'}
                </div>
              </section>
              <aside className="right-column">
                <SharingCard event={event} onToast={onToast} />
                {events.length > 1 && (
                  <Select
                    className="event-select"
                    selectedKey={event?.id || null}
                    onSelectionChange={(key) => onSelect(String(key))}
                  >
                    <Label>Cambiar evento</Label>
                    <Button className="event-select-trigger">
                      <SelectValue /> <span aria-hidden="true">▾</span>
                    </Button>
                    <Popover className="event-select-popover">
                      <ListBox items={events}>
                        {(item) => (
                          <ListBoxItem
                            className="event-option"
                            id={item.id}
                            textValue={item.name}
                          >
                            {item.name}
                          </ListBoxItem>
                        )}
                      </ListBox>
                    </Popover>
                  </Select>
                )}
              </aside>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
