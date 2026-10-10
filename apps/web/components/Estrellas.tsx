'use client';

import { useId, useState } from 'react';

/** Estrellas de solo lectura: ★★★★☆ con el número al lado. */
export function EstrellasFijas({ valor, tamano = 16 }: { valor: number; tamano?: number }) {
  const llenas = Math.round(valor);
  return (
    <span className="estrellas" style={{ fontSize: tamano }} aria-label={`${valor.toFixed(1)} de 5`}>
      <span aria-hidden="true">
        {'★'.repeat(llenas)}
        <span className="estrellas-vacias">{'★'.repeat(5 - llenas)}</span>
      </span>
    </span>
  );
}

/**
 * Selector de 1 a 5 estrellas, accesible con teclado (son radios).
 * Muestra la palabra que corresponde a la nota elegida.
 */
export function SelectorEstrellas({
  etiqueta,
  ayuda,
  valor,
  onCambio,
  destacado = false,
}: {
  etiqueta: string;
  ayuda: string;
  valor: number;
  onCambio: (v: number) => void;
  destacado?: boolean;
}) {
  const nombre = useId();
  const [sobre, setSobre] = useState(0);
  const mostrado = sobre || valor;
  const palabras = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'];

  return (
    <fieldset className={destacado ? 'selector-estrellas destacado' : 'selector-estrellas'}>
      <legend>
        <strong>{etiqueta}</strong>
        <span>{ayuda}</span>
      </legend>
      <div className="fila-estrellas" onMouseLeave={() => setSobre(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} onMouseEnter={() => setSobre(n)} className={n <= mostrado ? 'estrella activa' : 'estrella'}>
            <input type="radio" name={nombre} value={n} checked={valor === n} onChange={() => onCambio(n)} />
            <span aria-hidden="true">★</span>
            <span className="solo-lectores">{`${n} de 5`}</span>
          </label>
        ))}
        <span className="palabra-estrellas" aria-live="polite">
          {palabras[mostrado]}
        </span>
      </div>
    </fieldset>
  );
}
