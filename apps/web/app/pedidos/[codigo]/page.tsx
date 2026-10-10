'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Encabezado, Pie } from '@/components/Encabezado';
import { api, borrarToken, ErrorApi, leerToken } from '@/lib/api';
import { ESTADO_PEDIDO, minutos, pesos } from '@/lib/formato';

interface Cotizacion {
  id: number;
  posicion: number;
  puntaje: number;
  etiquetaPrecio: 'justo' | 'muy_bajo' | 'alto' | 'sin_referencia';
  precioTotal: number;
  manoDeObra: number;
  materiales: number;
  mensaje: string | null;
  fechaDisponible: string | null;
  duracionDias: number | null;
  minutosRespuesta: number;
  distanciaKm: number | null;
  estado: string;
  maestro: {
    nombre: string;
    verificado: boolean;
    calificacion: number;
    totalResenas: number;
    trabajosCompletados: number;
    aniosExperiencia: number;
    celular: string | null;
  };
}

interface Pedido {
  codigo: string;
  resumen: string;
  areas: string[];
  ubicacion: string | null;
  estado: string;
  cuposUsados: number;
  cuposMax: number;
  puedeElegir: boolean;
  cotizaciones: Cotizacion[];
}

type Orden = 'recomendado' | 'precio' | 'cercania' | 'calificacion' | 'rapidez';

const ORDENES: { id: Orden; nombre: string; fn: (a: Cotizacion, b: Cotizacion) => number }[] = [
  { id: 'recomendado', nombre: 'Recomendado', fn: (a, b) => a.posicion - b.posicion },
  { id: 'precio', nombre: 'Más barato', fn: (a, b) => a.precioTotal - b.precioTotal },
  { id: 'cercania', nombre: 'Más cercano', fn: (a, b) => (a.distanciaKm ?? 999) - (b.distanciaKm ?? 999) },
  { id: 'calificacion', nombre: 'Mejor calificado', fn: (a, b) => b.maestro.calificacion - a.maestro.calificacion },
  { id: 'rapidez', nombre: 'Respondió primero', fn: (a, b) => a.minutosRespuesta - b.minutosRespuesta },
];

const PRECIO: Record<Cotizacion['etiquetaPrecio'], { texto: string; clase: string } | null> = {
  justo: { texto: 'Precio justo', clase: 'pastilla-elegida' },
  muy_bajo: { texto: 'Muy bajo: pregunta qué incluye', clase: 'pastilla-alerta' },
  alto: { texto: 'Por encima de las demás', clase: 'pastilla-alerta' },
  sin_referencia: null,
};

