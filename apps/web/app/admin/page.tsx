'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GraficoBarras } from '@/components/admin/GraficoBarras';
import { MaestrosAdmin } from '@/components/admin/MaestrosAdmin';
import { Encabezado, Pie } from '@/components/Encabezado';
import { api, borrarToken, Ciudad, ErrorApi, leerToken, Usuario } from '@/lib/api';
import { ESTADO_PEDIDO, hace, minutos, num, pesos } from '@/lib/formato';

interface Resumen {
  dias: number;
  usuarios: { clientes: number; maestros: number; nuevos: number; suspendidos: number };
  maestros: {
    activos: number;
    verificados: number;
    pendientesVerificacion: number;
    sinUbicacionExacta: number;
    sinCreditos: number;
    confianzaBaja: number;
  };
  calificaciones: { total: number; general: number | null; confianza: number | null };
  pedidos: {
    publicados: number;
    conCotizacion: number;
    asignados: number;
    porcentajeConCotizacion: number | null;
    porcentajeAsignados: number | null;
    cotizacionesPromedio: number;
    minutosPrimeraCotizacion: number | null;
    porEstado: Record<string, number>;
  };
  cotizaciones: { enviadas: number; elegidas: number };
  creditos: { comprados: number; regalados: number; consumidos: number; devueltos: number; ajustes: number; saldoEnCirculacion: number };
  ingresos: { pagos: number; total: number };
  ia: { llamadas: number; errores: number };
  porCiudad: { id: number; nombre: string; maestros: number; pedidos: number }[];
  serie: { dia: string; pedidos: number; cotizaciones: number }[];
}

interface PedidoAdmin {
  codigo: string;
  estado: string;
  resumen: string;
  oficios: string;
  urgente: boolean;
  ciudad: string | null;
  barrio: string | null;
  cliente: string;
  clienteCelular: string;
  maestroAsignado: string | null;
  avisados: number;
  cotizaciones: number;
  cuposMax: number;
  publicadaEn: string | null;
}

type Pestana = 'resumen' | 'maestros' | 'pedidos';

