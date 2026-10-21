'use client';
import { Button, Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { Archive, RotateCcw, Trash2, X } from 'lucide-react';
import { LoadingState } from '@/components/loading-state';
import type { EventSummary } from '@/types/music';

export function ArchivedEventsDialog({
  events,
  loading,
  busy,
  error,
  onClose,
  onRetry,
  onRestore,
  onDelete,
}: {
  events: EventSummary[];
  loading: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
  onRestore: (event: EventSummary) => void;
  onDelete: (event: EventSummary) => void;
}) {
  return (
    <ModalOverlay
      className="modal-backdrop"
      isOpen
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      isDismissable={!busy}
    >
      <Modal className="modal event-management-modal">
        <Dialog aria-label="Eventos archivados">
          <Button
            className="close"
            aria-label="Cerrar archivados"
            onPress={onClose}
            isDisabled={busy}
          >
            <X size={20} />
          </Button>
          <h2>
            <Archive size={22} />
            Archivados
          </h2>
          {loading ? (
            <LoadingState message="Cargando archivados…" />
          ) : error ? (
            <div className="tip-error" role="alert">
              {error}
              <Button className="text-button" onPress={onRetry}>
                Reintentar
              </Button>
            </div>
          ) : events.length === 0 ? (
            <p>No hay eventos archivados.</p>
          ) : (
            <>
              <p>Al restaurar un evento, sus peticiones permanecen pausadas.</p>
              <ul className="archived-event-list">
                {events.map((event) => (
                  <li key={event.id}>
                    <span>{event.name}</span>
                    <div className="archived-event-actions">
                      <Button
                        className="outline"
                        aria-label={`Restaurar ${event.name}`}
                        onPress={() => onRestore(event)}
                        isDisabled={busy}
                      >
                        <RotateCcw size={15} />
                        Restaurar
                      </Button>
                      <Button
                        className="outline danger-text"
                        aria-label={`Eliminar ${event.name}`}
                        onPress={() => onDelete(event)}
                        isDisabled={busy}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
