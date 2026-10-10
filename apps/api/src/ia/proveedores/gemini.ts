import { ClienteIa, ConexionIa, ErrorProveedorIa, ModeloIa, PeticionIa, pedirJson, RespuestaIa, unirUrl } from './tipos';

/** Gemini (Google AI Studio) — generateContent. */
export const URL_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

function encabezados(apiKey: string) {
  return { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' };
}

export const clienteGemini: ClienteIa = {
  async completar(c: ConexionIa, p: PeticionIa): Promise<RespuestaIa> {
    const modelo = c.modelo.replace(/^models\//, '');
    const datos = await pedirJson<any>(
      unirUrl(c.baseUrl || URL_GEMINI, `models/${encodeURIComponent(modelo)}:generateContent`),
      {
        method: 'POST',
        headers: encabezados(c.apiKey),
        body: JSON.stringify({
          ...(p.sistema ? { systemInstruction: { parts: [{ text: p.sistema }] } } : {}),
          contents: [{ role: 'user', parts: [{ text: p.mensaje }] }],
          generationConfig: {
            maxOutputTokens: c.maxTokens,
            ...(c.temperatura != null ? { temperature: c.temperatura } : {}),
            ...(p.json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      },
    );

    const candidato = datos?.candidates?.[0];
    if (!candidato) {
      const bloqueo = datos?.promptFeedback?.blockReason;
      throw new ErrorProveedorIa(
        bloqueo ? `Gemini bloqueó la petición (${bloqueo}).` : 'Gemini no devolvió ninguna respuesta.',
      );
    }
    const texto = (candidato.content?.parts ?? [])
      .filter((parte: any) => typeof parte?.text === 'string' && !parte.thought)
      .map((parte: any) => parte.text)
      .join('');
    return {
      texto,
      tokensEntrada: datos?.usageMetadata?.promptTokenCount,
      tokensSalida: datos?.usageMetadata?.candidatesTokenCount,
    };
  },

  async listarModelos(c): Promise<ModeloIa[]> {
    const datos = await pedirJson<any>(unirUrl(c.baseUrl || URL_GEMINI, 'models?pageSize=1000'), {
      headers: encabezados(c.apiKey),
    });
    return (datos?.models ?? [])
      .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m: any) => ({ id: String(m.name).replace(/^models\//, ''), nombre: m.displayName || m.name }));
  },
};
