'use client';

import { useState } from 'react';
import { api, ErrorApi, guardarToken, Sesion } from '@/lib/api';

interface Props {
  celular: string;
  mensaje: string;
  onSesion: (sesion: Sesion) => void;
  onCambiarNumero?: () => void;
}

/** Paso de "escribe el código que te llegó por WhatsApp". */
export function VerificarCodigo({ celular, mensaje, onSesion, onCambiarNumero }: Props) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(mensaje);
  const [cargando, setCargando] = useState(false);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const sesion = await api<Sesion>('/auth/codigo/verificar', { cuerpo: { celular, codigo } });
      guardarToken(sesion.token);
      onSesion(sesion);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'Algo salió mal. Intenta de nuevo.');
      setCargando(false);
    }
  }

  async function reenviar() {
    setError(null);
    try {
      const r = await api<{ mensaje: string }>('/auth/codigo', { cuerpo: { celular } });
      setInfo(r.mensaje);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No pudimos reenviar el código.');
    }
  }

  return (
    <form onSubmit={verificar} noValidate>
      {info && <p className="aviso aviso-info" role="status">{info}</p>}
      <label className="campo" htmlFor="codigo">
        Código de 6 dígitos
        <input
          id="codigo"
          className="codigo-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          autoFocus
        />
      </label>
      {error && <p className="aviso aviso-error" role="alert">{error}</p>}
      <button className="boton boton-primario" type="submit" disabled={cargando || codigo.length !== 6}>
        {cargando ? 'Verificando…' : 'Verificar y entrar'}
      </button>
      <p className="sub">
        ¿No te llegó?{' '}
        <button type="button" className="enlace-boton" onClick={reenviar}>
          Reenviar código
        </button>
        {onCambiarNumero && (
          <>
            {' · '}
            <button type="button" className="enlace-boton" onClick={onCambiarNumero}>
              Cambiar número
            </button>
          </>
        )}
      </p>
    </form>
  );
}
