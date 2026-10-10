'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Encabezado, Pie } from '@/components/Encabezado';
import { VerificarCodigo } from '@/components/VerificarCodigo';
import { api, ErrorApi, guardarToken, Sesion } from '@/lib/api';

type Modo = 'codigo' | 'password';

export default function Ingresar() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('codigo');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [pendiente, setPendiente] = useState<{ celular: string; mensaje: string } | null>(null);

  function cambiarModo(nuevo: Modo) {
    setModo(nuevo);
    setError(null);
    setPendiente(null);
  }

  async function pedirCodigo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const celular = String(new FormData(e.currentTarget).get('celular') ?? '');
      setPendiente(await api('/auth/codigo', { cuerpo: { celular } }));
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  async function entrarConPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const f = new FormData(e.currentTarget);
    try {
      const sesion = await api<Sesion>('/auth/login', {
        cuerpo: { usuario: String(f.get('usuario') ?? ''), password: String(f.get('password') ?? '') },
      });
      guardarToken(sesion.token);
      router.push('/panel');
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'Algo salió mal. Intenta de nuevo.');
      setCargando(false);
    }
  }

  return (
    <>
      <Encabezado />
      <main className="pagina contenedor">
        <div className="tarjeta">
          <div>
            <h1>Ingresar</h1>
            <p className="sub">
              ¿No tienes cuenta? <Link href="/registro">Regístrate</Link>
            </p>
          </div>

          <div className="segmentado" role="group" aria-label="Forma de ingreso">
            <button type="button" aria-pressed={modo === 'codigo'} onClick={() => cambiarModo('codigo')}>
              Código por WhatsApp
            </button>
            <button type="button" aria-pressed={modo === 'password'} onClick={() => cambiarModo('password')}>
              Contraseña
            </button>
          </div>

          {modo === 'codigo' && pendiente && (
            <VerificarCodigo
              celular={pendiente.celular}
              mensaje={pendiente.mensaje}
              onSesion={() => router.push('/panel')}
              onCambiarNumero={() => setPendiente(null)}
            />
          )}

          {modo === 'codigo' && !pendiente && (
            <form onSubmit={pedirCodigo} noValidate>
              <label className="campo" htmlFor="celular">
                Celular
                <input id="celular" name="celular" type="tel" autoComplete="tel" placeholder="300 123 4567" required />
              </label>
              {error && <p className="aviso aviso-error" role="alert">{error}</p>}
              <button className="boton boton-primario" type="submit" disabled={cargando}>
                {cargando ? 'Enviando…' : 'Enviarme el código'}
              </button>
            </form>
          )}

          {modo === 'password' && (
            <form onSubmit={entrarConPassword} noValidate>
              <label className="campo" htmlFor="usuario">
                Correo o celular
                <input id="usuario" name="usuario" autoComplete="username" required />
              </label>
              <label className="campo" htmlFor="password">
                Contraseña
                <input id="password" name="password" type="password" autoComplete="current-password" required />
              </label>
              {error && <p className="aviso aviso-error" role="alert">{error}</p>}
              <button className="boton boton-primario" type="submit" disabled={cargando}>
                {cargando ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          )}
        </div>
      </main>
      <Pie />
    </>
  );
}
