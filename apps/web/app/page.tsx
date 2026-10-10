import Link from 'next/link';
import { Encabezado, Pie } from '@/components/Encabezado';

const NUMERO = process.env.NEXT_PUBLIC_WHATSAPP_NUMERO ?? '573000000000';
const MENSAJE = encodeURIComponent('¡Hola! Necesito ayuda con un arreglo.');

/** +573001234567 → +57 300 123 4567 */
function formatear(numero: string): string {
  const d = numero.replace(/\D/g, '');
  if (d.length !== 12) return `+${d}`;
  return `+${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

export default function Inicio() {
  return (
    <>
      <Encabezado />
      <main>
        <section className="portada">
          <div className="contenedor">
            <div className="portada-texto">
              <span className="etiqueta">¡A la orden, veci!</span>
              <h1>¿Qué necesitas arreglar, veci?</h1>
              <p>
                Escríbenos por WhatsApp y cuéntanos el trabajo. Te enviamos las cotizaciones de los
                maestros más cercanos para que elijas el mejor.
              </p>
              <div className="acciones">
                <a className="boton boton-whatsapp" href={`https://wa.me/${NUMERO}?text=${MENSAJE}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 21l1.65-4.95A8.5 8.5 0 1 1 8 19.6L3 21z" />
                  </svg>
                  Escribir por WhatsApp
                </a>
                <span className="numero">
                  o escríbenos al <strong>{formatear(NUMERO)}</strong>
                </span>
              </div>
            </div>
            <div className="pasos">
              <span className="etiqueta">Así funciona</span>
              <ol>
                <li>
                  <span><strong>Cuéntanos el trabajo</strong> por WhatsApp: qué es, medidas y tu barrio.</span>
                </li>
                <li>
                  <span><strong>Recibe hasta 5 cotizaciones</strong> de maestros cercanos y calificados.</span>
                </li>
                <li>
                  <span><strong>Elige y agenda.</strong> Para ti es gratis.</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="pagina">
          <div className="tarjeta" style={{ marginTop: -110 }}>
            <h2>¿Eres maestro?</h2>
            <p className="sub">
              Recibe avisos de trabajos cerca de ti y cotiza solo los que te interesen. Al registrarte
              te regalamos 10 créditos para tus primeras cotizaciones.
            </p>
            <div className="acciones">
              <Link className="boton boton-primario" href="/registro?tipo=maestro">
                Registrarme como maestro
              </Link>
              <Link className="boton boton-secundario" href="/registro">
                Crear cuenta de cliente
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Pie />
    </>
  );
}
