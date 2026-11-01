'use client';

import { useEffect, useState } from 'react';
import { api, ErrorApi, Movimiento } from '@/lib/api';
import { fecha, pesos } from '@/lib/formato';

const TIPOS: Record<string, string> = {
  compra: 'Compra',
  regalo: 'Regalo',
  cotizacion: 'Cotización',
  devolucion: 'Devolución',
  vencimiento: 'Vencimiento',
  ajuste: 'Ajuste',
};

interface PagoResumen {
  referencia: string;
  paquete: string | null;
  monto: number;
  creditos: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'anulado' | 'error';
  metodo: string | null;
  creadoEn: string;
}

const ESTADO_PAGO: Record<PagoResumen['estado'], { texto: string; clase: string }> = {
  pendiente: { texto: 'En proceso', clase: 'pastilla-enviada' },
  aprobado: { texto: 'Aprobado', clase: 'pastilla-elegida' },
  rechazado: { texto: 'Rechazado', clase: 'pastilla-alerta' },
  anulado: { texto: 'Anulado', clase: 'pastilla-alerta' },
  error: { texto: 'Con error', clase: 'pastilla-alerta' },
};

interface Paquete {
  id: number;
  nombre: string;
  precio: number;
  creditos: number;
}

export function MisCreditos({ saldo }: { saldo: number }) {
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pagos, setPagos] = useState<{ disponible: boolean; modoPrueba: boolean; pagos: PagoResumen[] } | null>(null);
  const [comprando, setComprando] = useState<number | null>(null);
  const [errorCompra, setErrorCompra] = useState<string | null>(null);

  useEffect(() => {
    api<Movimiento[]>('/creditos/movimientos')
      .then(setMovimientos)
      .catch((err) => setError(err instanceof ErrorApi ? err.message : 'No pudimos cargar tus créditos.'));
    api<Paquete[]>('/paquetes').then(setPaquetes).catch(() => setPaquetes([]));
    api<{ disponible: boolean; modoPrueba: boolean; pagos: PagoResumen[] }>('/pagos')
      .then(setPagos)
      .catch(() => setPagos({ disponible: false, modoPrueba: false, pagos: [] }));
  }, []);

  async function comprar(p: Paquete) {
    setErrorCompra(null);
    setComprando(p.id);
    try {
      const r = await api<{ urlCheckout: string }>('/pagos', { cuerpo: { paqueteId: p.id } });
      window.location.href = r.urlCheckout;
    } catch (err) {
      setErrorCompra(err instanceof ErrorApi ? err.message : 'No pudimos iniciar el pago. Intenta de nuevo.');
      setComprando(null);
    }
  }

  return (
    <div className="historial">
      <div className="saldo">
        <strong>{saldo}</strong>
        <span className="sub">créditos disponibles</span>
      </div>

      <div>
        <h3 className="subtitulo">Comprar créditos</h3>
        <div className="paquetes">
          {paquetes.map((p) => (
            <div key={p.id} className="paquete">
              <span className="cifra-etiqueta">{p.nombre}</span>
              <strong>{p.creditos} créditos</strong>
              <span>{pesos(p.precio)}</span>
              <span className="cifra-nota">{pesos(Math.round(p.precio / p.creditos))} por crédito</span>
              {pagos?.disponible && (
                <button
                  type="button"
                  className="boton boton-primario boton-paquete"
                  disabled={comprando !== null}
                  onClick={() => comprar(p)}
                  aria-label={`Comprar paquete ${p.nombre}: ${p.creditos} créditos por ${pesos(p.precio)}`}
                >
                  {comprando === p.id ? 'Abriendo pago…' : 'Comprar'}
                </button>
              )}
            </div>
          ))}
        </div>
        {errorCompra && <p className="aviso aviso-error" role="alert">{errorCompra}</p>}
        {pagos?.disponible ? (
          <p className="sub">
            Pagas de forma segura en Wompi con Nequi, PSE, tarjeta o botón Bancolombia. Los créditos se suman apenas se apruebe el pago y no vencen.
            {pagos.modoPrueba && <strong> Modo de prueba: no se cobra dinero real.</strong>}
          </p>
        ) : (
          pagos && <p className="sub">La compra en línea todavía no está activa. Escríbenos por WhatsApp para comprar créditos.</p>
        )}
      </div>

      {pagos && pagos.pagos.length > 0 && (
        <div>
          <h3 className="subtitulo">Mis compras</h3>
          <ul className="lista-pagos">
            {pagos.pagos.map((p) => (
              <li key={p.referencia}>
                <div>
                  <strong>{p.paquete ?? 'Créditos'}</strong> · {p.creditos} créditos · {pesos(p.monto)}
                  <div className="cifra-nota">
                    {fecha(p.creadoEn)}
                    {p.metodo ? ` · ${p.metodo}` : ''} · Ref. {p.referencia}
                  </div>
                </div>
                <span className={`pastilla ${ESTADO_PAGO[p.estado].clase}`}>{ESTADO_PAGO[p.estado].texto}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="subtitulo">Movimientos</h3>
        {error && <p className="aviso aviso-error" role="alert">{error}</p>}
        {!movimientos && !error && <p className="sub">Cargando…</p>}
        {movimientos && movimientos.length === 0 && <p className="sub">Aún no tienes movimientos.</p>}
        {movimientos && movimientos.length > 0 && (
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
                    <td>{fecha(m.creadoEn)}</td>
                    <td>{m.descripcion ?? TIPOS[m.tipo] ?? m.tipo}</td>
                    <td className={m.cantidad > 0 ? 'num positivo' : 'num'}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                    <td className="num">{m.saldoResultante}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
