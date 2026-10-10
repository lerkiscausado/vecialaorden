'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Encabezado, Pie } from '@/components/Encabezado';
import { VerificarCodigo } from '@/components/VerificarCodigo';
import { api, Area, Ciudad, ErrorApi } from '@/lib/api';

type Rol = 'cliente' | 'maestro';

function FormularioRegistro() {
  const router = useRouter();
  const parametros = useSearchParams();
  const [rol, setRol] = useState<Rol>(parametros.get('tipo') === 'maestro' ? 'maestro' : 'cliente');
  const [areas, setAreas] = useState<Area[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [pendiente, setPendiente] = useState<{ celular: string; mensaje: string } | null>(null);

  useEffect(() => {
    api<Area[]>('/areas').then(setAreas).catch(() => setAreas([]));
    api<Ciudad[]>('/ciudades').then(setCiudades).catch(() => setCiudades([]));
  }, []);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const texto = (k: string) => String(f.get(k) ?? '').trim() || undefined;

    const cuerpo: Record<string, unknown> = {
      nombre: texto('nombre'),
      celular: texto('celular'),
      correo: texto('correo'),
      password: texto('password'),
      barrio: texto('barrio'),
      rol,
      aceptaDatos: f.get('datos') === 'on',
    };
    const ciudad = texto('ciudad');
    if (ciudad) cuerpo.ciudadId = Number(ciudad);
    if (rol === 'maestro') {
      cuerpo.areas = f.getAll('areas').map(String);
      cuerpo.aniosExperiencia = Number(f.get('experiencia'));
    }

    setCargando(true);
    try {
      const r = await api<{ celular: string; mensaje: string }>('/auth/registro', { cuerpo });
      setPendiente(r);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  if (pendiente) {
    return (
      <div className="tarjeta">
        <h1>Verifica tu celular</h1>
        <VerificarCodigo
          celular={pendiente.celular}
          mensaje={pendiente.mensaje}
          onSesion={() => router.push('/panel')}
          onCambiarNumero={() => setPendiente(null)}
        />
      </div>
    );
  }

  return (
    <div className="tarjeta">
      <div>
        <h1>Regístrate</h1>
        <p className="sub">Elige cómo quieres usar Veci a la Orden.</p>
      </div>

      <div className="segmentado" role="group" aria-label="Tipo de cuenta">
        <button type="button" aria-pressed={rol === 'cliente'} onClick={() => setRol('cliente')}>
          Necesito un servicio
        </button>
        <button type="button" aria-pressed={rol === 'maestro'} onClick={() => setRol('maestro')}>
          Ofrezco servicios
        </button>
      </div>

      <form onSubmit={enviar} noValidate>
        <label className="campo" htmlFor="nombre">
          Nombre completo
          <input id="nombre" name="nombre" autoComplete="name" placeholder="Ej: Marta Gómez" required />
        </label>
        <label className="campo" htmlFor="celular">
          Celular (WhatsApp)
          <input id="celular" name="celular" type="tel" autoComplete="tel" placeholder="300 123 4567" required />
          <small>Te enviaremos un código por WhatsApp para confirmarlo.</small>
        </label>
        <label className="campo" htmlFor="ciudad">
          Ciudad
          <select id="ciudad" name="ciudad" defaultValue="" required={rol === 'maestro'}>
            <option value="">{rol === 'maestro' ? 'Elige tu ciudad' : 'Elige tu ciudad (opcional)'}</option>
            {ciudades.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <small>Por ahora funcionamos en {ciudades.map((c) => c.nombre).join(' y ') || 'Bogotá y Cartagena'}.</small>
        </label>
        <label className="campo" htmlFor="barrio">
          Barrio
          <input id="barrio" name="barrio" placeholder="Ej: Cedritos" />
        </label>
        <label className="campo" htmlFor="correo">
          Correo <small>(opcional)</small>
          <input id="correo" name="correo" type="email" autoComplete="email" placeholder="tu@correo.com" />
        </label>
        <label className="campo" htmlFor="password">
          Contraseña <small>(opcional: también puedes entrar solo con el código de WhatsApp)</small>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} />
        </label>

        {rol === 'maestro' && (
          <>
            <fieldset className="oficios">
              <legend>¿En qué trabajas?</legend>
              {areas.map((a) => (
                <label key={a.slug}>
                  <input type="checkbox" name="areas" value={a.slug} />
                  {a.nombre}
                </label>
              ))}
            </fieldset>
            <label className="campo" htmlFor="experiencia">
              Años de experiencia
              <input id="experiencia" name="experiencia" type="number" min={0} max={60} placeholder="Ej: 8" required />
            </label>
            <p className="aviso aviso-info">
              Al verificar tu celular recibes <strong>10 créditos de regalo</strong> para tus primeras
              cotizaciones. Después validaremos tu cédula y antecedentes.
            </p>
          </>
        )}

        <label className="casilla" htmlFor="datos">
          <input id="datos" name="datos" type="checkbox" required />
          Autorizo el tratamiento de mis datos personales según la política de privacidad (Ley 1581 de 2012).
        </label>

        {error && <p className="aviso aviso-error" role="alert">{error}</p>}

        <button className="boton boton-primario" type="submit" disabled={cargando}>
          {cargando ? 'Enviando…' : rol === 'maestro' ? 'Registrarme como maestro' : 'Crear mi cuenta'}
        </button>
      </form>
    </div>
  );
}

export default function Registro() {
  return (
    <>
      <Encabezado />
      <main className="pagina contenedor">
        <Suspense>
          <FormularioRegistro />
        </Suspense>
      </main>
      <Pie />
    </>
  );
}
