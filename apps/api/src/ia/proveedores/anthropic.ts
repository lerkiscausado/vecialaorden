import { ClienteIa, ConexionIa, INSTRUCCION_JSON, ModeloIa, PeticionIa, pedirJson, RespuestaIa, unirUrl } from './tipos';

/** Claude (Anthropic) — Messages API. */
export const URL_ANTHROPIC = 'https://api.anthropic.com/v1';
const VERSION_API = '2023-06-01';

function encabezados(apiKey: string) {
  return {
    'x-api-key': apiKey,
    'anthropic-version': VERSION_API,
    'content-type': 'application/json',
  };
}

export const clienteAnthropic: ClienteIa = {
  async completar(c: ConexionIa, p: PeticionIa): Promise<RespuestaIa> {
    const sistema = [p.sistema, p.json ? INSTRUCCION_JSON : null].filter(Boolean).join('\n\n');
    const datos = await pedirJson<any>(unirUrl(c.baseUrl || URL_ANTHROPIC, 'messages'), {
      method: 'POST',
      headers: encabezados(c.apiKey),
      body: JSON.stringify({
        model: c.modelo,
        max_tokens: c.maxTokens,
        ...(sistema ? { system: sistema } : {}),
        ...(c.temperatura != null ? { temperature: c.temperatura } : {}),
        messages: [{ role: 'user', content: p.mensaje }],
      }),
    });
    const texto = (datos?.content ?? [])
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text)
      .join('');
    return {
      texto,
      tokensEntrada: datos?.usage?.input_tokens,
      tokensSalida: datos?.usage?.output_tokens,
    };
  },

  async listarModelos(c): Promise<ModeloIa[]> {
    const datos = await pedirJson<any>(unirUrl(c.baseUrl || URL_ANTHROPIC, 'models?limit=1000'), {
      headers: encabezados(c.apiKey),
    });
    return (datos?.data ?? []).map((m: any) => ({ id: m.id, nombre: m.display_name || m.id }));
  },
};
