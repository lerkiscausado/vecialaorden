# Veci a la Orden

Plataforma que conecta a vecinos que necesitan un arreglo en casa con maestros cercanos.
El cliente escribe por WhatsApp, la IA entiende el pedido, se avisa a los maestros de la zona
y los 5 primeros envían su cotización (pagando con créditos).

## Estructura

```
apps/
  api/   NestJS 11 + TypeORM 0.3 + MySQL 8 (JWT, registro, códigos por WhatsApp, créditos)
  web/   Next.js 16 (página de inicio, registro, ingreso, panel)
```

## Requisitos

- Node.js 20 o superior
- MySQL 8.0 o superior, con una base de datos vacía (`utf8mb4`)

## Puesta en marcha

```bash
# 1. Instalar dependencias (desde la raíz)
npm install

# 2. Configurar el API
cp apps/api/.env.example apps/api/.env
#    → llena DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, OTP_SECRET y CONFIG_ENCRYPTION_KEY

# 3. Crear las tablas
npm run migration:run

# 4. Configurar la web
cp apps/web/.env.example apps/web/.env.local

# 5. Arrancar (en dos terminales)
npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:3000
```

Para generar los secretos:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Crear el superadministrador

El superadministrador es quien configura los modelos de IA. Primero regístrate en la web y verifica
tu celular; luego, desde la raíz:

```bash
npm run superadmin -w apps/api -- 3001234567
```

Cierra sesión y vuelve a entrar. En tu panel aparecerá **Configuración de IA**.

### Códigos por WhatsApp en desarrollo

Mientras `WHATSAPP_TOKEN` esté vacío, los códigos **no se envían**: aparecen en la consola del API
(`[modo desarrollo] Código para +57...: 123456`). En producción, sin WhatsApp configurado, el API
se niega a enviar códigos.

Para el envío real hace falta en Meta: una app con WhatsApp Cloud API, el número verificado
(`WHATSAPP_PHONE_NUMBER_ID`), un token permanente (`WHATSAPP_TOKEN`) y una **plantilla de
autenticación** aprobada (`WHATSAPP_OTP_TEMPLATE`) con botón de copiar código.

## Ciudades y barrios

El servicio está pensado para toda Colombia. La tabla `ciudades` trae varias ciudades; solo las
**activas** reciben pedidos (al inicio, **Bogotá** y **Cartagena**). Para activar otra:

```sql
UPDATE ciudades SET activa = 1 WHERE codigoDane = '05001';  -- Medellín
```

Si alguien escribe desde una ciudad inactiva, el bot le responde que pronto llegamos.

**Barrios.** Sirven para ubicar el pedido cuando el cliente escribe el barrio en vez de compartir
su ubicación. Se importan desde un archivo CSV (`nombre;localidad;latitud;longitud`) o GeoJSON
(se toma el centro de cada polígono). Los portales de datos abiertos de Bogotá y de datos.gov.co
publican los barrios con su forma geográfica.

```bash
npm run importar-barrios -w apps/api -- 11001 ./barrios-bogota.geojson NOMBRE LOCALIDAD
npm run importar-barrios -w apps/api -- 13001 ./barrios-cartagena.csv
```

Sin barrios importados el bot igual funciona: pide la ubicación por WhatsApp y, si el cliente no
puede compartirla, usa el centro de la ciudad (marcado como ubicación aproximada).

**Zona del maestro.** Cada maestro define en su panel la ciudad, el barrio o su ubicación exacta
(el navegador la comparte) y hasta cuántos km quiere recibir trabajos (1 a 60).

## Bot de pedidos

`ConversacionService` es el cerebro del bot. No depende del canal: recibe un mensaje (texto o
ubicación) y devuelve las respuestas. Hoy lo usa el **simulador**; cuando esté la cuenta de Meta,
el webhook de WhatsApp lo llamará igual.

Flujo:

1. El cliente escribe su pedido. Si es nuevo, se le crea la cuenta (el celular ya viene de WhatsApp)
   y se le muestra el aviso de tratamiento de datos.
