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

El token va en el encabezado `Authorization: Bearer <token>`.

## Pendientes conocidos

- **Seguridad de sesión:** hoy se usa solo un token de acceso (7 días) guardado en el navegador.
  Pasar a token de acceso corto + token de renovación en cookie `httpOnly`.
- **Barrios:** importar los barrios de Bogotá y Cartagena (ver "Ciudades y barrios").
- **WhatsApp real:** conectar el webhook de Meta a `ConversacionService` y enviar los avisos a maestros.
- **Política de datos:** `/privacidad` es un borrador; el texto final debe revisarlo un abogado.
- **Precios de referencia:** las columnas `precioRefMin` y `precioRefMax` de `areas` están vacías
  hasta tener datos reales.

## Fases

1. ✅ Base: monorepo, migraciones, autenticación, inicio, registro, panel y configuración de IA.
2. ✅ Cerebro del bot + análisis con IA + ciudades + zona del maestro + simulador. (Falta conectar el webhook de Meta.)
3. Panel del maestro: solicitudes, cotizaciones con 5 cupos y descuento de créditos.
4. Compra de créditos con Wompi.
