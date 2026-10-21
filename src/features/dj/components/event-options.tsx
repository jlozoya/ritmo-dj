'use client';
import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components';
import { Archive, Ellipsis, Trash2 } from 'lucide-react';

export function EventOptions({
  disabled,
  onArchive,
  onDelete,
}: {
  disabled: boolean;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <MenuTrigger>
      <Button
        className="outline event-options-trigger"
        aria-label="Opciones del evento"
        isDisabled={disabled}
      >
        <Ellipsis size={18} />
      </Button>
      <Popover className="event-options-popover" placement="bottom end">
        <Menu
          aria-label="Opciones del evento"
          onAction={(key) => (key === 'archive' ? onArchive() : onDelete())}
        >
          <MenuItem id="archive" textValue="Archivar evento">
            <Archive size={16} />
            Archivar evento
          </MenuItem>
          <MenuItem
            id="delete"
            textValue="Eliminar evento"
            className="event-delete-item"
          >
            <Trash2 size={16} />
            Eliminar evento
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
