import { ValueTransformer } from 'typeorm';

/** MySQL devuelve DECIMAL como texto; esto lo convierte a número (o null). */
export const decimalANumero: ValueTransformer = {
  to: (valor?: number | null) => valor,
  from: (valor?: string | null) => (valor === null || valor === undefined ? null : Number(valor)),
};