2. La IA activa extrae áreas, resumen, ciudad, barrio, medidas, tamaño y urgencia.
3. Si falta la ciudad o la ubicación, el bot las pide (acepta ubicación de WhatsApp o barrio).
4. Muestra el resumen; el cliente confirma con **SÍ** o escribe correcciones.
5. Al confirmar se publica el pedido y se avisa a los maestros del área cuyo radio alcanza el punto.

Comandos: **CANCELAR** (cancela el pedido en curso) y **NUEVO** (empieza otro pedido).
Si la conversación queda a medias más de 24 horas, se empieza de nuevo.

Cotizar cuesta 1 crédito (trabajo pequeño), 3 (mediano) o 5 (grande).

**Simulador:** en `/admin/simulador` (admin o superadmin) se chatea como cliente, se envían
ubicaciones de prueba y se ve lo que entendió la IA y a qué maestros se avisó.

> Por ahora los avisos a maestros se registran en `notificaciones_solicitud` y se muestran en la
> consola del API; el envío real por correo y WhatsApp se conecta con las cuentas de Resend y Meta.

## Cotizaciones

1. El maestro ve en **Trabajos** los pedidos de los que se le avisó (sus oficios, dentro de su radio).
2. Cotiza con mano de obra, materiales, mensaje, fecha y días de trabajo. Cotizar cuesta 1, 3 o 5
   créditos según el tamaño del trabajo.
3. Solo los **5 primeros** entran. El pedido se bloquea en la base mientras se cotiza, así dos maestros
   no pueden tomar el último cupo a la vez; quien llega tarde no pierde créditos.
4. El cliente recibe un aviso por cada cotización con el enlace `/pedidos/CODIGO`, donde las ve
   ordenadas (calificación y confianza 30%, precio justo 25%, rapidez 20%, cercanía 15%, experiencia 10%) y elige.
5. Al elegir: el maestro elegido recibe el contacto del cliente y viceversa; a los demás se les avisa.
   Los celulares solo se revelan después de elegir.

**Panel del maestro** (`/panel`), por pestañas: *Trabajos*, *Mis cotizaciones* (enviadas, elegidas,
en espera, valor ganado y filtros), *Créditos* (saldo, paquetes y movimientos) y *Mi zona y cuenta*.

## Calificaciones y confianza

Cuando el maestro elegido termina, el cliente lo califica en `/pedidos/CODIGO` (el enlace llega por
WhatsApp al elegir). Califica de 1 a 5 estrellas cuatro aspectos, con la **confianza** primero:

| Aspecto | Qué mide |
|---|---|
| **Confianza** | Honestidad, respeto por la casa, sensación de seguridad |
| Calidad del trabajo | Quedó bien hecho y bien terminado |
| Puntualidad | Llegó a tiempo y terminó cuando dijo |
| Cumplimiento | Respetó el precio y lo acordado |

- La calificación general es el promedio de los cuatro. El perfil guarda aparte el promedio de confianza.
- En cada cotización el cliente ve "★ 4.8 · 🛡 Confianza 4.9" y puede ordenar por *Más confiable*.
- En el orden recomendado, la confianza pesa la mitad del 30% de calificación.
- Con 3 o más calificaciones y confianza menor a 3, se muestra **"Confianza baja según otros clientes"**
  en sus cotizaciones y una alerta en el panel administrativo.
- Al calificar, el pedido pasa a *Terminado*, sube el contador de trabajos del maestro y se le avisa.
- El maestro ve todo en la pestaña **Calificaciones** de su panel.

## Panel administrativo (solo superadmin)

`/admin`, con tres pestañas:

- **Resumen**: pedidos publicados, % con cotización, % con maestro elegido, cotizaciones por pedido,
  tiempo a la primera cotización, ingresos, créditos (comprados, regalados, usados, ajustes), maestros
  por verificar, uso de la IA, cifras por ciudad y gráficos diarios (7, 30 o 90 días).
