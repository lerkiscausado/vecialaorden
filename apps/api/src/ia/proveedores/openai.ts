import { ProveedorIa } from '../../database/enums';
import { ClienteIa, ConexionIa, INSTRUCCION_JSON, ModeloIa, PeticionIa, pedirJson, RespuestaIa, unirUrl } from './tipos';

/**
 * ChatGPT (OpenAI) y cualquier servicio compatible con la API de OpenAI
 * (OpenRouter, DeepSeek, Groq, un servidor propio…) — Chat Completions.
 */
export const URL_OPENAI = 'https://api.openai.com/v1';

function encabezados(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}

export const clienteOpenAi: ClienteIa = {
  async completar(c: ConexionIa, p: PeticionIa): Promise<RespuestaIa> {
    const esOpenAi = c.proveedor === ProveedorIa.OPENAI;
    const sistema = [p.sistema, p.json ? INSTRUCCION_JSON : null].filter(Boolean).join('\n\n');
    const mensajes = [
      ...(sistema ? [{ role: 'system', content: sistema }] : []),
      { role: 'user', content: p.mensaje },
    ];

    const datos = await pedirJson<any>(unirUrl(c.baseUrl || URL_OPENAI, 'chat/completions'), {
      method: 'POST',
      headers: encabezados(c.apiKey),
      body: JSON.stringify({
        model: c.modelo,
        messages: mensajes,
        // Los modelos recientes de OpenAI usan max_completion_tokens; los compatibles, max_tokens.
        ...(esOpenAi ? { max_completion_tokens: c.maxTokens } : { max_tokens: c.maxTokens }),
        ...(c.temperatura != null ? { temperature: c.temperatura } : {}),
        // El modo JSON solo se fuerza en OpenAI; en los compatibles basta la instrucción.
        ...(p.json && esOpenAi ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    const contenido = datos?.choices?.[0]?.message?.content;
    return {
      texto: typeof contenido === 'string' ? contenido : '',
      tokensEntrada: datos?.usage?.prompt_tokens,
      tokensSalida: datos?.usage?.completion_tokens,
    };
  },

  async listarModelos(c): Promise<ModeloIa[]> {
    const datos = await pedirJson<any>(unirUrl(c.baseUrl || URL_OPENAI, 'models'), {
      headers: encabezados(c.apiKey),
    });
    return (datos?.data ?? [])
      .map((m: any) => ({ id: m.id, nombre: m.name || m.id }))
      .sort((a: ModeloIa, b: ModeloIa) => a.id.localeCompare(b.id));
  },
};
