'use client';

import { useEffect, useState } from 'react';
import { ASPECTOS } from '@/components/cliente/FormularioCalificacion';
import { EstrellasFijas } from '@/components/Estrellas';
import { api, ErrorApi } from '@/lib/api';
import { fecha } from '@/lib/formato';

interface Datos {
  resumen: {
    total: number;
    general: number | null;
    confianza: number | null;
    calidad: number | null;
    puntualidad: number | null;
    cumplimiento: number | null;
    confianzaBaja: boolean;
  };
  calificaciones: {
    codigo: string;
    areas: string[];
    cliente: string;
    calificacion: number;
    confianza: number;
    calidad: number;
    puntualidad: number;
    cumplimiento: number;
    comentario: string | null;
    creadoEn: string;
  }[];
}

/** Lo que los clientes dicen del maestro, con la confianza primero. */
export function MisCalificaciones() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Datos>('/maestros/yo/calificaciones')
      .then(setDatos)
      .catch((err) => setError(err instanceof ErrorApi ? err.message : 'No pudimos cargar tus calificaciones.'));
  }, []);

  if (error) return <p className="aviso aviso-error" role="alert">{error}</p>;
  if (!datos) return <p className="sub">Cargando tus calificaciones…</p>;
  const r = datos.resumen;

  if (!r.total) {
    return (
      <div className="vacio">
        <strong>Todavía no tienes calificaciones.</strong>
        <span>
          Cuando termines un trabajo, el cliente te calificará en confianza, calidad, puntualidad y cumplimiento. La
          confianza es lo que más miran los vecinos al elegir.
        </span>
      </div>
    );
  }

  return (
    <div className="historial">
      <div className="cifras">
        <div className="cifra cifra-confianza">
          <span className="cifra-etiqueta">Confianza</span>
          <strong>{r.confianza!.toFixed(1)}</strong>
          <EstrellasFijas valor={r.confianza!} />
        </div>
        <div className="cifra">
          <span className="cifra-etiqueta">Calificación general</span>
          <strong>{r.general!.toFixed(1)}</strong>
          <span className="cifra-nota">
            {r.total} {r.total === 1 ? 'calificación' : 'calificaciones'}
          </span>
        </div>
      </div>

      {r.confianzaBaja && (
        <p className="aviso aviso-error">
          Tu confianza está por debajo de 3. Los clientes lo ven al elegir. Cuida el trato, el respeto por la casa y lo
          acordado: la próxima calificación puede subirla.
        </p>
      )}

      <section className="tarjeta ancha">
        <h3 style={{ fontSize: 17, margin: 0 }}>Por aspecto</h3>
        <dl className="aspectos">
          {ASPECTOS.map((a) => (
            <div key={a.id} className={a.id === 'confianza' ? 'aspecto destacado' : 'aspecto'}>
              <dt>{a.nombre}</dt>
              <dd>
                <EstrellasFijas valor={r[a.id] ?? 0} tamano={14} /> {r[a.id]?.toFixed(1)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <ul className="lista-historial">
        {datos.calificaciones.map((c) => (
          <li key={c.codigo} className="historial-item">
            <div className="historial-cabeza">
              <strong>
                {c.cliente} · #{c.codigo}
              </strong>
              <span>
                <EstrellasFijas valor={c.calificacion} /> {c.calificacion.toFixed(1)}
              </span>
            </div>
            <div className="historial-datos">
              <span className="confianza">Confianza {c.confianza}</span>
              <span>Calidad {c.calidad}</span>
              <span>Puntualidad {c.puntualidad}</span>
              <span>Cumplimiento {c.cumplimiento}</span>
            </div>
            {c.comentario && <p className="oferta-mensaje">“{c.comentario}”</p>}
            <div className="historial-datos">
              <span>{c.areas.join(', ')}</span>
              <span>{fecha(c.creadoEn)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
