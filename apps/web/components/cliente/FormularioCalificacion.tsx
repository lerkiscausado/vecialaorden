'use client';

import { useState } from 'react';
import { EstrellasFijas, SelectorEstrellas } from '@/components/Estrellas';
import { api, ErrorApi } from '@/lib/api';

export interface MiCalificacion {
  calificacion: number;
  confianza: number;
  calidad: number;
  puntualidad: number;
  cumplimiento: number;
  comentario: string | null;
}

/** Los cuatro aspectos, con la confianza primero porque es lo que más importa. */
export const ASPECTOS: { id: keyof Omit<MiCalificacion, 'calificacion' | 'comentario'>; nombre: string; ayuda: string }[] = [
  { id: 'confianza', nombre: 'Confianza', ayuda: '¿Fue honesto, respetuoso con tu casa y te sentiste seguro?' },
  { id: 'calidad', nombre: 'Calidad del trabajo', ayuda: '¿Quedó bien hecho y bien terminado?' },
  { id: 'puntualidad', nombre: 'Puntualidad', ayuda: '¿Llegó a tiempo y terminó cuando dijo?' },
  { id: 'cumplimiento', nombre: 'Cumplimiento', ayuda: '¿Respetó el precio y lo que acordaron?' },
];

export function FormularioCalificacion<T>({
  codigo,
  maestro,
  onListo,
}: {
  codigo: string;
  maestro: string;
  onListo: (pedido: T) => void;
}) {
  const [valores, setValores] = useState({ confianza: 0, calidad: 0, puntualidad: 0, cumplimiento: 0 });
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const faltan = ASPECTOS.filter((a) => !valores[a.id]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (faltan.length) {
      setError(`Falta calificar: ${faltan.map((a) => a.nombre.toLowerCase()).join(', ')}.`);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      onListo(
        await api<T>(`/pedidos/${encodeURIComponent(codigo)}/calificar`, {
          cuerpo: { ...valores, comentario: comentario.trim() || undefined },
        }),
      );
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo enviar la calificación.');
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="form-calificacion" noValidate>
      <div>
        <h2 style={{ fontSize: 22 }}>¿Cómo te fue con {maestro}?</h2>
        <p className="sub">Tu calificación ayuda a otros vecinos a elegir bien. Solo se muestra tu primer nombre.</p>
      </div>
      {ASPECTOS.map((a, i) => (
        <SelectorEstrellas
          key={a.id}
          etiqueta={a.nombre}
          ayuda={a.ayuda}
          valor={valores[a.id]}
          onCambio={(v) => setValores((x) => ({ ...x, [a.id]: v }))}
          destacado={i === 0}
        />
      ))}
      <label className="campo" htmlFor="cal-comentario">
        Comentario <small>(opcional)</small>
        <textarea
          id="cal-comentario"
          rows={3}
          maxLength={1000}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Cuéntales a otros vecinos cómo fue el trabajo"
        />
      </label>
      {error && <p className="aviso aviso-error" role="alert">{error}</p>}
      <div className="acciones">
        <button className="boton boton-primario" type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar calificación'}
        </button>
      </div>
    </form>
  );
}

export function ResumenCalificacion({ c }: { c: MiCalificacion }) {
  return (
    <div className="resumen-calificacion">
      <p style={{ margin: 0 }}>
        <strong>Tu calificación: {c.calificacion.toFixed(1)} de 5</strong> <EstrellasFijas valor={c.calificacion} />
      </p>
      <dl className="aspectos">
        {ASPECTOS.map((a) => (
          <div key={a.id} className={a.id === 'confianza' ? 'aspecto destacado' : 'aspecto'}>
            <dt>{a.nombre}</dt>
            <dd>
              <EstrellasFijas valor={c[a.id]} tamano={14} /> {c[a.id]}
            </dd>
          </div>
        ))}
      </dl>
      {c.comentario && <p className="oferta-mensaje">“{c.comentario}”</p>}
    </div>
  );
}
