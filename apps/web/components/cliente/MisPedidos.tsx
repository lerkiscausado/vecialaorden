'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ErrorApi } from '@/lib/api';
import { ESTADO_PEDIDO, hace } from '@/lib/formato';

interface Pedido {
  codigo: string;
  resumen: string;
  areas: string[];
  ubicacion: string | null;
  estado: string;
  cotizaciones: number;
  cuposMax: number;
  publicadaEn: string | null;
}

const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO ?? '573000000000';

export function MisPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Pedido[]>('/pedidos')
      .then(setPedidos)
      .catch((err) => setError(err instanceof ErrorApi ? err.message : 'No pudimos cargar tus pedidos.'));
  }, []);

  if (error) return <p className="aviso aviso-error" role="alert">{error}</p>;
  if (!pedidos) return <p className="sub">Cargando tus pedidos…</p>;

  if (pedidos.length === 0) {
    return (
      <div className="vacio">
        <strong>Aún no tienes pedidos.</strong>
        <span>Cuéntanos qué necesitas arreglar por WhatsApp y te mandamos cotizaciones de maestros cercanos.</span>
        <a className="boton boton-whatsapp" href={`https://wa.me/${NUMERO}`} style={{ alignSelf: 'flex-start' }}>
          Escribir por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <ul className="lista-historial">
      {pedidos.map((p) => (
        <li key={p.codigo} className="historial-item">
          <div className="historial-cabeza">
            <strong>#{p.codigo}</strong>
            <span className={`pastilla pastilla-${p.estado}`}>{ESTADO_PEDIDO[p.estado] ?? p.estado}</span>
          </div>
          <p className="historial-resumen">{p.resumen}</p>
          <div className="historial-datos">
            <span>{p.areas.join(', ')}</span>
            {p.ubicacion && <span>{p.ubicacion}</span>}
            <span>{hace(p.publicadaEn)}</span>
          </div>
          <div className="historial-pie">
            <span>
              <strong>{p.cotizaciones}</strong> de {p.cuposMax} cotizaciones
            </span>
            <Link className="boton boton-primario" href={`/pedidos/${p.codigo}`}>
              {p.cotizaciones && (p.estado === 'abierta' || p.estado === 'cupos_llenos') ? 'Ver y elegir' : 'Ver pedido'}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