export default function PaginaPedido() {
  const router = useRouter();
  const { codigo } = useParams<{ codigo: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>('recomendado');
  const [confirmar, setConfirmar] = useState<Cotizacion | null>(null);
  const [eligiendo, setEligiendo] = useState(false);

  const volverAqui = `/ingresar?volver=${encodeURIComponent(`/pedidos/${codigo}`)}`;

  const cargar = useCallback(async () => {
    try {
      setPedido(await api<Pedido>(`/pedidos/${encodeURIComponent(codigo)}`));
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 401) {
        borrarToken();
        router.replace(volverAqui);
      } else setError(err instanceof ErrorApi ? err.message : 'No pudimos cargar el pedido.');
    }
  }, [codigo, router, volverAqui]);

  useEffect(() => {
    if (!leerToken()) {
      router.replace(volverAqui);
      return;
    }
    cargar();
  }, [cargar, router, volverAqui]);

  async function elegir(c: Cotizacion) {
    setEligiendo(true);
    setError(null);
    try {
      setPedido(await api<Pedido>(`/pedidos/${encodeURIComponent(codigo)}/elegir`, { cuerpo: { cotizacionId: c.id } }));
      setConfirmar(null);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo elegir. Intenta de nuevo.');
    } finally {
      setEligiendo(false);
    }
  }

  const ordenadas = pedido ? [...pedido.cotizaciones].sort(ORDENES.find((o) => o.id === orden)!.fn) : [];
  const elegida = pedido?.cotizaciones.find((c) => c.estado === 'elegida');

  return (
    <>
      <Encabezado enlaces={false} />
      <main className="pagina contenedor">
        <div className="panel">
          <Link href="/panel">← Mis pedidos</Link>
          {error && <p className="aviso aviso-error" role="alert">{error}</p>}
          {!pedido && !error && <p className="sub">Cargando tu pedido…</p>}

          {pedido && (
            <>
              <section className="tarjeta ancha">
                <div className="historial-cabeza">
                  <h1 style={{ fontSize: 28 }}>Pedido #{pedido.codigo}</h1>
                  <span className={`pastilla pastilla-${pedido.estado}`}>{ESTADO_PEDIDO[pedido.estado] ?? pedido.estado}</span>
                </div>
                <p style={{ margin: 0 }}>{pedido.resumen}</p>
                <div className="historial-datos">
                  <span>{pedido.areas.join(', ')}</span>
                  {pedido.ubicacion && <span>{pedido.ubicacion}</span>}
                  <span>
                    {pedido.cuposUsados} de {pedido.cuposMax} cotizaciones
                  </span>
                </div>
              </section>

              {elegida && (
                <section className="tarjeta ancha elegido">
                  <h2 style={{ fontSize: 22 }}>Elegiste a {elegida.maestro.nombre}</h2>
                  <p style={{ margin: 0 }}>
                    Ya le avisamos y te escribirá para coordinar. Si quieres, escríbele tú:{' '}
                    <strong>{elegida.maestro.celular}</strong>
                  </p>
                  {elegida.maestro.celular && (
                    <div className="acciones">
                      <a
                        className="boton boton-whatsapp"
                        href={`https://wa.me/${elegida.maestro.celular.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Escribir por WhatsApp
                      </a>
                    </div>
                  )}
                </section>
              )}

              {pedido.cotizaciones.length === 0 ? (
                <div className="vacio">
                  <strong>Todavía no llegan cotizaciones.</strong>
                  <span>Les avisamos a los maestros cercanos. Te escribiremos por WhatsApp apenas llegue la primera.</span>
                </div>
              ) : (
                <>
                  <div className="filtros" role="group" aria-label="Ordenar cotizaciones">
                    {ORDENES.map((o) => (
                      <button key={o.id} type="button" aria-pressed={orden === o.id} onClick={() => setOrden(o.id)}>
                        {o.nombre}
                      </button>
                    ))}
                  </div>
                  <ul className="lista-cotizaciones">
                    {ordenadas.map((c) => {
                      const precio = PRECIO[c.etiquetaPrecio];
                      return (
                        <li key={c.id} className={`oferta ${c.posicion === 1 && pedido.puedeElegir ? 'oferta-top' : ''} estado-${c.estado}`}>
                          <div className="oferta-cabeza">
                            <div style={{ minWidth: 0 }}>
                              <strong className="oferta-nombre">
                                {c.maestro.nombre}
                                {c.maestro.verificado && <span className="verificado"> ✓ Verificado</span>}
                              </strong>
                              <div className="historial-datos">
                                <span>
                                  {c.maestro.totalResenas ? `★ ${c.maestro.calificacion.toFixed(1)} (${c.maestro.totalResenas})` : 'Nuevo en Veci'}
                                </span>
                                <span>{c.maestro.aniosExperiencia} años de experiencia</span>
                                {c.maestro.trabajosCompletados > 0 && <span>{c.maestro.trabajosCompletados} trabajos</span>}
                                {c.distanciaKm !== null && <span>a {c.distanciaKm} km</span>}
                                <span>respondió en {minutos(c.minutosRespuesta)}</span>
                              </div>
                            </div>
                            <div className="oferta-precio">
                              <strong>{pesos(c.precioTotal)}</strong>
                              <span className="sub">
                                Mano de obra {pesos(c.manoDeObra)}
                                {c.materiales ? ` + materiales ${pesos(c.materiales)}` : ''}
                              </span>
                            </div>
                          </div>
                          <div className="chips">
                            {c.posicion === 1 && <span className="pastilla pastilla-recomendada">Recomendada</span>}
                            {precio && <span className={`pastilla ${precio.clase}`}>{precio.texto}</span>}
                            {c.fechaDisponible && <span className="chip">Puede empezar el {c.fechaDisponible}</span>}
                            {c.duracionDias && <span className="chip">{c.duracionDias} días de trabajo</span>}
                            {c.estado !== 'enviada' && (
                              <span className={`pastilla pastilla-${c.estado}`}>{c.estado === 'elegida' ? 'Elegida' : 'No elegida'}</span>
                            )}
                          </div>
                          {c.mensaje && <p className="oferta-mensaje">“{c.mensaje}”</p>}
                          <div className="barra-puntaje" title={`Puntaje ${c.puntaje} de 100`}>
                            <span style={{ width: `${c.puntaje}%` }} />
                          </div>

                          {pedido.puedeElegir &&
                            (confirmar?.id === c.id ? (
                              <div className="acciones confirmar">
                                <span>
                                  ¿Elegir a <strong>{c.maestro.nombre}</strong> por {pesos(c.precioTotal)}? Les avisaremos a los demás.
                                </span>
                                <button type="button" className="boton boton-primario" disabled={eligiendo} onClick={() => elegir(c)}>
                                  {eligiendo ? 'Eligiendo…' : 'Sí, elegir'}
                                </button>
                                <button type="button" className="boton boton-secundario" onClick={() => setConfirmar(null)}>
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="acciones">
                                <button type="button" className="boton boton-primario" onClick={() => setConfirmar(c)}>
                                  Elegir este maestro
                                </button>
                              </div>
                            ))}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="sub">
                    El orden recomendado combina calificación (30%), precio justo (25%), rapidez (20%), cercanía (15%) y
                    experiencia (10%).
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Pie />
    </>
  );
}
