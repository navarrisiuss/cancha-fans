# Modelo de datos — Firestore

> Propuesta inicial. Cualquier cambio al esquema se propone antes de implementarlo.

## Principios

**Firestore no tiene JOINs.** Denormaliza: la reserva guarda el nombre del complejo, el nombre de
la cancha y el precio **copiados**, no solo los IDs. Así "Mis reservas" se pinta con una sola
consulta. El precio copiado además es histórico: si el arrendatario sube la tarifa, las reservas
antiguas conservan lo que se pagó.

**Se guardan excepciones, no disponibilidad.** No existe colección de bloques. Ver la regla
crítica en `CLAUDE.md`.

**Cada lectura cuesta.** Antes de escribir una consulta, estima cuántos documentos devuelve.

## Colecciones

### `users/{userId}`

El ID es el UID de Firebase Auth.

- `email`, `displayName`, `phone`, `photoURL`
- `isAdmin` (boolean, por defecto `false`, solo se activa manualmente desde consola)
- `createdAt`

No hay campo `role`. Ser arrendatario se deriva de tener complejos con `ownerId == userId`.

### `complejos/{complejoId}`

- `ownerId` → `users/{userId}`
- `nombre`, `descripcion`, `comuna`, `direccion`
- `fotos` (array de URLs de Storage)
- `rut`, `razonSocial`, `datosBancarios` (visibles solo para el dueño y el admin)
- `estado`: `borrador` | `en_revision` | `aprobado` | `rechazado`
- `formatosDisponibles` (array: `F5`, `F7`, `F11`) — denormalizado desde las canchas para poder
  filtrar en la búsqueda sin leer las subcolecciones
- `notaAdmin`, `revisadoPor`, `revisadoAt`
- `ratingPromedio`, `totalResenas` (denormalizados)
- `createdAt`, `updatedAt`

Solo los complejos con `estado == 'aprobado'` aparecen en búsquedas públicas.

### `complejos/{complejoId}/canchas/{canchaId}`

- `nombre` (ej. "F5 #2")
- `formato`: `F5` | `F7` | `F11`
- `superficie`: `sintetico` | `pasto_natural`
- `techada` (boolean)
- `precioPorBloque` (number, CLP, entero)
- `duracionBloqueMin` (number, típicamente 60)
- `horarioAtencion`: objeto con una entrada por día de la semana:
  ```
  { lunes: { abre: "17:00", cierra: "23:00" }, ..., domingo: null }
  ```
  `null` significa cerrado ese día.
- `activa` (boolean) — permite ocultar una cancha sin borrarla
- `createdAt`, `updatedAt`

Horas en formato `"HH:mm"`, zona horaria fija America/Santiago.

### `reservas/{reservaId}`

Colección raíz, no subcolección: el jugador necesita consultar sus reservas a través de varios
complejos.

- `codigo` (legible, tipo `A-10482`, generado al crear)
- `jugadorId`, `jugadorNombre`, `jugadorEmail`
- `complejoId`, `complejoNombre`, `complejoComuna`, `ownerId`
- `canchaId`, `canchaNombre`, `canchaFormato`
- `inicio`, `fin` (timestamps)
- `precioTotal`, `montoPagado`, `saldoPendiente`
- `tipoPago`: `total` | `sena`
- `comision` (6% de `precioTotal`, calculada al confirmar)
- `estado`: ver máquina de estados abajo
- `cancelableHasta` (timestamp = `createdAt` + 1 h, calculado en el servidor)
- `canceladaPor`: `jugador` | `arrendatario` | `null`
- `motivoCancelacion`
- `tieneResena` (boolean)
- `webpayToken`, `webpayOrdenCompra` (referencia del pago simulado)
- `createdAt`, `updatedAt`

Índices compuestos necesarios:
- `jugadorId` + `inicio` (Mis reservas)
- `canchaId` + `inicio` (cálculo de disponibilidad)
- `ownerId` + `inicio` (panel del arrendatario)

### `bloqueos/{bloqueoId}`

Bloqueos manuales del arrendatario (mantención, evento privado, lluvia).

- `complejoId`, `canchaId`, `ownerId`
- `inicio`, `fin`
- `motivo`
- `createdAt`

Un bloqueo puede cubrir varias horas seguidas, no solo un bloque.

### `resenas/{reservaId}`

El ID del documento **es el ID de la reserva**, no uno autogenerado. Como la regla de negocio ya es
una reseña por reserva, esto evita tener que hacer una query para saber si ya existe: la security
rule solo necesita `exists()` sobre ese mismo ID.

