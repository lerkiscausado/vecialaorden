'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Encabezado, Pie } from '@/components/Encabezado';
import { api, borrarToken, ErrorApi, leerToken, Usuario } from '@/lib/api';

type Proveedor = 'anthropic' | 'openai' | 'gemini' | 'openai_compatible';
type Proposito = 'analisis_solicitudes' | 'general';

interface Conexion {
  id: number;
  nombre: string;
  proveedor: Proveedor;
  proveedorNombre: string;
  modelo: string;
  apiKey: string;
  baseUrl: string | null;
  temperatura: number | null;
  maxTokens: number;
  proposito: Proposito;
  activa: boolean;
}

interface Uso {
  configuracionId: number | null;
  proveedor: string;
  modelo: string;
  llamadas: number;
  errores: number;
  tokensEntrada: number;
  tokensSalida: number;
  duracionPromedioMs: number;
}

interface ResultadoPrueba {
  ok: boolean;
  respuesta?: string;
  error?: string;
  duracionMs: number;
}

const PROVEEDORES: { id: Proveedor; nombre: string; ayuda: string }[] = [
  { id: 'anthropic', nombre: 'Claude (Anthropic)', ayuda: 'Clave desde console.anthropic.com' },
  { id: 'openai', nombre: 'ChatGPT (OpenAI)', ayuda: 'Clave desde platform.openai.com' },
  { id: 'gemini', nombre: 'Gemini (Google)', ayuda: 'Clave desde aistudio.google.com' },
  {
    id: 'openai_compatible',
    nombre: 'Compatible con OpenAI',
    ayuda: 'OpenRouter, DeepSeek, Groq u otro servicio con la misma API. Requiere la dirección.',
  },
];

const PROPOSITOS: Record<Proposito, string> = {
  analisis_solicitudes: 'Análisis de solicitudes',
  general: 'Uso general (respaldo)',
};

const numero = new Intl.NumberFormat('es-CO');

interface Formulario {
  id: number | null;
  nombre: string;
  proveedor: Proveedor;
  modelo: string;
  apiKey: string;
  baseUrl: string;
  temperatura: string;
  maxTokens: string;
  proposito: Proposito;
  activa: boolean;
}

const VACIO: Formulario = {
  id: null,
  nombre: '',
  proveedor: 'anthropic',
  modelo: '',
  apiKey: '',
  baseUrl: '',
  temperatura: '',
  maxTokens: '1024',
  proposito: 'analisis_solicitudes',
  activa: true,
};

