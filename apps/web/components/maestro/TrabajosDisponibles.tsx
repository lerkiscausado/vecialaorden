'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ErrorApi } from '@/lib/api';
import { hace, pesos } from '@/lib/formato';

interface Trabajo {
  codigo: string;
  resumen: string;
  areas: string[];
  ubicacion: string | null;
  distanciaKm: number | null;
  medidas: Record<string, number> | null;
  tamano: string;
  urgente: boolean;
  creditos: number;
  cuposUsados: number;
  cuposMax: number;
  publicadaEn: string | null;
  puedeCotizar: boolean;
  motivo: string | null;
  miCotizacion: { precioTotal: number; estado: string } | null;
}

/** Trabajos cerca del maestro, con el formulario para cotizar en la misma tarjeta. */
export function TrabajosDisponibles({ saldo, onCotizado }: { saldo: number; onCotizado: () => void }) {
  const [trabajos, setTrabajos] = useState<Trabajo[] | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setTrabajos(await api<Trabajo[]>('/maestros/yo/trabajos'));
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No pudimos cargar los trabajos.');
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <p className="aviso aviso-error" role="alert">{error}</p>;
  if (!trabajos) return <p className="sub">Cargando trabajos…</p>;

  const disponibles = trabajos.filter((t) => t.puedeCotizar);
  const otros = trabajos.filter((t) => !t.puedeCotizar);

  return (
    <div className="lista-trabajos">
      {trabajos.length === 0 && (
        <div className="vacio">
          <strong>Todavía no hay trabajos cerca de ti.</strong>
          <span>Cuando un cliente pida algo de tus oficios dentro de tu zona, aparecerá aquí y te avisaremos.</span>
        </div>
      )}
      {disponibles.map((t) => (
        <TarjetaTrabajo
          key={t.codigo}
          t={t}
          saldo={saldo}
          abierto={abierto === t.codigo}
          onAbrir={() => setAbierto(abierto === t.codigo ? null : t.codigo)}
          onCotizado={() => {
            setAbierto(null);
            cargar();
            onCotizado();
          }}
        />
      ))}
      {otros.length > 0 && (
        <>
          <h3 className="subtitulo">Ya no disponibles o ya cotizados</h3>
          {otros.map((t) => (
            <TarjetaTrabajo key={t.codigo} t={t} saldo={saldo} abierto={false} onAbrir={() => {}} onCotizado={() => {}} />
          ))}
        </>
      )}
    </div>
  );
}

