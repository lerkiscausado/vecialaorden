'use client';

import { useState } from 'react';
import { dia, num } from '@/lib/formato';

interface Punto {
  dia: string;
  valor: number;
}

const ANCHO = 600;
const ALTO = 170;
const M = { arriba: 12, derecha: 8, abajo: 26, izquierda: 32 };

/** Escala "bonita" para el eje: 1, 2, 5, 10, 20, 50… */
function techo(max: number): number {
  // Conteos: el eje solo muestra enteros (0, mitad y máximo).
  if (max <= 4) return 4;
  if (max <= 10) return Math.ceil(max / 2) * 2;
  const base = 10 ** Math.floor(Math.log10(max));
  for (const f of [1, 2, 5, 10]) if (f * base >= max) return f * base;
  return 10 * base;
}

/** Barras con la parte superior redondeada y la base recta. */
function barra(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return '';
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Gráfico de barras diario de una sola serie, con tooltip y vista de tabla. */
export function GraficoBarras({ titulo, datos, unidad }: { titulo: string; datos: Punto[]; unidad: string }) {
  const [activo, setActivo] = useState<number | null>(null);
  const max = techo(Math.max(0, ...datos.map((d) => d.valor)));
  const anchoUtil = ANCHO - M.izquierda - M.derecha;
  const altoUtil = ALTO - M.arriba - M.abajo;
  const paso = anchoUtil / Math.max(datos.length, 1);
  const anchoBarra = Math.max(2, Math.min(18, paso - 2));
  const y = (v: number) => M.arriba + altoUtil - (v / max) * altoUtil;
  const total = datos.reduce((s, d) => s + d.valor, 0);
  const marcas = [0, max / 2, max];
  const etiquetasX = datos.length > 1 ? [0, Math.floor((datos.length - 1) / 2), datos.length - 1] : [0];
  const punto = activo !== null ? datos[activo] : null;

  return (
    <figure className="grafico">
      <figcaption>
        <span>{titulo}</span>
        <strong>{num(total)}</strong>
      </figcaption>
      <div className="grafico-lienzo">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={`${titulo}: ${num(total)} en total`} onMouseLeave={() => setActivo(null)}>
          {marcas.map((v) => (
            <g key={v}>
              <line x1={M.izquierda} x2={ANCHO - M.derecha} y1={y(v)} y2={y(v)} className="grafico-rejilla" />
              <text x={M.izquierda - 6} y={y(v)} className="grafico-eje" textAnchor="end" dominantBaseline="middle">
                {num(v)}
              </text>
            </g>
          ))}
          {datos.map((d, i) => {
            const x = M.izquierda + i * paso + (paso - anchoBarra) / 2;
            return (
              <g key={d.dia}>
                <path d={barra(x, y(d.valor), anchoBarra, M.arriba + altoUtil - y(d.valor))} className={activo === i ? 'grafico-barra activa' : 'grafico-barra'} />
                {/* Zona de hover más grande que la barra. */}
                <rect
                  x={M.izquierda + i * paso}
                  y={M.arriba}
                  width={paso}
                  height={altoUtil}
                  fill="transparent"
                  onMouseEnter={() => setActivo(i)}
                />
              </g>
            );
          })}
          {etiquetasX.map((i) => (
            <text
              key={i}
              x={M.izquierda + i * paso + paso / 2}
              y={ALTO - 8}
              className="grafico-eje"
              textAnchor={i === 0 ? 'start' : i === datos.length - 1 ? 'end' : 'middle'}
            >
              {datos[i] ? dia(datos[i].dia) : ''}
            </text>
          ))}
        </svg>
        {punto && activo !== null && (
          <div className="grafico-tooltip" style={{ left: `${((M.izquierda + activo * paso + paso / 2) / ANCHO) * 100}%` }}>
            <span>{dia(punto.dia)}</span>
            <strong>
              {num(punto.valor)} {unidad}
            </strong>
          </div>
        )}
      </div>
      <details className="grafico-tabla">
        <summary>Ver como tabla</summary>
        <div className="tabla-caja">
          <table className="tabla">
            <thead>
              <tr>
                <th>Día</th>
                <th className="num">{unidad}</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr key={d.dia}>
                  <td>{dia(d.dia)}</td>
                  <td className="num">{num(d.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
