'use client';
import { useState, type FormEvent } from 'react';
import {
  Button,
  Dialog,
  Input,
  Label,
  Modal,
  ModalOverlay,
  TextField,
} from 'react-aria-components';
import { Trash2 } from 'lucide-react';
import type { EventSummary } from '@/types/music';

export function EventDeleteDialog({
  event,
  onClose,
  onConfirm,
}: {
  event: EventSummary;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || name !== event.name) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm(name);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
        <Dialog
          role="alertdialog"
          aria-labelledby="delete-event-title"
          aria-describedby="delete-event-description"
        >
          <form onSubmit={submit}>
            <h2 id="delete-event-title">
              <Trash2 size={22} />
              Eliminar evento
            </h2>
            <p id="delete-event-description">
              Se eliminarán «{event.name}» y todas sus peticiones. Esta acción
              no se puede deshacer.
            </p>
            <TextField
              value={name}
              onChange={setName}
              isDisabled={busy}
              isRequired
            >
              <Label>Escribe el nombre del evento para confirmar</Label>
              <Input
                autoComplete="off"
                spellCheck={false}
                placeholder={event.name}
              />
            </TextField>
            {error && (
              <p className="tip-error" role="alert">
                {error}
              </p>
            )}
            <div className="event-dialog-actions">
              <Button
                className="outline"
                onPress={onClose}
                isDisabled={busy}
                autoFocus
              >
                Cancelar
              </Button>
              <Button
                className="danger-button"
                type="submit"
                isDisabled={busy || name !== event.name}
              >
                {busy ? 'Eliminando…' : 'Eliminar evento'}
              </Button>
            </div>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
