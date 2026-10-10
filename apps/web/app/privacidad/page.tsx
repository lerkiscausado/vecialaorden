import { Encabezado, Pie } from '@/components/Encabezado';

export const metadata = { title: 'Política de tratamiento de datos · Veci a la Orden' };

/**
 * PENDIENTE: el texto definitivo debe redactarlo o revisarlo un abogado
 * (Ley 1581 de 2012 y Decreto 1377 de 2013).
 */
export default function Privacidad() {
  return (
    <>
      <Encabezado />
      <main className="pagina contenedor">
        <article className="tarjeta" style={{ maxWidth: 720 }}>
          <h1>Política de tratamiento de datos personales</h1>
          <p className="aviso aviso-info">
            [Borrador] Esta página se completará con la política definitiva, revisada por un abogado, antes del lanzamiento.
          </p>
          <p>
            Veci a la Orden recoge tu nombre, celular, correo, ciudad, barrio y ubicación para conectarte con maestros
            cercanos que puedan atender tu pedido, enviarte sus cotizaciones y avisarte del estado de tu servicio.
          </p>
          <p>
            Puedes conocer, actualizar, rectificar o pedir que borremos tus datos en cualquier momento escribiéndonos a
            [CORREO DE CONTACTO]. Responsable del tratamiento: [NOMBRE Y CÉDULA O NIT DEL RESPONSABLE], [CIUDAD].
          </p>
        </article>
      </main>
      <Pie />
    </>
  );
}
