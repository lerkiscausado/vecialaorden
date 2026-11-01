'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { MisPedidos } from '@/components/cliente/MisPedidos';
import { Encabezado, Pie } from '@/components/Encabezado';
import { MisCalificaciones } from '@/components/maestro/MisCalificaciones';
import { MisCotizaciones } from '@/components/maestro/MisCotizaciones';
import { MisCreditos } from '@/components/maestro/MisCreditos';
import { TrabajosDisponibles } from '@/components/maestro/TrabajosDisponibles';
import { ZonaTrabajo } from '@/components/ZonaTrabajo';
import { api, borrarToken, ErrorApi, leerToken, Usuario } from '@/lib/api';

type Pestana = 'trabajos' | 'cotizaciones' | 'calificaciones' | 'creditos' | 'cuenta' | 'pedidos';

const VERIFICACION: Record<string, string> = {
  pendiente: 'Documentos pendientes de revisión',
  verificado: 'Maestro verificado',
  rechazado: 'Verificación rechazada',
};

const CLAVE_PESTANA = 'veci_pestana';

export default function Panel() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pestana, setPestana] = useState<Pestana | null>(null);

  const cargar = useCallback(async () => {
    try {
      const u = await api<Usuario>('/auth/yo');
      setUsuario(u);
      return u;
    } catch (err) {
      if (err instanceof ErrorApi && err.estado === 401) {
        borrarToken();
        router.replace('/ingresar?volver=/panel');
      } else {
        setError(err instanceof ErrorApi ? err.message : 'No pudimos cargar tu cuenta.');
      }
      return null;
    }
  }, [router]);

  useEffect(() => {
    if (!leerToken()) {
      router.replace('/ingresar?volver=/panel');
      return;
    }
    cargar().then((u) => {
      if (!u) return;
      let guardada: string | null = null;
      try {
        guardada = sessionStorage.getItem(CLAVE_PESTANA);
      } catch {
        /* sin almacenamiento */
      }
      const validas: Pestana[] = u.maestro
        ? ['trabajos', 'cotizaciones', 'calificaciones', 'creditos', 'cuenta', 'pedidos']
        : ['pedidos', 'cuenta'];
      setPestana(validas.includes(guardada as Pestana) ? (guardada as Pestana) : validas[0]);
    });
  }, [router, cargar]);

  function cambiar(p: Pestana) {
    setPestana(p);
    try {
      sessionStorage.setItem(CLAVE_PESTANA, p);
    } catch {
      /* sin almacenamiento */
    }
  }

  function salir() {
    borrarToken();
    router.push('/');
  }

  const m = usuario?.maestro;
  const pestanas: { id: Pestana; nombre: string }[] = m
    ? [
        { id: 'trabajos', nombre: 'Trabajos' },
        { id: 'cotizaciones', nombre: 'Mis cotizaciones' },
        { id: 'calificaciones', nombre: 'Calificaciones' },
        { id: 'creditos', nombre: `Créditos (${m.saldoCreditos})` },
        { id: 'cuenta', nombre: 'Mi zona y cuenta' },
      ]
    : [
        { id: 'pedidos', nombre: 'Mis pedidos' },
        { id: 'cuenta', nombre: 'Mi cuenta' },
      ];

  return (
    <>
      <Encabezado enlaces={false} />
      <main className="pagina contenedor">
        <div className="panel">
          {error && <p className="aviso aviso-error" role="alert">{error}</p>}
          {!usuario && !error && <p className="sub">Cargando tu cuenta…</p>}

          {usuario && (
            <>
              <div className="panel-cabeza">
                <div>
                  <h1>¡A la orden, {usuario.nombre.split(' ')[0]}!</h1>
                  {m && (
                    <p className="sub">
                      {VERIFICACION[m.verificacion] ?? m.verificacion} · {m.saldoCreditos} créditos
                      {m.totalResenas > 0 && (
                        <>
                          {' · '}★ {m.calificacionPromedio.toFixed(1)} · <span className="confianza">Confianza {m.confianzaPromedio.toFixed(1)}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>
                <div className="acciones">
                  {usuario.rol === 'superadmin' && (
                    <Link className="boton boton-primario" href="/admin">
                      Panel administrativo
                    </Link>
                  )}
                  {usuario.rol === 'admin' && (
                    <Link className="boton boton-secundario" href="/admin/simulador">
                      Simulador del bot
                    </Link>
                  )}
                </div>
              </div>

              <div className="pestanas" role="tablist" aria-label="Secciones del panel">
                {pestanas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    id={`tab-${p.id}`}
                    aria-selected={pestana === p.id}
                    aria-controls={`panel-${p.id}`}
                    onClick={() => cambiar(p.id)}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>

              <section role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`tab-${pestana}`} className="pestana-contenido">
                {pestana === 'trabajos' && m && <TrabajosDisponibles saldo={m.saldoCreditos} onCotizado={cargar} />}
                {pestana === 'cotizaciones' && <MisCotizaciones />}
                {pestana === 'calificaciones' && <MisCalificaciones />}
                {pestana === 'creditos' && m && <MisCreditos saldo={m.saldoCreditos} />}
                {pestana === 'pedidos' && <MisPedidos />}
                {pestana === 'cuenta' && (
                  <div className="historial">
                    {m && <ZonaTrabajo usuario={usuario} onGuardado={setUsuario} />}
                    <section className="tarjeta ancha">
                      <h2 style={{ fontSize: 20 }}>Mi cuenta</h2>
                      <dl className="lista-datos">
                        <dt>Celular</dt>
                        <dd>{usuario.celular}</dd>
                        {usuario.correo && (
                          <>
                            <dt>Correo</dt>
                            <dd>{usuario.correo}</dd>
                          </>
                        )}
                        {(usuario.ciudad || usuario.barrio) && (
                          <>
                            <dt>Ubicación</dt>
                            <dd>{[usuario.barrio, usuario.ciudad?.nombre].filter(Boolean).join(', ')}</dd>
                          </>
                        )}
                        {m && (
                          <>
                            <dt>Oficios</dt>
                            <dd className="chips">
                              {m.areas.map((a) => (
                                <span key={a.slug} className="chip">{a.nombre}</span>
                              ))}
                            </dd>
                          </>
                        )}
                      </dl>
                      <div className="acciones">
                        {m && (
                          <button type="button" className="boton boton-secundario" onClick={() => cambiar('pedidos')}>
                            Mis pedidos como cliente
                          </button>
                        )}
                        <button type="button" className="boton boton-secundario" onClick={salir}>
                          Cerrar sesión
                        </button>
                      </div>
                    </section>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <Pie />
    </>
  );
}