function TarjetaTrabajo({
  t,
  saldo,
  abierto,
  onAbrir,
  onCotizado,
}: {
  t: Trabajo;
  saldo: number;
  abierto: boolean;
  onAbrir: () => void;
  onCotizado: () => void;
}) {
  const [mano, setMano] = useState('');
  const [materiales, setMateriales] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [duracion, setDuracion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const soloNumero = (v: string) => v.replace(/\D/g, '');
  const total = Number(mano || 0) + Number(materiales || 0);
  const alcanza = saldo >= t.creditos;
  const m = t.medidas;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api(`/maestros/yo/trabajos/${t.codigo}/cotizar`, {
        cuerpo: {
          manoDeObra: Number(mano),
          materiales: Number(materiales || 0),
          mensaje: mensaje.trim() || undefined,
          fechaDisponible: fechaInicio || undefined,
          duracionDias: duracion ? Number(duracion) : undefined,
        },
      });
      onCotizado();
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo enviar la cotización.');
      setEnviando(false);
    }
  }

  return (
    <article className={t.puedeCotizar ? 'trabajo' : 'trabajo trabajo-inactivo'}>
      <div className="trabajo-cabeza">
        <div className="chips">
          {t.areas.map((a) => (
            <span key={a} className="chip">{a}</span>
          ))}
          {t.urgente && <span className="chip chip-urgente">Urgente</span>}
        </div>
        <span className="sub">{hace(t.publicadaEn)}</span>
      </div>
      <p className="trabajo-resumen">{t.resumen}</p>
      <dl className="trabajo-datos">
        <div>
          <dt>Dónde</dt>
          <dd>{t.ubicacion ?? '—'}{t.distanciaKm !== null ? ` · a ${t.distanciaKm} km` : ''}</dd>
        </div>
        {m?.ancho && m?.largo && (
          <div>
            <dt>Medidas</dt>
            <dd>
              {m.ancho} × {m.largo} m{m.areaPiso ? ` (${m.areaPiso} m² de piso)` : ''}
            </dd>
          </div>
        )}
        <div>
          <dt>Cotizar cuesta</dt>
          <dd>{t.creditos} crédito{t.creditos === 1 ? '' : 's'}</dd>
        </div>
        <div>
          <dt>Cupos</dt>
          <dd>
            <span className="cupos" aria-label={`${t.cuposUsados} de ${t.cuposMax} cupos usados`}>
              {Array.from({ length: t.cuposMax }, (_, i) => (
                <span key={i} className={i < t.cuposUsados ? 'cupo cupo-usado' : 'cupo'} />
              ))}
            </span>{' '}
            {t.cuposMax - t.cuposUsados} libres
          </dd>
        </div>
      </dl>

      {t.miCotizacion && (
        <p className="aviso aviso-exito">Cotizaste {pesos(t.miCotizacion.precioTotal)}. Te avisamos si el cliente te elige.</p>
      )}
      {!t.puedeCotizar && !t.miCotizacion && t.motivo && <p className="sub">{t.motivo}</p>}

      {t.puedeCotizar && !abierto && (
        <div className="acciones">
          <button type="button" className="boton boton-primario" onClick={onAbrir}>
            Cotizar este trabajo
          </button>
        </div>
      )}

      {t.puedeCotizar && abierto && (
        <form onSubmit={enviar} className="form-cotizar" noValidate>
          <div className="dos-columnas">
            <label className="campo" htmlFor={`mano-${t.codigo}`}>
              Mano de obra
              <input
                id={`mano-${t.codigo}`}
                inputMode="numeric"
                value={mano}
                onChange={(e) => setMano(soloNumero(e.target.value))}
                placeholder="Ej: 900000"
                required
                autoFocus
              />
            </label>
            <label className="campo" htmlFor={`mat-${t.codigo}`}>
              Materiales <small>(si los pones tú)</small>
              <input
                id={`mat-${t.codigo}`}
                inputMode="numeric"
                value={materiales}
                onChange={(e) => setMateriales(soloNumero(e.target.value))}
                placeholder="0"
              />
            </label>
            <label className="campo" htmlFor={`fecha-${t.codigo}`}>
              Puedo empezar <small>(opcional)</small>
              <input id={`fecha-${t.codigo}`} type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </label>
            <label className="campo" htmlFor={`dur-${t.codigo}`}>
              Días de trabajo <small>(opcional)</small>
              <input
                id={`dur-${t.codigo}`}
                inputMode="numeric"
                value={duracion}
                onChange={(e) => setDuracion(soloNumero(e.target.value).slice(0, 3))}
                placeholder="Ej: 3"
              />
            </label>
          </div>
          <label className="campo" htmlFor={`msg-${t.codigo}`}>
            Mensaje para el cliente <small>(opcional)</small>
            <textarea
              id={`msg-${t.codigo}`}
              rows={3}
              maxLength={1000}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Qué incluye tu precio, garantía, experiencia en trabajos parecidos…"
            />
          </label>
          <div className="total-cotizacion">
            <span>Total para el cliente</span>
            <strong>{pesos(total)}</strong>
          </div>
          {!alcanza && (
            <p className="aviso aviso-error">
              Este trabajo cuesta {t.creditos} créditos y tienes {saldo}. Compra créditos para poder cotizar.
            </p>
          )}
          {error && <p className="aviso aviso-error" role="alert">{error}</p>}
          <div className="acciones">
            <button className="boton boton-primario" type="submit" disabled={enviando || !mano || !alcanza}>
              {enviando ? 'Enviando…' : `Enviar cotización (${t.creditos} crédito${t.creditos === 1 ? '' : 's'})`}
            </button>
            <button type="button" className="boton boton-secundario" onClick={onAbrir}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
