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
#    → llena DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET y OTP_SECRET

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

### Códigos por WhatsApp en desarrollo

Mientras `WHATSAPP_TOKEN` esté vacío, los códigos **no se envían**: aparecen en la consola del API
(`[modo desarrollo] Código para +57...: 123456`). En producción, sin WhatsApp configurado, el API
se niega a enviar códigos.

Para el envío real hace falta en Meta: una app con WhatsApp Cloud API, el número verificado
(`WHATSAPP_PHONE_NUMBER_ID`), un token permanente (`WHATSAPP_TOKEN`) y una **plantilla de
autenticación** aprobada (`WHATSAPP_OTP_TEMPLATE`) con botón de copiar código.

## Base de datos

Las migraciones están en `apps/api/src/database/migrations`:

| Migración | Qué hace |
|---|---|
| `EsquemaInicial` | Crea las 16 tablas (usuarios, perfiles de maestro, áreas, barrios, códigos OTP, solicitudes, cotizaciones, notificaciones, movimientos de créditos, paquetes, pagos, reseñas, documentos, mensajes de WhatsApp) |
| `DatosIniciales` | Carga los 7 oficios y los 3 paquetes de créditos |

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

## API (fase 1)

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

El token va en el encabezado `Authorization: Bearer <token>`.

## Pendientes conocidos

- **Seguridad de sesión:** hoy se usa solo un token de acceso (7 días) guardado en el navegador.
  Pasar a token de acceso corto + token de renovación en cookie `httpOnly`.
- **Barrios:** la tabla `barrios` está vacía. Importar los barrios de Bogotá con su punto central
  desde el portal de Datos Abiertos de Bogotá.
- **Precios de referencia:** las columnas `precioRefMin` y `precioRefMax` de `areas` están vacías
  hasta tener datos reales.

## Fases

1. ✅ Base: monorepo, migraciones, autenticación, inicio, registro y panel.
2. Bot de WhatsApp + análisis con IA + búsqueda de maestros cercanos.
3. Panel del maestro: solicitudes, cotizaciones con 5 cupos y descuento de créditos.
4. Compra de créditos con Wompi.