export default function AdminIa() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [conexiones, setConexiones] = useState<Conexion[]>([]);
  const [uso, setUso] = useState<Uso[]>([]);
  const [form, setForm] = useState<Formulario | null>(null);
  const [modelos, setModelos] = useState<{ id: string; nombre: string }[]>([]);
  const [cargandoModelos, setCargandoModelos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [pruebas, setPruebas] = useState<Record<number, ResultadoPrueba | 'probando'>>({});
  const [porEliminar, setPorEliminar] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    const [c, u] = await Promise.all([
      api<Conexion[]>('/admin/ia/configuraciones'),
      api<Uso[]>('/admin/ia/uso?dias=30'),
    ]);
    setConexiones(c);
    setUso(u);
  }, []);

  useEffect(() => {
    if (!leerToken()) {
      router.replace('/ingresar');
      return;
    }
    api<Usuario>('/auth/yo')
      .then(async (u) => {
        if (u.rol !== 'superadmin') {
          setAutorizado(false);
          return;
        }
        setAutorizado(true);
        await cargar();
      })
      .catch((err) => {
        if (err instanceof ErrorApi && err.estado === 401) {
          borrarToken();
          router.replace('/ingresar');
        } else {
          setAviso({ tipo: 'error', texto: err instanceof ErrorApi ? err.message : 'No pudimos cargar la página.' });
        }
      });
  }, [router, cargar]);

  function abrirNueva() {
    setForm({ ...VACIO, activa: conexiones.length === 0 });
    setModelos([]);
    setErrorForm(null);
  }

  function abrirEdicion(c: Conexion) {
    setForm({
      id: c.id,
      nombre: c.nombre,
      proveedor: c.proveedor,
      modelo: c.modelo,
      apiKey: '',
      baseUrl: c.baseUrl ?? '',
      temperatura: c.temperatura === null ? '' : String(c.temperatura),
      maxTokens: String(c.maxTokens),
      proposito: c.proposito,
      activa: c.activa,
    });
    setModelos([]);
    setErrorForm(null);
  }

  function cambiar<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setForm((f) => (f ? { ...f, [campo]: valor } : f));
    if (campo === 'proveedor' || campo === 'apiKey' || campo === 'baseUrl') setModelos([]);
  }

  async function cargarModelos() {
    if (!form) return;
    setErrorForm(null);
    setCargandoModelos(true);
    try {
      const lista = await api<{ id: string; nombre: string }[]>('/admin/ia/modelos', {
        cuerpo: {
          proveedor: form.proveedor,
          apiKey: form.apiKey || null,
          configuracionId: form.apiKey ? undefined : form.id ?? undefined,
          baseUrl: form.baseUrl || null,
        },
      });
      setModelos(lista);
      if (!lista.length) setErrorForm('El proveedor no devolvió modelos para esa clave.');
    } catch (err) {
      setErrorForm(err instanceof ErrorApi ? err.message : 'No se pudieron consultar los modelos.');
    } finally {
      setCargandoModelos(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setErrorForm(null);
    setGuardando(true);
    const cuerpo = {
      nombre: form.nombre,
      proveedor: form.proveedor,
      modelo: form.modelo,
      baseUrl: form.baseUrl || null,
      temperatura: form.temperatura === '' ? null : Number(form.temperatura),
      maxTokens: Number(form.maxTokens),
      proposito: form.proposito,
      ...(form.apiKey ? { apiKey: form.apiKey } : {}),
    };
    try {
      if (form.id) {
        await api(`/admin/ia/configuraciones/${form.id}`, { metodo: 'PATCH', cuerpo });
        setAviso({ tipo: 'exito', texto: `Se guardaron los cambios de "${form.nombre}".` });
      } else {
        await api('/admin/ia/configuraciones', { cuerpo: { ...cuerpo, activa: form.activa } });
        setAviso({ tipo: 'exito', texto: `Se agregó la conexión "${form.nombre}".` });
      }
      setForm(null);
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof ErrorApi ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function accion(c: Conexion, tipo: 'activar' | 'desactivar') {
    setAviso(null);
    try {
      await api(`/admin/ia/configuraciones/${c.id}/${tipo}`, { metodo: 'POST' });
      setAviso({
        tipo: 'exito',
        texto: tipo === 'activar' ? `"${c.nombre}" quedó activa.` : `"${c.nombre}" quedó desactivada.`,
      });
      await cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof ErrorApi ? err.message : 'No se pudo cambiar.' });
    }
  }

  async function probar(c: Conexion) {
    setPruebas((p) => ({ ...p, [c.id]: 'probando' }));
    try {
      const r = await api<ResultadoPrueba>(`/admin/ia/configuraciones/${c.id}/probar`, { metodo: 'POST' });
      setPruebas((p) => ({ ...p, [c.id]: r }));
      await cargar();
    } catch (err) {
      setPruebas((p) => ({
        ...p,
        [c.id]: { ok: false, error: err instanceof ErrorApi ? err.message : 'No se pudo probar.', duracionMs: 0 },
      }));
    }
  }

  async function eliminar(c: Conexion) {
    setAviso(null);
    try {
      await api(`/admin/ia/configuraciones/${c.id}`, { metodo: 'DELETE' });
      setPorEliminar(null);
      setAviso({ tipo: 'exito', texto: `Se eliminó "${c.nombre}".` });
      await cargar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: err instanceof ErrorApi ? err.message : 'No se pudo eliminar.' });
    }
  }

  const nombreDe = (id: number | null) => conexiones.find((c) => c.id === id)?.nombre ?? 'Conexión eliminada';
  const ayudaProveedor = PROVEEDORES.find((p) => p.id === form?.proveedor)?.ayuda;

  return (
    <>
      <Encabezado enlaces={false} />
      <main className="pagina contenedor">
        <div className="panel" style={{ maxWidth: 900 }}>
          <div className="acciones" style={{ justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 32 }}>Configuración de IA</h1>
              <p className="sub">
                Elige qué modelo lee los pedidos de los clientes. Solo una conexión puede estar activa por propósito.
              </p>
            </div>
            <Link href="/panel">Volver al panel</Link>
          </div>

          {autorizado === null && <p className="sub">Cargando…</p>}
          {autorizado === false && (
            <p className="aviso aviso-error" role="alert">
              Esta sección es solo para el superadministrador.
            </p>
          )}
          {aviso && (
            <p className={`aviso aviso-${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
              {aviso.texto}
            </p>
          )}

          {autorizado && (
            <>
              <section className="tarjeta ancha">
                <div className="acciones" style={{ justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: 22 }}>Conexiones</h2>
                  {!form && (
                    <button type="button" className="boton boton-primario" onClick={abrirNueva}>
                      Agregar conexión
                    </button>
                  )}
                </div>

                {conexiones.length === 0 && !form && (
                  <p className="sub">
                    Todavía no hay ninguna. Agrega una con la clave de API de Claude, ChatGPT o Gemini.
                  </p>
                )}

                <ul className="conexiones">
                  {conexiones.map((c) => {
                    const prueba = pruebas[c.id];
                    return (
                      <li key={c.id} className={c.activa ? 'conexion activa' : 'conexion'}>
                        <div className="conexion-cabeza">
                          <div style={{ minWidth: 0 }}>
                            <strong>{c.nombre}</strong>
                            <div className="chips" style={{ marginTop: 6 }}>
                              <span className="chip">{c.proveedorNombre}</span>
                              <span className="chip chip-modelo">{c.modelo}</span>
                              <span className="chip">{PROPOSITOS[c.proposito]}</span>
                            </div>
                          </div>
                          <span className={c.activa ? 'estado estado-activa' : 'estado'}>
                            {c.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        <dl className="lista-datos">
                          <dt>Clave</dt>
                          <dd>{c.apiKey}</dd>
                          {c.baseUrl && (
                            <>
                              <dt>Dirección</dt>
                              <dd>{c.baseUrl}</dd>
                            </>
                          )}
                          <dt>Ajustes</dt>
                          <dd>
                            Máx. {numero.format(c.maxTokens)} tokens · Temperatura{' '}
                            {c.temperatura === null ? 'por defecto' : c.temperatura}
                          </dd>
                        </dl>

                        {prueba === 'probando' && <p className="aviso aviso-info">Probando conexión…</p>}
                        {prueba && prueba !== 'probando' && (
                          <p className={`aviso ${prueba.ok ? 'aviso-exito' : 'aviso-error'}`} role="status">
                            {prueba.ok
                              ? `Funciona (${numero.format(prueba.duracionMs)} ms). Respondió: “${prueba.respuesta}”`
                              : prueba.error}
                          </p>
                        )}

                        {porEliminar === c.id ? (
                          <div className="acciones">
                            <span>¿Eliminar “{c.nombre}”? Su historial de uso se conserva.</span>
                            <button type="button" className="boton boton-peligro" onClick={() => eliminar(c)}>
                              Sí, eliminar
                            </button>
                            <button type="button" className="boton boton-secundario" onClick={() => setPorEliminar(null)}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="acciones">
                            <button
                              type="button"
                              className="boton boton-secundario"
                              onClick={() => probar(c)}
                              disabled={prueba === 'probando'}
                            >
                              Probar
                            </button>
                            {c.activa ? (
                              <button type="button" className="boton boton-secundario" onClick={() => accion(c, 'desactivar')}>
                                Desactivar
                              </button>
                            ) : (
                              <button type="button" className="boton boton-primario" onClick={() => accion(c, 'activar')}>
                                Activar
                              </button>
                            )}
                            <button type="button" className="boton boton-secundario" onClick={() => abrirEdicion(c)}>
                              Editar
                            </button>
                            <button type="button" className="enlace-boton" onClick={() => setPorEliminar(c.id)}>
                              Eliminar
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              {form && (
                <section className="tarjeta ancha" aria-labelledby="titulo-form">
                  <h2 id="titulo-form" style={{ fontSize: 22 }}>
                    {form.id ? `Editar “${form.nombre}”` : 'Nueva conexión'}
                  </h2>
                  <form onSubmit={guardar} noValidate>
                    <label className="campo" htmlFor="ia-proveedor">
                      Proveedor
                      <select
                        id="ia-proveedor"
                        value={form.proveedor}
                        onChange={(e) => cambiar('proveedor', e.target.value as Proveedor)}
                      >
                        {PROVEEDORES.map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      {ayudaProveedor && <small>{ayudaProveedor}</small>}
                    </label>

                    <label className="campo" htmlFor="ia-nombre">
                      Nombre
                      <input
                        id="ia-nombre"
                        value={form.nombre}
                        onChange={(e) => cambiar('nombre', e.target.value)}
                        placeholder="Ej: Claude - producción"
                        required
                      />
                    </label>

                    <label className="campo" htmlFor="ia-clave">
                      Clave de API
                      <input
                        id="ia-clave"
                        type="password"
                        autoComplete="off"
                        value={form.apiKey}
                        onChange={(e) => cambiar('apiKey', e.target.value)}
                        placeholder={form.id ? 'Déjala vacía para conservar la actual' : 'Pega aquí la clave'}
                        required={!form.id}
                      />
                      <small>Se guarda cifrada. Nadie, ni siquiera tú, podrá verla completa después.</small>
                    </label>

                    {(form.proveedor === 'openai_compatible' || form.baseUrl) && (
                      <label className="campo" htmlFor="ia-url">
                        Dirección del servicio
                        <input
                          id="ia-url"
                          value={form.baseUrl}
                          onChange={(e) => cambiar('baseUrl', e.target.value)}
                          placeholder="https://openrouter.ai/api/v1"
                        />
                      </label>
                    )}

                    <div className="campo">
                      <label htmlFor="ia-modelo">Modelo</label>
                      <div className="fila-modelo">
                        <input
                          id="ia-modelo"
                          list="ia-modelos"
                          value={form.modelo}
                          onChange={(e) => cambiar('modelo', e.target.value)}
                          placeholder="Escríbelo o cárgalo desde el proveedor"
                          required
                        />
                        <button
                          type="button"
                          className="boton boton-secundario"
                          onClick={cargarModelos}
                          disabled={cargandoModelos || (!form.apiKey && !form.id)}
                        >
                          {cargandoModelos ? 'Consultando…' : 'Cargar modelos'}
                        </button>
                      </div>
                      <datalist id="ia-modelos">
                        {modelos.map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </datalist>
                      <small>
                        {modelos.length
                          ? `${modelos.length} modelos disponibles: haz clic en el campo para elegir.`
                          : 'Escribe la clave y presiona “Cargar modelos” para ver los disponibles.'}
                      </small>
                    </div>

                    <label className="campo" htmlFor="ia-proposito">
                      Propósito
                      <select
                        id="ia-proposito"
                        value={form.proposito}
                        onChange={(e) => cambiar('proposito', e.target.value as Proposito)}
                      >
                        {Object.entries(PROPOSITOS).map(([id, nombre]) => (
                          <option key={id} value={id}>{nombre}</option>
                        ))}
                      </select>
                      <small>Si no hay una conexión activa para el análisis, se usa la de uso general.</small>
                    </label>

                    <div className="dos-columnas">
                      <label className="campo" htmlFor="ia-tokens">
                        Máximo de tokens de respuesta
                        <input
                          id="ia-tokens"
                          type="number"
                          min={16}
                          max={64000}
                          value={form.maxTokens}
                          onChange={(e) => cambiar('maxTokens', e.target.value)}
                        />
                      </label>
                      <label className="campo" htmlFor="ia-temp">
                        Temperatura <small>(opcional, 0 a 2)</small>
                        <input
                          id="ia-temp"
                          type="number"
                          min={0}
                          max={2}
                          step={0.1}
                          value={form.temperatura}
                          onChange={(e) => cambiar('temperatura', e.target.value)}
                          placeholder="Por defecto"
                        />
                      </label>
                    </div>

                    {!form.id && (
                      <label className="casilla" htmlFor="ia-activa">
                        <input
                          id="ia-activa"
                          type="checkbox"
                          checked={form.activa}
                          onChange={(e) => cambiar('activa', e.target.checked)}
                        />
                        Dejarla activa de una vez (desactiva la que esté activa para ese propósito)
                      </label>
                    )}

                    {errorForm && <p className="aviso aviso-error" role="alert">{errorForm}</p>}

                    <div className="acciones">
                      <button className="boton boton-primario" type="submit" disabled={guardando}>
                        {guardando ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Agregar conexión'}
                      </button>
                      <button type="button" className="boton boton-secundario" onClick={() => setForm(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              )}

              <section className="tarjeta ancha">
                <h2 style={{ fontSize: 22 }}>Uso de los últimos 30 días</h2>
                {uso.length === 0 ? (
                  <p className="sub">Aún no hay llamadas registradas.</p>
                ) : (
                  <div className="tabla-caja">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th>Conexión</th>
                          <th>Modelo</th>
                          <th className="num">Llamadas</th>
                          <th className="num">Errores</th>
                          <th className="num">Tokens entrada</th>
                          <th className="num">Tokens salida</th>
                          <th className="num">Tiempo prom.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uso.map((u, i) => (
                          <tr key={i}>
                            <td>{nombreDe(u.configuracionId)}</td>
                            <td>{u.modelo}</td>
                            <td className="num">{numero.format(u.llamadas)}</td>
                            <td className="num">{numero.format(u.errores)}</td>
                            <td className="num">{numero.format(u.tokensEntrada)}</td>
                            <td className="num">{numero.format(u.tokensSalida)}</td>
                            <td className="num">{numero.format(u.duracionPromedioMs)} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
      <Pie />
    </>
  );
}
