'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Encabezado, Pie } from '@/components/Encabezado';
import { api, borrarToken, ErrorApi, leerToken, Usuario } from '@/lib/api';

interface Mensaje {
  id: number | string;
  direccion: 'entrante' | 'saliente';
  tipo: string;
  texto: string | null;
  ubicacion: { latitud: number; longitud: number } | null;
}

interface Solicitud {
  codigo: string;
  estado: string;
  resumen: string | null;
  areas: { slug: string; nombre: string }[];
  ciudad: string | null;
  barrio: string | null;
  latitud: number | null;
  longitud: number | null;
  ubicacionAproximada: boolean;
  medidas: Record<string, number> | null;
  tamano: string;
  urgente: boolean;
  creditosPorCotizacion: number;
  cuposMax: number;
  maestrosAvisados: { nombre: string; distanciaKm: number | null; canal: string }[];
}

interface Vista {
  estado: string;
  solicitud: Solicitud | null;
  mensajes: Mensaje[];
}

/** Puntos de prueba para "enviar ubicación" sin tener que estar allá. */
const PUNTOS = [
  { nombre: 'Cedritos, Bogotá', latitud: 4.724, longitud: -74.041 },
  { nombre: 'Chapinero, Bogotá', latitud: 4.645, longitud: -74.064 },
  { nombre: 'Kennedy, Bogotá', latitud: 4.627, longitud: -74.151 },
  { nombre: 'Manga, Cartagena', latitud: 10.411, longitud: -75.538 },
  { nombre: 'Bocagrande, Cartagena', latitud: 10.399, longitud: -75.553 },
  { nombre: 'Medellín (sin servicio)', latitud: 6.2442, longitud: -75.5812 },
];

const ESTADOS: Record<string, string> = {
  inicio: 'Esperando el pedido',
  esperando_ciudad: 'Esperando la ciudad',
  esperando_ubicacion: 'Esperando la ubicación',
  esperando_confirmacion: 'Esperando confirmación',
  publicada: 'Pedido publicado',
};

const EJEMPLOS = [
  'Hola',
  'Quiero estuco en las paredes y cielo raso en drywall en un cuarto de 3x4, vivo en Cedritos, Bogotá',
  'Tengo una fuga en el lavaplatos, es urgente',
  'Sí',
  'Cancelar',
];