- `complejoId`, `canchaId`
- `jugadorId`, `jugadorNombre`
- `rating` (1 a 5), `comentario`
- `equipoNombre`, `equipoRivalNombre`, `resultado` (texto libre, todos opcionales — ej. "Los
  Tigres", "Halcones FC", "3-2"). Sin validación de formato ni entidad "equipo" detrás; es
  contenido de la reseña, igual que el comentario.
- `reportada` (boolean)
- `createdAt`

Al crear una reseña se actualizan `ratingPromedio` y `totalResenas` del complejo en la misma
transacción.

### `notificaciones/{notificacionId}`

- `userId` (destinatario)
- `tipo`: `reserva_confirmada` | `reserva_cancelada_jugador` | `reserva_cancelada_arrendatario` |
  `nueva_reserva` | `complejo_aprobado` | `complejo_rechazado` | `complejo_por_revisar`
- `titulo`, `mensaje`, `enlace`
- `leida` (boolean)
- `createdAt`

Solo reactivas: se crean dentro de la misma operación que las origina. El contador de no leídas se
obtiene con un `count()` sobre `userId` + `leida == false`, no leyendo todos los documentos.

## Máquina de estados de la reserva

```
pendiente_pago ──pago simulado OK──> pagada ──pasa la hora──> jugada
      │                                 │
      │                                 └──cancela──> cancelada
      └──pago rechazado / expira──> expirada
```

- `pendiente_pago` mantiene el bloque tomado con `expiraAt` (10 minutos).
- `pagada` cubre tanto pago total como seña. El saldo pendiente se distingue por
  `saldoPendiente > 0`.
- `jugada` no requiere job programado: se deriva comparando `fin` contra la hora actual al leer.
  **No crees un cron para esto.**
- `cancelada` guarda quién canceló y si perdió la seña.

## Cálculo de disponibilidad

Para una cancha y una fecha:

1. Lee `horarioAtencion[diaSemana]`. Si es `null`, no hay bloques.
2. Genera los bloques entre `abre` y `cierra` según `duracionBloqueMin`.
3. Descarta los que empiecen antes de `ahora + 3 horas`.
4. Consulta reservas de esa cancha en ese rango con estado `pagada` o `pendiente_pago` no expirada.
5. Consulta bloqueos de esa cancha en ese rango.
6. Marca como ocupados los bloques que colisionen.

Se calcula en el servidor (Route Handler) y se sirve sin caché. Nunca lo pre-generes.

## Concurrencia

Dos jugadores pueden pedir el mismo bloque al mismo tiempo. La creación de la reserva **debe ir
dentro de una transacción de Firestore** que relea las reservas del bloque antes de escribir. Sin
eso vendes el mismo horario dos veces.

Las Vercel Functions no guardan estado entre invocaciones: el bloqueo temporal durante el checkout
vive en el documento de la reserva con `estado: 'pendiente_pago'` y `expiraAt`, no en memoria.

## Security rules

Las rules son el backend real. Cualquier validación que viva solo en el cliente se salta desde la
consola del navegador.

Reglas mínimas:

- `users`: cada quien lee y escribe su propio documento. `isAdmin` no es escribible desde el cliente.
- `complejos`: lectura pública solo si `estado == 'aprobado'`; el dueño lee y edita los suyos; el
  admin lee todos. El campo `estado` **solo lo cambia el admin**.
- `canchas`: lectura pública si el complejo padre está aprobado; escritura solo del dueño.
- `reservas`: lee el jugador dueño de la reserva, el dueño del complejo y el admin. La creación y
  los cambios de estado pasan **siempre por Route Handler con Admin SDK**, nunca escritura directa
  desde el cliente.
- `bloqueos`: escritura solo del dueño del complejo.
- `resenas`: lectura pública. Creación solo si no existe ya un documento con ese ID (`reservaId`) y
  la reserva correspondiente es del usuario y está `jugada`:
  ```
  allow create: if !exists(/databases/$(database)/documents/resenas/$(reservaId))
    && get(/databases/$(database)/documents/reservas/$(reservaId)).data.jugadorId == request.auth.uid
    && get(/databases/$(database)/documents/reservas/$(reservaId)).data.estado == 'jugada';
  ```
  Sin edición ni borrado posterior desde el cliente.
- `notificaciones`: cada usuario lee solo las suyas; solo puede marcar `leida`.

La credencial del Admin SDK va en variables de entorno del servidor. Nunca en el cliente.
