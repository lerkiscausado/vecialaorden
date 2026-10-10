'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Encabezado, Pie } from '@/components/Encabezado';
import { ZonaTrabajo } from '@/components/ZonaTrabajo';
import { api, borrarToken, ErrorApi, leerToken, Movimiento, Usuario } from '@/lib/api';

const TIPOS: Record<string, string> = {
  compra: 'Compra',
  regalo: 'Regalo',
  cotizacion: 'Cotización',
  devolucion: 'Devolución',
  vencimiento: 'Vencimiento',
  ajuste: 'Ajuste',
};

const VERIFICACION: Record<string, string> = {
  pendiente: 'Documentos pendientes de revisión',
  verificado: 'Maestro verificado',
  rechazado: 'Verificación rechazada',
};

const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export default function Panel() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leerToken()) {
      router.replace('/ingresar');
      return;
    }
    api<Usuario>('/auth/yo')
      .then(async (u) => {
        setUsuario(u);
        if (u.rol === 'maestro') setMovimientos(await api<Movimiento[]>('/creditos/movimientos'));
      })
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) {
          borrarToken();
          router.replace('/ingresar');
        } else {
          setError(err instanceof ErrorApi ? err.message : 'No pudimos cargar tu cuenta.');
        }
      });
  }, [router]);

  function salir() {
    borrarToken();
    router.push('/');
  }

  return (
    <>
      <Encabezado enlaces={false} />
      <main className="pagina contenedor">
        <div className="panel">
          {error && <p className="aviso aviso-error" role="alert">{error}</p>}
          {!usuario && !error && <p className="sub">Cargando tu cuenta…</p>}

          {usuario && (
            <>
              <div className="tarjeta" style={{ maxWidth: 'none', margin: 0 }}>
                <div>
                  <h1>¡A la orden, {usuario.nombre.split(' ')[0]}!</h1>
                  <p className="sub">
                    {usuario.rol === 'maestro'
                      ? 'Aquí verás tus créditos y, muy pronto, los trabajos cerca de ti.'
                      : 'Cuando necesites un arreglo, escríbenos por WhatsApp y te mandamos las cotizaciones.'}
                  </p>
                </div>
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
                  {usuario.maestro && (
                    <>
                      <dt>Oficios</dt>
                      <dd className="chips">
                        {usuario.maestro.areas.map((a) => (
                          <span key={a.slug} className="chip">{a.nombre}</span>
                        ))}
                      </dd>
                      <dt>Estado</dt>
                      <dd>{VERIFICACION[usuario.maestro.verificacion] ?? usuario.maestro.verificacion}</dd>
                    </>
                  )}
                </dl>
                <div className="acciones">
                  {usuario.rol === 'superadmin' && (
                    <Link className="boton boton-primario" href="/admin/ia">
                      Configuración de IA
                    </Link>
                  )}
                  {(usuario.rol === 'superadmin' || usuario.rol === 'admin') && (
                    <Link className="boton boton-secundario" href="/admin/simulador">
                      Simulador del bot
                    </Link>
                  )}
                  <button type="button" className="boton boton-secundario" onClick={salir}>
                    Cerrar sesión
                  </button>
                </div>
              </div>

              {usuario.maestro && <ZonaTrabajo usuario={usuario} onGuardado={setUsuario} />}

              {usuario.maestro && (
                <div className="tarjeta" style={{ maxWidth: 'none', margin: 0 }}>
                  <h2>Tus créditos</h2>
                  <div className="saldo">
                    <strong>{usuario.maestro.saldoCreditos}</strong>
                    <span className="sub">créditos disponibles para cotizar</span>
                  </div>
                  {movimientos.length > 0 && (
                    <div className="tabla-caja">
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Movimiento</th>
                            <th className="num">Créditos</th>
                            <th className="num">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movimientos.map((m) => (
                            <tr key={m.id}>
                              <td>{fecha.format(new Date(m.creadoEn))}</td>
                              <td>{m.descripcion ?? TIPOS[m.tipo] ?? m.tipo}</td>
                              <td className="num">{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                              <td className="num">{m.saldoResultante}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Pie />
    </>
  );
}