- **Maestros**: buscar y filtrar; verificar o rechazar, suspender o reactivar y ajustar créditos
  (queda registrado en el libro con el motivo).
- **Pedidos**: todos los pedidos con cliente, lugar, maestros avisados, cotizaciones y estado.

Una suspensión o un cambio de rol aplica de inmediato: en cada petición se revisa el estado y el rol
actuales de la cuenta, no solo lo que dice el token.

## Inteligencia artificial (multiproveedor)

El modelo que lee los pedidos de los clientes **no está fijo en el código**: el superadministrador lo
elige en `/admin/ia`. Se pueden registrar varias conexiones y activar una por propósito.

| Proveedor | Qué se necesita |
|---|---|
| Claude (Anthropic) | Clave de console.anthropic.com |
| ChatGPT (OpenAI) | Clave de platform.openai.com |
| Gemini (Google) | Clave de aistudio.google.com |
| Compatible con OpenAI | Clave y dirección del servicio (OpenRouter, DeepSeek, Groq, servidor propio…) |

- El botón **Cargar modelos** consulta al proveedor los modelos disponibles para esa clave.
- **Probar** envía un mensaje corto y muestra la respuesta y el tiempo.
- Las claves se guardan **cifradas** (AES-256-GCM) con `CONFIG_ENCRYPTION_KEY`. Si cambias o pierdes
  esa llave, hay que volver a escribir las claves de IA.
- Cada llamada queda en `registros_ia` (tokens, tiempo, errores) y se resume en la misma pantalla.
- En el código, cualquier módulo usa `IaService.completar()` o `completarJson()` sin saber qué
  proveedor hay detrás.

## Base de datos

Las migraciones están en `apps/api/src/database/migrations`:

| Migración | Qué hace |
|---|---|
| `EsquemaInicial` | Crea las 16 tablas (usuarios, perfiles de maestro, áreas, barrios, códigos OTP, solicitudes, cotizaciones, notificaciones, movimientos de créditos, paquetes, pagos, reseñas, documentos, mensajes de WhatsApp) |
| `DatosIniciales` | Carga los 7 oficios y los 3 paquetes de créditos |
| `ConfiguracionIa` | Rol `superadmin`, tablas `configuraciones_ia` y `registros_ia` |
| `Ciudades` | Tablas `ciudades` y `conversaciones`; ciudad en barrios, usuarios y solicitudes |
| `DatosCiudades` | 8 ciudades (Bogotá y Cartagena activas) |
| `CalificacionConfianza` | Calificación por aspectos (confianza, calidad, puntualidad, cumplimiento) y promedio de confianza |

```bash
npm run migration:run       # aplica las pendientes
npm run migration:revert    # deshace la última
npm run migration:show -w apps/api   # lista el estado
```

Reglas del esquema:

- **Créditos:** `movimientos_credito` es un libro que nunca se edita. `perfiles_maestro.saldoCreditos`
  es una copia que se actualiza en la misma transacción, con la fila del maestro bloqueada.
  Un índice único sobre (tipo, referencia) evita, por ejemplo, sumar dos veces el mismo pago.
- **Fechas:** todo se guarda en UTC. El API fuerza `time_zone = '+00:00'` en cada conexión.
- **Ubicación:** latitud y longitud en `DECIMAL(9,6)`; las distancias se calculan con
  `ST_Distance_Sphere` de MySQL.

