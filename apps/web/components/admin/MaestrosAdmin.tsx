'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, Ciudad, ErrorApi } from '@/lib/api';
import { fecha } from '@/lib/formato';

interface Maestro {
  id: number;
  nombre: string;
  celular: string;
  correo: string | null;
  estado: string;
  ciudad: string | null;
  barrio: string | null;
  ubicacionAproximada: boolean;
  oficios: string;
  verificacion: string;
  saldoCreditos: number;
  radioKm: number;
  aniosExperiencia: number;
  calificacion: number;
  totalResenas: number;
  cotizaciones: number;
  elegidas: number;
  creadoEn: string;
}

const VERIF: Record<string, string> = { pendiente: 'Pendiente', verificado: 'Verificado', rechazado: 'Rechazado' };

export function MaestrosAdmin({ ciudades }: { ciudades: Ciudad[] }) {
  const [lista, setLista] = useState<Maestro[] | null>(null);
  const [buscar, setBuscar] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [verificacion, setVerificacion] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [ajuste, setAjuste] = useState<{ id: number; cantidad: string; motivo: string } | null>(null);

  const cargar = useCallback(async () => {
    const p = new URLSearchParams();
    if (buscar.trim()) p.set('buscar', buscar.trim());
    if (ciudadId) p.set('ciudadId', ciudadId);
    if (verificacion) p.set('verificacion', verificacion);
    try {
      setLista(await api<Maestro[]>(`/admin/maestros?${p}`));
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof ErrorApi ? err.message : 'No se pudo cargar la lista.' });
    }
  }, [buscar, ciudadId, verificacion]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  async function accion(texto: string, llamada: () => Promise<unknown>) {
    setAviso(null);
    try {
      await llamada();
      setAviso({ tipo: 'exito', texto });
      await cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof ErrorApi ? err.message : 'No se pudo completar.' });
    }
  }

  return (
    <div className="historial">
      <div className="filtros-admin">
        <label className="campo" htmlFor="adm-buscar">
          Buscar
          <input id="adm-buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre, celular o correo" />
        </label>
        <label className="campo" htmlFor="adm-ciudad">
          Ciudad
          <select id="adm-ciudad" value={ciudadId} onChange={(e) => setCiudadId(e.target.value)}>
            <option value="">Todas</option>
            {ciudades.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label className="campo" htmlFor="adm-verif">
          Verificación
          <select id="adm-verif" value={verificacion} onChange={(e) => setVerificacion(e.target.value)}>
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="verificado">Verificados</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </label>
      </div>

      {aviso && (
        <p className={`aviso aviso-${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      )}
      {!lista && <p className="sub">Cargando…</p>}
      {lista && lista.length === 0 && <p className="sub">No hay maestros con esos filtros.</p>}

      {lista && lista.length > 0 && (
        <ul className="lista-historial">
          {lista.map((m) => (
            <li key={m.id} className={`historial-item ${m.estado === 'suspendido' ? 'trabajo-inactivo' : ''}`}>
              <div className="historial-cabeza">
                <strong>{m.nombre}</strong>
                <div className="chips">
                  <span className={`pastilla pastilla-verif-${m.verificacion}`}>{VERIF[m.verificacion]}</span>
                  {m.estado === 'suspendido' && <span className="pastilla pastilla-alerta">Suspendido</span>}
                </div>
              </div>
              <div className="historial-datos">
                <span>{m.celular}</span>
                {m.correo && <span>{m.correo}</span>}
                <span>
                  {[m.barrio, m.ciudad].filter(Boolean).join(', ') || 'Sin ubicación'}
                  {m.ubicacionAproximada ? ' (aprox.)' : ''} · radio {m.radioKm} km
                </span>
              </div>
              <div className="historial-datos">
                <span>{m.oficios || 'Sin oficios'}</span>
                <span>{m.aniosExperiencia} años</span>
                <span>
                  {m.cotizaciones} cotizaciones · {m.elegidas} elegidas
                </span>
                <span>
                  <strong>{m.saldoCreditos}</strong> créditos
                </span>
                <span>Registro: {fecha(m.creadoEn)}</span>
              </div>

              {ajuste?.id === m.id ? (
                <form
                  className="fila-ajuste"
                  onSubmit={(e) => {
                    e.preventDefault();
                    accion(`Se ajustaron los créditos de ${m.nombre}.`, () =>
                      api(`/admin/maestros/${m.id}/creditos`, {
                        cuerpo: { cantidad: Number(ajuste.cantidad), motivo: ajuste.motivo },
                      }),
                    ).then(() => setAjuste(null));
                  }}
                >
                  <label className="campo" htmlFor={`aj-c-${m.id}`}>
                    Créditos (+ suma, − resta)
                    <input
                      id={`aj-c-${m.id}`}
                      value={ajuste.cantidad}
                      onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value.replace(/[^\d-]/g, '') })}
                      placeholder="Ej: 10 o -5"
                      required
                    />
                  </label>
                  <label className="campo" htmlFor={`aj-m-${m.id}`}>
                    Motivo
                    <input
                      id={`aj-m-${m.id}`}
                      value={ajuste.motivo}
                      onChange={(e) => setAjuste({ ...ajuste, motivo: e.target.value })}
                      placeholder="Ej: compensación por pedido falso"
                      required
                    />
                  </label>
                  <div className="acciones">
                    <button className="boton boton-primario" type="submit" disabled={!ajuste.cantidad || ajuste.motivo.trim().length < 3}>
                      Aplicar ajuste
                    </button>
                    <button type="button" className="boton boton-secundario" onClick={() => setAjuste(null)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="acciones">
                  {m.verificacion !== 'verificado' && (
                    <button
                      type="button"
                      className="boton boton-primario"
                      onClick={() =>
                        accion(`${m.nombre} quedó verificado.`, () =>
                          api(`/admin/maestros/${m.id}/verificacion`, { metodo: 'PATCH', cuerpo: { verificacion: 'verificado' } }),
                        )
                      }
                    >
                      Verificar
                    </button>
                  )}
                  {m.verificacion !== 'rechazado' && (
                    <button
                      type="button"
                      className="boton boton-secundario"
                      onClick={() =>
                        accion(`Se rechazó la verificación de ${m.nombre}.`, () =>
                          api(`/admin/maestros/${m.id}/verificacion`, { metodo: 'PATCH', cuerpo: { verificacion: 'rechazado' } }),
                        )
                      }
                    >
                      Rechazar verificación
                    </button>
                  )}
                  <button type="button" className="boton boton-secundario" onClick={() => setAjuste({ id: m.id, cantidad: '', motivo: '' })}>
                    Ajustar créditos
                  </button>
                  <button
                    type="button"
                    className="enlace-boton"
                    onClick={() => {
                      const nuevo = m.estado === 'suspendido' ? 'activo' : 'suspendido';
                      accion(nuevo === 'activo' ? `${m.nombre} fue reactivado.` : `${m.nombre} fue suspendido.`, () =>
                        api(`/admin/usuarios/${m.id}/estado`, { metodo: 'PATCH', cuerpo: { estado: nuevo } }),
                      );
                    }}
                  >
                    {m.estado === 'suspendido' ? 'Reactivar cuenta' : 'Suspender cuenta'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
