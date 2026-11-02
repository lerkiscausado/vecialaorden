'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Encabezado, Pie } from '@/components/Encabezado';
import { api, borrarSesion, ErrorApi, haySesion } from '@/lib/api';
import { pesos } from '@/lib/formato';

interface Pago {
  referencia: string;
  paquete: string | null;
  monto: number;
  creditos: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'anulado' | 'error';
  metodo: string | null;
}

/** Mientras siga pendiente, se vuelve a consultar cada 4 s durante un minuto. */
const INTENTOS = 15;

const TEXTOS: Record<Pago['estado'], { icono: string; titulo: string; detalle: (p: Pago) => string }> = {
  aprobado: {
    icono: '✅',
    titulo: '¡Pago aprobado!',
    detalle: (p) => `Se sumaron ${p.creditos} créditos a tu cuenta. Ya puedes cotizar trabajos.`,
  },
  pendiente: {
    icono: '⏳',
    titulo: 'Estamos confirmando tu pago',
    detalle: () => 'Algunos pagos (PSE, Nequi) tardan unos minutos. Los créditos se suman solos cuando el banco lo apruebe; te avisamos por WhatsApp.',
  },
  rechazado: {
    icono: '❌',
    titulo: 'El pago fue rechazado',
    detalle: () => 'No se hizo ningún cobro. Puedes intentarlo de nuevo con otro medio de pago.',
  },
  anulado: { icono: '❌', titulo: 'El pago fue anulado', detalle: () => 'No se sumaron créditos. Si crees que es un error, escríbenos.' },
  error: {
    icono: '⚠️',
    titulo: 'Hubo un problema con el pago',
    detalle: (p) => `Escríbenos por WhatsApp con la referencia ${p.referencia} y lo revisamos.`,
  },
};

export default function ResultadoPago() {
  const router = useRouter();
  const [pago, setPago] = useState<Pago | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const referencia = q.get('ref') ?? '';
    const transaccionId = q.get('id') ?? undefined;
    const volver = `/ingresar?volver=${encodeURIComponent(`/pagos/resultado?${q}`)}`;
    if (!haySesion()) {
      router.replace(volver);
      return;
    }
    if (!referencia) {
      setError('No encontramos la referencia del pago.');
      return;
    }

    let vivo = true;
    let temporizador: ReturnType<typeof setTimeout>;
    async function consultar(intento: number) {
      try {
        const p = await api<Pago>('/pagos/confirmar', { cuerpo: { referencia, transaccionId } });
        if (!vivo) return;
        setPago(p);
        if (p.estado === 'pendiente' && intento < INTENTOS) temporizador = setTimeout(() => consultar(intento + 1), 4000);
      } catch (err) {
        if (!vivo) return;
        if (err instanceof ErrorApi && err.estado === 401) {
          borrarSesion();
          router.replace(volver);
        } else setError(err instanceof ErrorApi ? err.message : 'No pudimos consultar tu pago.');
      }
    }
    consultar(1);
    return () => {
      vivo = false;
      clearTimeout(temporizador);
    };
  }, [router]);

  const t = pago ? TEXTOS[pago.estado] : null;

  return (
    <>
      <Encabezado enlaces={false} />
      <main className="pagina contenedor">
        <section className="tarjeta resultado-pago" aria-live="polite">
          {error && <p className="aviso aviso-error" role="alert">{error}</p>}
          {!pago && !error && <p className="sub">Consultando tu pago…</p>}
          {pago && t && (
            <>
              <span className="icono-resultado" aria-hidden="true">{t.icono}</span>
              <h1 style={{ fontSize: 28 }}>{t.titulo}</h1>
              <p>{t.detalle(pago)}</p>
              <p className="sub">
                {pago.paquete ? `Paquete ${pago.paquete} · ` : ''}
                {pago.creditos} créditos · {pesos(pago.monto)}
                {pago.metodo ? ` · ${pago.metodo}` : ''}
                <br />
                Referencia {pago.referencia}
              </p>
            </>
          )}
          <Link className="boton boton-primario" href="/panel?pestana=creditos">
            Ir a mis créditos
          </Link>
        </section>
      </main>
      <Pie />
    </>
  );
}
