export enum RolUsuario {
  CLIENTE = 'cliente',
  MAESTRO = 'maestro',
  ADMIN = 'admin',
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

export enum DireccionMensaje {
  ENTRANTE = 'entrante',
  SALIENTE = 'saliente',
}
