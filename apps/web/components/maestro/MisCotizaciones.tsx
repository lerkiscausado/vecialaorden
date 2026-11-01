'use client';

import { useEffect, useState } from 'react';
import { api, ErrorApi } from '@/lib/api';
import { ESTADO_COTIZACION, fecha, pesos } from '@/lib/formato';

interface Historial {
  resumen: {
    enviadas: number;
    elegidas: number;
    noElegidas: number;
    enEspera: number;
    tasaExito: number | null;
    creditosGastados: number;
    valorGanado: number;
    saldoCreditos: number;
  };
  cotizaciones: {
    id: number;
    codigo: string;
    resumen: string;
    areas: string[];
    ubicacion: string | null;
    precioTotal: number;
    creditosCobrados: number;
    estado: string;
    enviadaEn: string;
    cliente: { nombre: string; celular: string } | null;
    calificacion: { general: number; confianza: number; comentario: string | null } | null;
  }[];
}

const FILTROS = [
  { id: 'todas', nombre: 'Todas' },
  { id: 'enviada', nombre: 'En espera' },
  { id: 'elegida', nombre: 'Elegidas' },
  { id: 'descartada', nombre: 'No elegidas' },
];

/** Historial del maestro: primero los números grandes, después la lista. */
export function MisCotizaciones() {
  const [filtro, setFiltro] = useState('todas');
  const [datos, setDatos] = useState<Historial | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Historial>(`/maestros/yo/cotizaciones?estado=${filtro}`)
      .then(setDatos)
      .catch((err) => setError(err instanceof ErrorApi ? err.message : 'No pudimos cargar tu historial.'));
  }, [filtro]);

  if (error) return <p className="aviso aviso-error" role="alert">{error}</p>;
  if (!datos) return <p className="sub">Cargando tu historial…</p>;
  const r = datos.resumen;

  return (
    <div className="historial">
      <div className="cifras">
        <div className="cifra">
          <span className="cifra-etiqueta">Enviadas</span>
          <strong>{r.enviadas}</strong>
        </div>
        <div className="cifra cifra-exito">
          <span className="cifra-etiqueta">Elegidas</span>
          <strong>{r.elegidas}</strong>
          {r.tasaExito !== null && <span className="cifra-nota">{r.tasaExito}% de las decididas</span>}
        </div>
        <div className="cifra">
          <span className="cifra-etiqueta">En espera</span>
          <strong>{r.enEspera}</strong>
        </div>
        <div className="cifra">
          <span className="cifra-etiqueta">Trabajos ganados</span>
          <strong>{pesos(r.valorGanado)}</strong>
          <span className="cifra-nota">{r.creditosGastados} créditos usados</span>
        </div>
      </div>

      <div className="filtros" role="group" aria-label="Filtrar cotizaciones">
        {FILTROS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
            {f.nombre}
          </button>
        ))}
      </div>

      {datos.cotizaciones.length === 0 ? (
        <div className="vacio">
          <strong>{filtro === 'todas' ? 'Aún no has enviado cotizaciones.' : 'No hay cotizaciones con este filtro.'}</strong>
          {filtro === 'todas' && <span>Ve a la pestaña Trabajos para cotizar los pedidos cerca de ti.</span>}
        </div>
      ) : (
        <ul className="lista-historial">
          {datos.cotizaciones.map((c) => (
            <li key={c.id} className={`historial-item estado-${c.estado}`}>
              <div className="historial-cabeza">
                <strong>#{c.codigo}</strong>
                <span className={`pastilla pastilla-${c.estado}`}>{ESTADO_COTIZACION[c.estado] ?? c.estado}</span>
              </div>
              <p className="historial-resumen">{c.resumen}</p>
              <div className="historial-datos">
                <span>{c.areas.join(', ')}</span>
                {c.ubicacion && <span>{c.ubicacion}</span>}
                <span>{fecha(c.enviadaEn)}</span>
              </div>
              <div className="historial-pie">
                <strong>{pesos(c.precioTotal)}</strong>
                <span className="sub">−{c.creditosCobrados} créditos</span>
              </div>
              {c.calificacion && (
                <p className="aviso aviso-info">
                  Te calificaron <strong>★ {c.calificacion.general.toFixed(1)}</strong> ·{' '}
                  <span className="confianza">Confianza {c.calificacion.confianza}</span>
                  {c.calificacion.comentario ? ` — “${c.calificacion.comentario}”` : ''}
                </p>
              )}
              {c.cliente && !c.calificacion && (
                <p className="aviso aviso-exito">
                  Cliente: <strong>{c.cliente.nombre}</strong> · {c.cliente.celular}{' '}
                  <a href={`https://wa.me/${c.cliente.celular.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                    Escribir por WhatsApp
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