export default function PanelAdmin() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const [dias, setDias] = useState(30);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [pedidos, setPedidos] = useState<PedidoAdmin[] | null>(null);
  const [estadoPedido, setEstadoPedido] = useState('');
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leerToken()) {
      router.replace('/ingresar?volver=/admin');
      return;
    }
    api<Usuario>('/auth/yo')
      .then((u) => setAutorizado(u.rol === 'superadmin'))
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) {
          borrarToken();
          router.replace('/ingresar?volver=/admin');
        } else setAutorizado(false);
      });
    api<Ciudad[]>('/ciudades').then(setCiudades).catch(() => setCiudades([]));
  }, [router]);

  useEffect(() => {
    if (!autorizado) return;
    api<Resumen>(`/admin/resumen?dias=${dias}`)
      .then(setResumen)
      .catch((err) => setError(err instanceof ErrorApi ? err.message : 'No se pudo cargar el resumen.'));
  }, [autorizado, dias]);

  useEffect(() => {
    if (!autorizado || pestana !== 'pedidos') return;
    setPedidos(null);
    api<PedidoAdmin[]>(`/admin/pedidos${estadoPedido ? `?estado=${estadoPedido}` : ''}`)
      .then(setPedidos)
      .catch((err) => setError(err instanceof ErrorApi ? err.message : 'No se pudieron cargar los pedidos.'));
  }, [autorizado, pestana, estadoPedido]);

  const r = resumen;

  return (
    <>
      <Encabezado enlaces={false} />
      <main className="pagina contenedor">
        <div className="panel panel-ancho">
          <div className="panel-cabeza">
            <div>
              <h1>Panel administrativo</h1>
              <p className="sub">Solo para el superadministrador.</p>
            </div>
            <div className="acciones">
              <Link className="boton boton-secundario" href="/admin/ia">Configuración de IA</Link>
              <Link className="boton boton-secundario" href="/admin/simulador">Simulador del bot</Link>
              <Link href="/panel">Mi panel</Link>
            </div>
          </div>

          {autorizado === null && <p className="sub">Cargando…</p>}
          {autorizado === false && <p className="aviso aviso-error" role="alert">Esta sección es solo para el superadministrador.</p>}
          {error && <p className="aviso aviso-error" role="alert">{error}</p>}

          {autorizado && (
            <>
              <div className="pestanas" role="tablist" aria-label="Secciones del panel administrativo">
                {(
                  [
                    ['resumen', 'Resumen'],
                    ['maestros', `Maestros${r?.maestros.pendientesVerificacion ? ` (${r.maestros.pendientesVerificacion} por verificar)` : ''}`],
                    ['pedidos', 'Pedidos'],
                  ] as [Pestana, string][]
                ).map(([id, nombre]) => (
                  <button key={id} type="button" role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}>
                    {nombre}
                  </button>
                ))}
              </div>

              {pestana === 'resumen' && (
                <section className="historial">
                  <div className="filtros" role="group" aria-label="Periodo">
                    {[7, 30, 90].map((d) => (
                      <button key={d} type="button" aria-pressed={dias === d} onClick={() => setDias(d)}>
                        Últimos {d} días
                      </button>
                    ))}
                  </div>

                  {!r && <p className="sub">Cargando cifras…</p>}
                  {r && (
                    <>
                      <div className="cifras">
                        <div className="cifra">
                          <span className="cifra-etiqueta">Pedidos publicados</span>
                          <strong>{num(r.pedidos.publicados)}</strong>
                          <span className="cifra-nota">
                            {r.pedidos.porcentajeConCotizacion ?? 0}% recibió cotizaciones
                          </span>
                        </div>
                        <div className="cifra cifra-exito">
                          <span className="cifra-etiqueta">Maestro elegido</span>
                          <strong>{num(r.pedidos.asignados)}</strong>
                          <span className="cifra-nota">{r.pedidos.porcentajeAsignados ?? 0}% de los pedidos</span>
                        </div>
                        <div className="cifra">
                          <span className="cifra-etiqueta">Cotizaciones</span>
                          <strong>{num(r.cotizaciones.enviadas)}</strong>
                          <span className="cifra-nota">
                            {r.pedidos.cotizacionesPromedio} por pedido · 1.ª en {minutos(r.pedidos.minutosPrimeraCotizacion)}
                          </span>
                        </div>
                        <div className="cifra cifra-confianza">
                          <span className="cifra-etiqueta">Confianza promedio</span>
                          <strong>{r.calificaciones.confianza !== null ? r.calificaciones.confianza.toFixed(1) : '—'}</strong>
                          <span className="cifra-nota">
                            {num(r.calificaciones.total)} calificaciones
                            {r.calificaciones.general !== null ? ` · general ${r.calificaciones.general.toFixed(1)}` : ''}
                          </span>
                        </div>
                        <div className="cifra">
                          <span className="cifra-etiqueta">Ingresos</span>
                          <strong>{pesos(r.ingresos.total)}</strong>
                          <span className="cifra-nota">{num(r.ingresos.pagos)} compras de créditos</span>
                        </div>
                      </div>

                      <div className="graficos">
                        <GraficoBarras titulo="Pedidos por día" unidad="pedidos" datos={r.serie.map((s) => ({ dia: s.dia, valor: s.pedidos }))} />
                        <GraficoBarras
                          titulo="Cotizaciones por día"
                          unidad="cotizaciones"
                          datos={r.serie.map((s) => ({ dia: s.dia, valor: s.cotizaciones }))}
                        />
                      </div>

                      <div className="cuadricula-admin">
                        <section className="tarjeta ancha">
                          <h2 style={{ fontSize: 18 }}>Maestros</h2>
                          <dl className="lista-datos">
                            <dt>Activos</dt>
                            <dd>{num(r.maestros.activos)}</dd>
                            <dt>Verificados</dt>
                            <dd>{num(r.maestros.verificados)}</dd>
                            <dt>Por verificar</dt>
                            <dd>
                              {r.maestros.pendientesVerificacion > 0 ? (
                                <button type="button" className="enlace-boton" onClick={() => setPestana('maestros')}>
                                  {num(r.maestros.pendientesVerificacion)} — revisar
                                </button>
                              ) : (
                                0
                              )}
                            </dd>
                            <dt>Confianza baja</dt>
                            <dd>
                              {r.maestros.confianzaBaja > 0 ? (
                                <button type="button" className="enlace-boton texto-alerta" onClick={() => setPestana('maestros')}>
                                  {num(r.maestros.confianzaBaja)} — revisar
                                </button>
                              ) : (
                                0
                              )}
                            </dd>
                            <dt>Sin créditos</dt>
                            <dd>{num(r.maestros.sinCreditos)}</dd>
                            <dt>Ubicación aproximada</dt>
                            <dd>{num(r.maestros.sinUbicacionExacta)}</dd>
                          </dl>
                        </section>
                        <section className="tarjeta ancha">
                          <h2 style={{ fontSize: 18 }}>Créditos en el periodo</h2>
                          <dl className="lista-datos">
                            <dt>Comprados</dt>
                            <dd>{num(r.creditos.comprados)}</dd>
                            <dt>Regalados</dt>
                            <dd>{num(r.creditos.regalados)}</dd>
                            <dt>Usados en cotizaciones</dt>
                            <dd>{num(r.creditos.consumidos)}</dd>
                            <dt>Ajustes</dt>
                            <dd>{num(r.creditos.ajustes)}</dd>
                            <dt>Saldo total de maestros</dt>
                            <dd>{num(r.creditos.saldoEnCirculacion)}</dd>
                          </dl>
                        </section>
                        <section className="tarjeta ancha">
                          <h2 style={{ fontSize: 18 }}>Por ciudad</h2>
                          <div className="tabla-caja">
                            <table className="tabla">
                              <thead>
                                <tr>
                                  <th>Ciudad</th>
                                  <th className="num">Maestros</th>
                                  <th className="num">Pedidos</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.porCiudad.map((c) => (
                                  <tr key={c.id}>
                                    <td>{c.nombre}</td>
                                    <td className="num">{num(c.maestros)}</td>
                                    <td className="num">{num(c.pedidos)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                        <section className="tarjeta ancha">
                          <h2 style={{ fontSize: 18 }}>Usuarios e IA</h2>
                          <dl className="lista-datos">
                            <dt>Clientes</dt>
                            <dd>{num(r.usuarios.clientes)}</dd>
                            <dt>Cuentas nuevas</dt>
                            <dd>{num(r.usuarios.nuevos)}</dd>
                            <dt>Suspendidas</dt>
                            <dd>{num(r.usuarios.suspendidos)}</dd>
                            <dt>Llamadas a la IA</dt>
                            <dd>
                              {num(r.ia.llamadas)}
                              {r.ia.errores > 0 && <span className="texto-alerta"> · {num(r.ia.errores)} con error</span>}
                            </dd>
                          </dl>
                        </section>
                      </div>
                    </>
                  )}
                </section>
              )}

              {pestana === 'maestros' && <MaestrosAdmin ciudades={ciudades} />}

              {pestana === 'pedidos' && (
                <section className="historial">
                  <div className="filtros-admin">
                    <label className="campo" htmlFor="adm-estado">
                      Estado
                      <select id="adm-estado" value={estadoPedido} onChange={(e) => setEstadoPedido(e.target.value)}>
                        <option value="">Todos</option>
                        {Object.entries(ESTADO_PEDIDO)
                          .filter(([k]) => k !== 'borrador')
                          .map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                      </select>
                    </label>
                  </div>
                  {!pedidos && <p className="sub">Cargando…</p>}
                  {pedidos && pedidos.length === 0 && <p className="sub">No hay pedidos con ese filtro.</p>}
                  {pedidos && pedidos.length > 0 && (
                    <div className="tabla-caja">
                      <table className="tabla tabla-pedidos">
                        <thead>
                          <tr>
                            <th>Pedido</th>
                            <th>Trabajo</th>
                            <th>Cliente</th>
                            <th>Lugar</th>
                            <th className="num">Avisados</th>
                            <th className="num">Cotizaciones</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pedidos.map((p) => (
                            <tr key={p.codigo}>
                              <td>
                                <strong>#{p.codigo}</strong>
                                <div className="sub">{hace(p.publicadaEn)}</div>
                              </td>
                              <td>
                                {p.oficios}
                                {p.urgente && <span className="texto-alerta"> · urgente</span>}
                                <div className="sub">{p.resumen}</div>
                              </td>
                              <td>
                                {p.cliente}
                                <div className="sub">{p.clienteCelular}</div>
                              </td>
                              <td>{[p.barrio, p.ciudad].filter(Boolean).join(', ') || '—'}</td>
                              <td className="num">{p.avisados}</td>
                              <td className="num">
                                {p.cotizaciones}/{p.cuposMax}
                              </td>
                              <td>
                                <span className={`pastilla pastilla-${p.estado}`}>{ESTADO_PEDIDO[p.estado] ?? p.estado}</span>
                                {p.maestroAsignado && <div className="sub">{p.maestroAsignado}</div>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <Pie />
    </>
  );
}
