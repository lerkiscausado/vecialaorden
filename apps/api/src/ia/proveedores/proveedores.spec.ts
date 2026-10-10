import { ProveedorIa } from '../../database/enums';
import { clientePara, ConexionIa, ErrorProveedorIa, extraerJson } from './index';

/** Reemplaza fetch y guarda la última petición para revisarla. */
function simularFetch(respuesta: unknown, estado = 200) {
  const llamadas: { url: string; init: RequestInit }[] = [];
  global.fetch = jest.fn(async (url: any, init: any) => {
    llamadas.push({ url: String(url), init });
    return new Response(JSON.stringify(respuesta), { status: estado });
  }) as any;
  return llamadas;
}

const cuerpo = (init: RequestInit) => JSON.parse(String(init.body));
const encabezados = (init: RequestInit) => init.headers as Record<string, string>;

function conexion(proveedor: ProveedorIa, extra: Partial<ConexionIa> = {}): ConexionIa {
  return { proveedor, modelo: 'modelo-x', apiKey: 'clave-secreta', maxTokens: 300, ...extra };
}

const peticion = { sistema: 'Eres un clasificador.', mensaje: 'Necesito estuco', json: true };

describe('Claude (Anthropic)', () => {
  it('arma la petición de Messages API y lee texto y tokens', async () => {
    const llamadas = simularFetch({
      content: [{ type: 'text', text: '{"area":' }, { type: 'text', text: '"estuco"}' }],
      usage: { input_tokens: 12, output_tokens: 5 },
    });
    const r = await clientePara(ProveedorIa.ANTHROPIC).completar(
      conexion(ProveedorIa.ANTHROPIC, { temperatura: 0.2 }),
      peticion,
    );

    expect(llamadas[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect(encabezados(llamadas[0].init)['x-api-key']).toBe('clave-secreta');
    expect(encabezados(llamadas[0].init)['anthropic-version']).toBe('2023-06-01');
    const b = cuerpo(llamadas[0].init);
    expect(b).toMatchObject({ model: 'modelo-x', max_tokens: 300, temperature: 0.2 });
    expect(b.system).toContain('Eres un clasificador.');
    expect(b.system).toContain('JSON');
    expect(b.messages).toEqual([{ role: 'user', content: 'Necesito estuco' }]);
    expect(r).toEqual({ texto: '{"area":"estuco"}', tokensEntrada: 12, tokensSalida: 5 });
  });

  it('lista los modelos', async () => {
    simularFetch({ data: [{ id: 'claude-a', display_name: 'Claude A' }] });
    const modelos = await clientePara(ProveedorIa.ANTHROPIC).listarModelos({
      proveedor: ProveedorIa.ANTHROPIC,
      apiKey: 'k',
    });
    expect(modelos).toEqual([{ id: 'claude-a', nombre: 'Claude A' }]);
  });
});

describe('ChatGPT (OpenAI)', () => {
  it('usa max_completion_tokens y el modo JSON', async () => {
    const llamadas = simularFetch({
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 20, completion_tokens: 4 },
    });
    const r = await clientePara(ProveedorIa.OPENAI).completar(conexion(ProveedorIa.OPENAI), peticion);

    expect(llamadas[0].url).toBe('https://api.openai.com/v1/chat/completions');
    expect(encabezados(llamadas[0].init).Authorization).toBe('Bearer clave-secreta');
    const b = cuerpo(llamadas[0].init);
    expect(b.max_completion_tokens).toBe(300);
    expect(b.max_tokens).toBeUndefined();
    expect(b.temperature).toBeUndefined();
    expect(b.response_format).toEqual({ type: 'json_object' });
    expect(b.messages[0].role).toBe('system');
    expect(b.messages[1]).toEqual({ role: 'user', content: 'Necesito estuco' });
    expect(r).toEqual({ texto: '{"ok":true}', tokensEntrada: 20, tokensSalida: 4 });
  });

  it('en un servicio compatible usa su dirección y max_tokens', async () => {
    const llamadas = simularFetch({ choices: [{ message: { content: 'hola' } }] });
    await clientePara(ProveedorIa.OPENAI_COMPATIBLE).completar(
      conexion(ProveedorIa.OPENAI_COMPATIBLE, { baseUrl: 'https://openrouter.ai/api/v1/' }),
      peticion,
    );
    expect(llamadas[0].url).toBe('https://openrouter.ai/api/v1/chat/completions');
    const b = cuerpo(llamadas[0].init);
    expect(b.max_tokens).toBe(300);
    expect(b.response_format).toBeUndefined();
  });
});

describe('Gemini (Google)', () => {
  it('arma generateContent y lee texto y tokens', async () => {
    const llamadas = simularFetch({
      candidates: [{ content: { parts: [{ text: 'pensando', thought: true }, { text: '{"a":1}' }] } }],
      usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 6 },
    });
    const r = await clientePara(ProveedorIa.GEMINI).completar(
      conexion(ProveedorIa.GEMINI, { modelo: 'models/gemini-x' }),
      peticion,
    );

    expect(llamadas[0].url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent',
    );
    expect(encabezados(llamadas[0].init)['x-goog-api-key']).toBe('clave-secreta');
    const b = cuerpo(llamadas[0].init);
    expect(b.systemInstruction).toEqual({ parts: [{ text: 'Eres un clasificador.' }] });
    expect(b.contents).toEqual([{ role: 'user', parts: [{ text: 'Necesito estuco' }] }]);
    expect(b.generationConfig).toEqual({ maxOutputTokens: 300, responseMimeType: 'application/json' });
    expect(r).toEqual({ texto: '{"a":1}', tokensEntrada: 30, tokensSalida: 6 });
  });

  it('avisa cuando Gemini bloquea la petición', async () => {
    simularFetch({ promptFeedback: { blockReason: 'SAFETY' } });
    await expect(
      clientePara(ProveedorIa.GEMINI).completar(conexion(ProveedorIa.GEMINI), peticion),
    ).rejects.toThrow('SAFETY');
  });

  it('lista solo modelos que generan contenido', async () => {
    simularFetch({
      models: [
        { name: 'models/gemini-x', displayName: 'Gemini X', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embed', displayName: 'Embed', supportedGenerationMethods: ['embedContent'] },
      ],
    });
    const modelos = await clientePara(ProveedorIa.GEMINI).listarModelos({
      proveedor: ProveedorIa.GEMINI,
      apiKey: 'k',
    });
    expect(modelos).toEqual([{ id: 'gemini-x', nombre: 'Gemini X' }]);
  });
});

describe('errores de los proveedores', () => {
  it('traduce una clave inválida a un mensaje claro', async () => {
    simularFetch({ error: { message: 'invalid x-api-key' } }, 401);
    const promesa = clientePara(ProveedorIa.ANTHROPIC).completar(conexion(ProveedorIa.ANTHROPIC), peticion);
    await expect(promesa).rejects.toBeInstanceOf(ErrorProveedorIa);
    await expect(promesa).rejects.toThrow('La clave de API no es válida');
  });
});

describe('extraerJson', () => {
  it('acepta JSON con cercas de código o texto alrededor', () => {
    expect(extraerJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extraerJson('Claro: {"a":2} listo')).toEqual({ a: 2 });
  });
  it('falla si no hay JSON', () => {
    expect(() => extraerJson('sin datos')).toThrow();
  });
});