/** WhatsApp usa *negrita* y _cursiva_; aquí se muestran igual. */
function Formato({ texto }: { texto: string }) {
  const partes = texto.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith('*') && p.endsWith('*') && p.length > 2 ? (
          <strong key={i}>{p.slice(1, -1)}</strong>
        ) : p.startsWith('_') && p.endsWith('_') && p.length > 2 ? (
          <em key={i}>{p.slice(1, -1)}</em>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function Simulador() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [celular, setCelular] = useState('3201000001');
  const [nombre, setNombre] = useState('Cliente de prueba');
  const [texto, setTexto] = useState('');
  const [vista, setVista] = useState<Vista>({ estado: 'inicio', solicitud: null, mensajes: [] });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chat = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async (cel: string) => {
    if (cel.replace(/\D/g, '').length < 10) return;
    try {
      setVista(await api<Vista>(`/admin/simulador/${encodeURIComponent(cel)}`));
      setError(null);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo cargar la conversación.');
    }
  }, []);

  useEffect(() => {
    if (!leerToken()) {
      router.replace('/ingresar');
      return;
    }
    api<Usuario>('/auth/yo')
      .then((u) => {
        const ok = u.rol === 'superadmin' || u.rol === 'admin';
        setAutorizado(ok);
        if (ok) cargar(celular);
      })
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) {
          borrarToken();
          router.replace('/ingresar');
        } else setAutorizado(false);
      });
    // Solo al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, cargar]);

  useEffect(() => {
    chat.current?.scrollTo({ top: chat.current.scrollHeight, behavior: 'smooth' });
  }, [vista.mensajes.length]);

  async function enviar(cuerpo: { texto?: string; ubicacion?: { latitud: number; longitud: number } }) {
    if (enviando) return;
    setError(null);
    setEnviando(true);
    const temporal: Mensaje = {
      id: `t${Date.now()}`,
      direccion: 'entrante',
      tipo: cuerpo.ubicacion ? 'location' : 'text',
      texto: cuerpo.texto ?? null,
      ubicacion: cuerpo.ubicacion ?? null,
    };
    setVista((v) => ({ ...v, mensajes: [...v.mensajes, temporal] }));
    try {
      await api('/admin/simulador/mensajes', { cuerpo: { celular, nombre, ...cuerpo } });
      setTexto('');
      await cargar(celular);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo enviar.');
      setVista((v) => ({ ...v, mensajes: v.mensajes.filter((m) => m.id !== temporal.id) }));
    } finally {
      setEnviando(false);
    }
  }

  async function reiniciar() {
    setError(null);
    try {
      await api(`/admin/simulador/${encodeURIComponent(celular)}`, { metodo: 'DELETE' });
      await cargar(celular);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo reiniciar.');
    }
  }

  const s = vista.solicitud;

  return (
    <>
      <Encabezado enlaces={false} />
      <main className="pagina contenedor">
        <div className="acciones" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 32 }}>Simulador del bot</h1>
            <p className="sub">
              Chatea como si fueras un cliente por WhatsApp. Usa el mismo cerebro y la misma IA que usará el bot real.
            </p>
          </div>
          <Link href="/panel">Volver al panel</Link>
        </div>

        {autorizado === null && <p className="sub">Cargando…</p>}
        {autorizado === false && (
          <p className="aviso aviso-error" role="alert">Esta sección es solo para administradores.</p>
        )}

        {autorizado && (
          <div className="simulador">
            <section className="telefono" aria-label="Conversación de prueba">
              <div className="telefono-barra">
                <span className="marca-icono" aria-hidden="true">V</span>
                <div>
                  <strong>Veci a la Orden</strong>
                  <small>{enviando ? 'escribiendo…' : 'en línea'}</small>
                </div>
              </div>
              <div className="telefono-chat" ref={chat} aria-live="polite">
                {vista.mensajes.length === 0 && (
                  <p className="burbuja-sistema">Escribe un mensaje para empezar la conversación.</p>
                )}
                {vista.mensajes.map((m) => (
                  <div key={m.id} className={m.direccion === 'entrante' ? 'burbuja burbuja-cliente' : 'burbuja burbuja-bot'}>
                    {m.ubicacion ? (
                      <span>📍 Ubicación: {m.ubicacion.latitud.toFixed(4)}, {m.ubicacion.longitud.toFixed(4)}</span>
                    ) : (
                      <Formato texto={m.texto ?? ''} />
                    )}
                  </div>
                ))}
                {enviando && <div className="burbuja burbuja-bot escribiendo" aria-label="El bot está escribiendo">• • •</div>}
              </div>
              <form
                className="telefono-entrada"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (texto.trim()) enviar({ texto: texto.trim() });
                }}
              >
                <label htmlFor="sim-texto" className="solo-lectores">Mensaje</label>
                <textarea
                  id="sim-texto"
                  rows={2}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (texto.trim()) enviar({ texto: texto.trim() });
                    }
                  }}
                  placeholder="Escribe como cliente…"
                  disabled={enviando}
                />
                <button className="boton boton-whatsapp" type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar mensaje">
                  Enviar
                </button>
              </form>
            </section>

            <div className="simulador-lado">
              <section className="tarjeta ancha">
                <h2 style={{ fontSize: 20 }}>Cliente de prueba</h2>
                <div className="dos-columnas">
                  <label className="campo" htmlFor="sim-celular">
                    Celular
                    <input
                      id="sim-celular"
                      value={celular}
                      onChange={(e) => setCelular(e.target.value)}
                      onBlur={() => cargar(celular)}
                    />
                  </label>
                  <label className="campo" htmlFor="sim-nombre">
                    Nombre en WhatsApp
                    <input id="sim-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  </label>
                </div>
                <div>
                  <p className="campo" style={{ margin: '0 0 6px' }}>Enviar ubicación 📍</p>
                  <div className="chips">
                    {PUNTOS.map((p) => (
                      <button
                        key={p.nombre}
                        type="button"
                        className="chip chip-boton"
                        disabled={enviando}
                        onClick={() => enviar({ ubicacion: { latitud: p.latitud, longitud: p.longitud } })}
                      >
                        {p.nombre}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="campo" style={{ margin: '0 0 6px' }}>Mensajes de ejemplo</p>
                  <div className="chips">
                    {EJEMPLOS.map((t) => (
                      <button key={t} type="button" className="chip chip-boton" onClick={() => setTexto(t)}>
                        {t.length > 40 ? `${t.slice(0, 40)}…` : t}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="aviso aviso-error" role="alert">{error}</p>}
                <div className="acciones">
                  <button type="button" className="boton boton-secundario" onClick={reiniciar}>
                    Reiniciar conversación
                  </button>
                </div>
              </section>

              <section className="tarjeta ancha">
                <div className="acciones" style={{ justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: 20 }}>Lo que pasa por detrás</h2>
                  <span className="estado estado-activa">{ESTADOS[vista.estado] ?? vista.estado}</span>
                </div>
                {!s && <p className="sub">Cuando el cliente cuente su pedido, aquí verás lo que entendió la IA.</p>}
                {s && (
                  <>
                    <dl className="lista-datos">
                      <dt>Pedido</dt>
                      <dd>#{s.codigo} · {s.estado}</dd>
                      <dt>Áreas</dt>
                      <dd className="chips">
                        {s.areas.map((a) => (
                          <span key={a.slug} className="chip">{a.nombre}</span>
                        ))}
                      </dd>
                      {s.resumen && (
                        <>
                          <dt>Resumen</dt>
                          <dd>{s.resumen}</dd>
                        </>
                      )}
                      <dt>Lugar</dt>
                      <dd>
                        {[s.barrio, s.ciudad].filter(Boolean).join(', ') || '—'}
                        {s.latitud !== null && (
                          <small className="sub"> ({s.ubicacionAproximada ? 'aproximada' : 'exacta'}: {s.latitud}, {s.longitud})</small>
                        )}
                      </dd>
                      {s.medidas && (
                        <>
                          <dt>Medidas</dt>
                          <dd>
                            {s.medidas.ancho && s.medidas.largo ? `${s.medidas.ancho} × ${s.medidas.largo} m` : ''}
                            {s.medidas.areaPiso ? ` · piso ${s.medidas.areaPiso} m² · paredes ${s.medidas.areaParedes} m²` : ''}
                          </dd>
                        </>
                      )}
                      <dt>Tamaño</dt>
                      <dd>
                        {s.tamano} · cotizar cuesta {s.creditosPorCotizacion} crédito{s.creditosPorCotizacion === 1 ? '' : 's'}
                        {s.urgente ? ' · urgente' : ''}
                      </dd>
                    </dl>
                    <div>
                      <h3 style={{ fontSize: 16, marginBottom: 6 }}>Maestros avisados ({s.maestrosAvisados.length})</h3>
                      {s.maestrosAvisados.length === 0 ? (
                        <p className="sub">
                          {s.estado === 'borrador' ? 'Se avisa al confirmar el pedido.' : 'Ningún maestro cumple área y distancia.'}
                        </p>
                      ) : (
                        <div className="tabla-caja">
                          <table className="tabla">
                            <thead>
                              <tr>
                                <th>Maestro</th>
                                <th className="num">Distancia</th>
                                <th>Canal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.maestrosAvisados.map((m, i) => (
                                <tr key={i}>
                                  <td>{m.nombre}</td>
                                  <td className="num">{m.distanciaKm ?? '—'} km</td>
                                  <td>{m.canal}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
      <Pie />
    </>
  );
}
