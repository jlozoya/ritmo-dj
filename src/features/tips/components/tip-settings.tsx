'use client';
import { useState, type FormEvent } from 'react';
import { Button, Input, Label, Text, TextField } from 'react-aria-components';
import { ArrowUpRight, Heart, Link2, LoaderCircle } from 'lucide-react';
import { FieldInput } from '@/components/field-input';
import { parseTipLink } from '../lib/tip-link';

export function TipSettings({
  tipUrl,
  tipOpenCount,
  onSave,
}: {
  tipUrl: string | null;
  tipOpenCount: number;
  onSave: (url: string | null) => Promise<void>;
}) {
  const [value, setValue] = useState(tipUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const link = tipUrl ? parseTipLink(tipUrl) : null;
  const valid = parseTipLink(value);
  const dirty = (valid?.url || value.trim()) !== (tipUrl || '');

  async function save(url: string | null) {
    if (busy) return;
    setBusy(true);
    setError('');
    setSaved('');
    try {
      await onSave(url);
      setValue(url || '');
      setSaved(url ? 'Enlace guardado' : 'Propinas desactivadas');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) {
      setError('Usa un enlace HTTPS de PayPal.Me o Mercado Pago.');
      return;
    }
    void save(valid.url);
  }

  return (
    <section className="tip-settings" aria-label="Configurar propinas">
      <div className="tip-heading">
        <Heart size={19} aria-hidden="true" />
        <h2>Propinas</h2>
        {link && <span className="tip-enabled">Activas</span>}
      </div>
      <div className="tip-opening-total">
        <strong>{tipOpenCount}</strong>
        <span>
          {tipOpenCount === 1 ? 'apertura del enlace' : 'aperturas del enlace'}
        </span>
        <small>Una por navegador. No confirma pagos.</small>
      </div>
      <form onSubmit={submit}>
        <TextField
          value={value}
          onChange={(next) => {
            setValue(next);
            setError('');
            setSaved('');
          }}
          isDisabled={busy}
          isInvalid={Boolean(error)}
          validationBehavior="aria"
        >
          <Label>Enlace de pago</Label>
          <FieldInput icon={Link2}>
            <Input
              name="tip-url"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={500}
              placeholder="https://paypal.me/tuusuario"
              autoComplete="off"
            />
          </FieldInput>
          <Text slot="description">
            Pega tu enlace de PayPal.Me o Mercado Pago para mostrarlo al público
            de este evento.
          </Text>
        </TextField>
        {error && (
          <p className="tip-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="tip-saved" role="status">
            {saved}
          </p>
        )}
        <div className="tip-settings-actions">
          <Button
            className="primary"
            type="submit"
            isDisabled={busy || !value.trim() || !dirty}
          >
            {busy && <LoaderCircle size={14} className="song-spinner" />}
            {busy ? 'Guardando…' : 'Guardar enlace'}
          </Button>
          {link && (
            <Button
              className="outline"
              isDisabled={busy}
              onPress={() => void save(null)}
            >
              Desactivar
            </Button>
          )}
        </div>
      </form>
      {link ? (
        <a
          className="tip-provider-link"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver página de {link.label} <ArrowUpRight size={14} />
        </a>
      ) : (
        <div className="tip-help-links">
          <a
            href="https://www.paypal.com/paypalme/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Crear PayPal.Me <ArrowUpRight size={12} />
          </a>
          <a
            href="https://www.mercadopago.com.mx/herramientas-para-vender/link-de-pago"
            target="_blank"
            rel="noopener noreferrer"
          >
            Crear link de Mercado Pago <ArrowUpRight size={12} />
          </a>
        </div>
      )}
    </section>
  );
}
