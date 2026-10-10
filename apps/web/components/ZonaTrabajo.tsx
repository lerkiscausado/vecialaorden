'use client';

import { useEffect, useState } from 'react';
import { api, Ciudad, ErrorApi, Usuario } from '@/lib/api';

/** El maestro define dónde trabaja y hasta qué distancia quiere recibir avisos. */
export function ZonaTrabajo({ usuario, onGuardado }: { usuario: Usuario; onGuardado: (u: Usuario) => void }) {
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [ciudadId, setCiudadId] = useState<string>(usuario.ciudad ? String(usuario.ciudad.id) : '');
  const [barrio, setBarrio] = useState(usuario.barrio ?? '');
  const [radio, setRadio] = useState(usuario.maestro?.radioKm ?? 10);
  const [avisos, setAvisos] = useState(usuario.maestro?.recibeAvisos ?? true);
  const [punto, setPunto] = useState<{ latitud: number; longitud: number } | null>(null);
  const [estado, setEstado] = useState<{ tipo: 'error' | 'exito' | 'info'; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api<Ciudad[]>('/ciudades').then(setCiudades).catch(() => setCiudades([]));
  }, []);

  function usarUbicacion() {
    if (!('geolocation' in navigator)) {
      setEstado({ tipo: 'error', texto: 'Tu navegador no permite compartir la ubicación. Escribe tu barrio.' });
      return;
    }
    setEstado({ tipo: 'info', texto: 'Buscando tu ubicación…' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPunto({ latitud: pos.coords.latitude, longitud: pos.coords.longitude });
        setEstado({ tipo: 'info', texto: 'Ubicación lista. Presiona “Guardar zona” para confirmarla.' });
      },
      () => setEstado({ tipo: 'error', texto: 'No pudimos obtener tu ubicación. Revisa el permiso o escribe tu barrio.' }),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setEstado(null);
    try {
      const actualizado = await api<Usuario>('/maestros/yo/zona', {
        metodo: 'PATCH',
        cuerpo: {
          ciudadId: Number(ciudadId),
          barrio: barrio.trim() || undefined,
          radioKm: radio,
          recibeAvisos: avisos,
          ...(punto ?? {}),
        },
      });
      setPunto(null);
      onGuardado(actualizado);
      setEstado({ tipo: 'exito', texto: 'Guardamos tu zona de trabajo.' });
    } catch (err) {
      setEstado({ tipo: 'error', texto: err instanceof ErrorApi ? err.message : 'No se pudo guardar.' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="tarjeta ancha" aria-labelledby="titulo-zona">
      <div>
        <h2 id="titulo-zona">Mi zona de trabajo</h2>
        <p className="sub">Te avisamos de los trabajos que queden dentro de esta distancia.</p>
      </div>
      {usuario.ubicacionAproximada && (
        <p className="aviso aviso-info">
          Tu ubicación es aproximada (el centro de tu barrio o ciudad). Comparte tu ubicación para recibir los trabajos
          que de verdad te quedan cerca.
        </p>
      )}
      <form onSubmit={guardar} noValidate>
        <div className="dos-columnas">
          <label className="campo" htmlFor="zona-ciudad">
            Ciudad
            <select id="zona-ciudad" value={ciudadId} onChange={(e) => setCiudadId(e.target.value)} required>
              <option value="">Elige tu ciudad</option>
              {ciudades.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label className="campo" htmlFor="zona-barrio">
            Barrio
            <input id="zona-barrio" value={barrio} onChange={(e) => setBarrio(e.target.value)} placeholder="Ej: Cedritos" />
          </label>
        </div>
        <div className="acciones">
          <button type="button" className="boton boton-secundario" onClick={usarUbicacion}>
            {punto ? 'Ubicación lista ✓' : 'Usar mi ubicación actual'}
          </button>
        </div>
        <label className="campo" htmlFor="zona-radio">
          Recibir trabajos hasta {radio} km de distancia
          <input
            id="zona-radio"
            type="range"
            min={1}
            max={60}
            value={radio}
            onChange={(e) => setRadio(Number(e.target.value))}
            style={{ minHeight: 0, padding: 0, border: 0, accentColor: 'var(--verde)' }}
          />
        </label>
        <label className="casilla" htmlFor="zona-avisos">
          <input id="zona-avisos" type="checkbox" checked={avisos} onChange={(e) => setAvisos(e.target.checked)} />
          Quiero recibir avisos de trabajos nuevos
        </label>
        {estado && (
          <p className={`aviso aviso-${estado.tipo}`} role={estado.tipo === 'error' ? 'alert' : 'status'}>
            {estado.texto}
          </p>
        )}
        <div className="acciones">
          <button className="boton boton-primario" type="submit" disabled={guardando || !ciudadId}>
            {guardando ? 'Guardando…' : 'Guardar zona'}
          </button>
        </div>
      </form>
    </section>
  );
}