## API

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| GET | `/areas` | público | Oficios disponibles |
| GET | `/paquetes` | público | Paquetes de créditos |
| POST | `/auth/registro` | público | Crea la cuenta (cliente o maestro) y envía código por WhatsApp |
| POST | `/auth/codigo` | público | Envía un código para entrar |
| POST | `/auth/codigo/verificar` | público | Verifica el código y entrega el token |
| POST | `/auth/login` | público | Entra con correo o celular + contraseña |
| GET | `/auth/yo` | con token | Datos de la cuenta |
| GET | `/creditos/movimientos` | maestro | Historial de créditos |
| GET | `/admin/ia/configuraciones` | superadmin | Conexiones de IA (claves enmascaradas) |
| POST | `/admin/ia/configuraciones` | superadmin | Agregar conexión |
| PATCH | `/admin/ia/configuraciones/:id` | superadmin | Editar (la clave solo cambia si se envía) |
| POST | `/admin/ia/configuraciones/:id/activar` · `/desactivar` | superadmin | Elegir la conexión activa |
| POST | `/admin/ia/configuraciones/:id/probar` | superadmin | Probar la conexión |
| DELETE | `/admin/ia/configuraciones/:id` | superadmin | Eliminar |
| POST | `/admin/ia/modelos` | superadmin | Modelos disponibles en el proveedor |
| GET | `/admin/ia/uso?dias=30` | superadmin | Consumo por conexión |
| GET | `/ciudades` | público | Ciudades activas |
| PATCH | `/maestros/yo/zona` | maestro | Ciudad, barrio o ubicación exacta, radio y avisos |
| POST | `/admin/simulador/mensajes` | admin | Envía un mensaje al bot como cliente |
| GET · DELETE | `/admin/simulador/:celular` | admin | Ver o reiniciar una conversación de prueba |
| GET | `/maestros/yo/trabajos` | maestro | Trabajos avisados y si puede cotizarlos |
| POST | `/maestros/yo/trabajos/:codigo/cotizar` | maestro | Enviar cotización (descuenta créditos) |
| GET | `/maestros/yo/cotizaciones?estado=` | maestro | Historial con resumen |
| GET | `/pedidos` · `/pedidos/:codigo` | con token | Pedidos del usuario y cotizaciones ordenadas |
| POST | `/pedidos/:codigo/elegir` | con token | Elegir maestro |
| POST | `/pedidos/:codigo/calificar` | con token | Calificar al maestro (4 aspectos) y terminar el pedido |
| GET | `/maestros/yo/calificaciones` | maestro | Promedios por aspecto y comentarios |
| GET | `/admin/resumen?dias=30` | superadmin | Cifras del tablero |
| GET | `/admin/maestros` · `/admin/pedidos` | superadmin | Listados con filtros |
| PATCH | `/admin/maestros/:id/verificacion` | superadmin | Verificar o rechazar |
| PATCH | `/admin/usuarios/:id/estado` | superadmin | Suspender o reactivar |
| POST | `/admin/maestros/:id/creditos` | superadmin | Ajuste de créditos con motivo |

El token va en el encabezado `Authorization: Bearer <token>`.

## Pendientes conocidos

- **Seguridad de sesión:** hoy se usa solo un token de acceso (7 días) guardado en el navegador.
  Pasar a token de acceso corto + token de renovación en cookie `httpOnly`.
- **Barrios:** importar los barrios de Bogotá y Cartagena (ver "Ciudades y barrios").
- **WhatsApp real:** conectar el webhook de Meta a `ConversacionService`. Los avisos (`MensajeriaService`)
  ya se envían si WhatsApp está configurado, pero fuera de la ventana de 24 horas Meta exige plantillas aprobadas.
- **Recordatorio de calificación:** escribirle al cliente unos días después de elegir si aún no ha calificado.
- **Política de datos:** `/privacidad` es un borrador; el texto final debe revisarlo un abogado.
- **Precios de referencia:** las columnas `precioRefMin` y `precioRefMax` de `areas` están vacías
  hasta tener datos reales.

## Fases

1. ✅ Base: monorepo, migraciones, autenticación, inicio, registro, panel y configuración de IA.
2. ✅ Cerebro del bot + análisis con IA + ciudades + zona del maestro + simulador. (Falta conectar el webhook de Meta.)
3. ✅ Cotizaciones con 5 cupos, elección del cliente, panel del maestro por pestañas y panel administrativo.
4. Compra de créditos con Wompi.
