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

  useEffect(() => {
    api<Movimiento[]>('/creditos/movimientos')
      .then(setMovimientos)
      .catch((err) => setError(err instanceof ErrorApi ? err.message : 'No pudimos cargar tus créditos.'));
    api<Paquete[]>('/paquetes').then(setPaquetes).catch(() => setPaquetes([]));
  }, []);

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
            </div>
          ))}
        </div>
        <p className="sub">La compra en línea con Nequi, PSE o tarjeta se activa con la conexión a Wompi (próxima fase).</p>
      </div>

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
