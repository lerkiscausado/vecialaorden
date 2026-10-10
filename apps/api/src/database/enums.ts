export enum RolUsuario {
  CLIENTE = 'cliente',
  MAESTRO = 'maestro',
  ADMIN = 'admin',
  /** Dueño de la plataforma: además de todo lo del admin, maneja la configuración sensible (IA, claves). */
  SUPERADMIN = 'superadmin',
}

export enum ProveedorIa {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  /** Cualquier servicio con API compatible con OpenAI (OpenRouter, DeepSeek, Groq, un servidor propio…). */
  OPENAI_COMPATIBLE = 'openai_compatible',
}

export enum PropositoIa {
  /** Leer el pedido del cliente y extraer área, medidas, barrio y tamaño. */
  ANALISIS_SOLICITUDES = 'analisis_solicitudes',
  /** Uso general (respuestas del bot, resúmenes…). */
  GENERAL = 'general',
}

export enum EstadoUsuario {
  ACTIVO = 'activo',
  SUSPENDIDO = 'suspendido',
}

export enum EstadoVerificacion {
  PENDIENTE = 'pendiente',
  VERIFICADO = 'verificado',
  RECHAZADO = 'rechazado',
}

export enum TipoDocumento {
  CEDULA = 'cedula',
  ANTECEDENTES = 'antecedentes',
  OTRO = 'otro',
}

export enum PropositoOtp {
  LOGIN = 'login',
  VERIFICAR_CELULAR = 'verificar_celular',
}

export enum CanalSolicitud {
  WHATSAPP = 'whatsapp',
  WEB = 'web',
}

export enum TamanoTrabajo {
  PEQUENO = 'pequeno',
  MEDIANO = 'mediano',
  GRANDE = 'grande',
}

export enum EstadoSolicitud {
  /** Recibida, falta confirmar o completar datos con el cliente. */
  BORRADOR = 'borrador',
  /** Confirmada y notificada; aceptando cotizaciones. */
  ABIERTA = 'abierta',
  /** Ya llegó al máximo de cotizaciones. */
  CUPOS_LLENOS = 'cupos_llenos',
  /** El cliente eligió un maestro. */
  ASIGNADA = 'asignada',
  COMPLETADA = 'completada',
  CANCELADA = 'cancelada',
  VENCIDA = 'vencida',
}

export enum CanalNotificacion {
  CORREO = 'correo',
  WHATSAPP = 'whatsapp',
}

export enum EstadoCotizacion {
  ENVIADA = 'enviada',
  ELEGIDA = 'elegida',
  DESCARTADA = 'descartada',
  RETIRADA = 'retirada',
}

export enum TipoMovimientoCredito {
  COMPRA = 'compra',
  REGALO = 'regalo',
  COTIZACION = 'cotizacion',
  DEVOLUCION = 'devolucion',
  VENCIMIENTO = 'vencimiento',
  AJUSTE = 'ajuste',
}

export enum EstadoPago {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  ANULADO = 'anulado',
  ERROR = 'error',
}

export enum EstadoConversacion {
  /** Sin pedido en curso: se espera que el cliente cuente qué necesita. */
  INICIO = 'inicio',
  ESPERANDO_CIUDAD = 'esperando_ciudad',
  ESPERANDO_UBICACION = 'esperando_ubicacion',
  ESPERANDO_CONFIRMACION = 'esperando_confirmacion',
  /** La solicitud ya se publicó y se avisó a los maestros. */
  PUBLICADA = 'publicada',
}

export enum DireccionMensaje {
  ENTRANTE = 'entrante',
  SALIENTE = 'saliente',
}
