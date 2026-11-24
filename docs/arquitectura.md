# Arquitectura

## Cómo encaja Cancha Fans en Jamstack

El stack asignado es Jamstack: frontend con generación estática, backend con APIs serverless y
datos en un BaaS. Cancha Fans lo cumple así:

| Capa del stack | Implementación |
|---|---|
| FrontEnd SSG | Next.js App Router sobre Vercel |
| BackEnd Serverless | Route Handlers desplegados como Vercel Functions |
| BaaS | Firebase (Firestore, Auth, Storage) |
| Capa de contenido | Markdown en el repo, compilado en el build |

Jamstack nunca significó "todo estático". Significa que el HTML se sirve desde CDN y lo dinámico
llega por API. Cancha Fans se parte en capas según qué tan volátil es cada dato.

## Estrategia de renderizado por página

**Regla general: todo lo que tenga precio o disponibilidad se pide fresco. Lo demás se pre-genera.**

| Página | Estrategia | Por qué |
|---|---|---|
| Landing | SSG | No cambia entre visitas |
| Ayuda, términos, reglas de cancelación | SSG desde Markdown | Contenido fijo del repo |
| 404 | SSG | Estático |
| Listado por comuna | ISR | Cambia cuando se aprueba un complejo, no cada minuto |
| Ficha de complejo (datos, fotos, reseñas) | ISR | Igual |
| Grilla de bloques dentro de la ficha | Cliente, sin caché | Cambia cada minuto |
| Checkout | Dinámico | Depende del usuario y del bloque |
| Mis reservas | Dinámico | Autenticado, sin valor SEO |
| Panel del arrendatario | Dinámico | Autenticado |
| Panel admin | Dinámico | Autenticado |

La capa SSG/ISR es lo que da SEO: alguien buscando "cancha F5 Ñuñoa" debe llegar a una página ya
generada. La disponibilidad se hidrata encima.

**Nunca pongas caché sobre un endpoint de disponibilidad.** Mostrar un bloque que ya se tomó es el
peor error posible del producto.

## Servidor o cliente

El desarrollador viene de React puro. En App Router los componentes son **de servidor por
defecto**: no tienen `useState`, `useEffect`, `localStorage` ni eventos hasta que el archivo lleva
`'use client'` arriba.

Al escribir un componente, explica en una o dos frases por qué va en servidor o en cliente.

**Van en cliente obligatoriamente:**

- Todo lo que use Firebase Auth o listeners de Firestore
- La grilla de bloques (selección interactiva)
- Formularios con estado
- La campanita de notificaciones

**Van en servidor:**

- Layouts y páginas que solo componen
- Listados generados en build o ISR
- Cualquier lectura que use el Admin SDK

Pon la frontera `'use client'` lo más abajo posible en el árbol. Un componente cliente arrastra a
todos sus hijos.

## Route Handlers

Toda escritura de reservas pasa por el servidor, nunca desde el cliente directo a Firestore.

Endpoints y sus contratos. Cada uno lo implementa una sola rama; quien los consume no cambia la
forma de la petición ni de la respuesta sin avisar a quien los implementa.

| Endpoint | Quién llama | Contrato |
|---|---|---|
| `GET /api/disponibilidad?canchaId&fecha=YYYY-MM-DD` | cualquiera | `{ bloques: [{ inicio, fin, estado: "libre" \| "ocupado" }] }`, con `inicio` y `fin` en ISO. Sin caché. |
| `POST /api/reservas` | jugador con sesión | Body `{ canchaId, inicio, tipoPago }` → `{ reservaId }`. Crea la reserva en `pendiente_pago` dentro de una transacción. |
| `POST /api/pagos/iniciar` | jugador con sesión | Body `{ reservaId }` → `{ url, token }` para redirigir a Webpay (integración). |
| `GET\|POST /api/pagos/retorno` | Webpay | Confirma o expira la reserva y redirige a `/reservas/{id}/comprobante`. |
| `POST /api/reservas/{id}/cancelar` | jugador o dueño | Body `{ motivo? }`. El rol se deduce en el servidor; si cancela el dueño, el motivo es obligatorio. |
| `POST /api/resenas` | jugador con sesión | Crea la reseña de una reserva jugada y actualiza el rating del complejo en la misma transacción. |
| `POST` y `DELETE /api/bloqueos` | dueño del complejo | Crea o quita un bloqueo; rechaza si choca con una reserva activa. |
| `POST /api/complejos/{id}/canchas` y `PATCH …/canchas/{canchaId}` | dueño del complejo | Crean y editan canchas, incluido activar y desactivar; mantienen `formatosDisponibles` en el mismo batch. |
| `POST /api/complejos/{id}/revisar` | admin | Aprobar o rechazar un complejo. |

La autorización de cada endpoint sale de `lib/firebase/`: `exigirUsuario` (sesión iniciada),
`exigirDuenoDeComplejo` (dueño de ese complejo) y `exigirAdmin`. Desde el navegador se llama con
`fetchConSesion`, que manda el ID token en la cabecera `Authorization`.

El retorno de Webpay debe ser **idempotente**: puede llegar repetido, fuera de orden o por GET
(cuando el usuario aborta el pago). Guarda el identificador de la transacción y descarta duplicados.

### Puntos de integración entre ramas

Cuando el código de una rama usa el de otra, el archivo existe desde antes como stub con la firma
final. Quien lo consume ya lo llama; quien lo implementa solo lo rellena:

| Archivo | Lo consume | Lo implementa |
|---|---|---|
| `lib/notificaciones/notificar.ts` | reservas, cancelaciones, revisión de complejos | `feat/notificaciones-y-correo` |
| `components/notificaciones/campanita.tsx` | `components/encabezado.tsx` y la landing | `feat/notificaciones-y-correo` |
| `components/reservas/seccion-reserva.tsx` | la ficha del complejo | `feat/reserva-y-pago` |

Los archivos compartidos (`package.json`, `firestore.rules`, `storage.rules`, `docs/`,
`.env.example`, `lib/reglas.ts`, `lib/tipos/`, `lib/zona-horaria.ts`, `lib/reservas-estado.ts`,
`components/encabezado.tsx`) los modifica una sola persona, vía una PR aparte. Cada rama de
funcionalidad es dueña de sus propias carpetas y no toca las de otra.

## Estructura de carpetas propuesta

```
app/
  (public)/          landing, búsqueda, ficha de complejo, contenido estático
  (auth)/            login, registro
  (jugador)/         mis reservas, checkout, comprobante
  (arrendatario)/    mis complejos, canchas, reservas recibidas
  (admin)/           cola de aprobación, métricas
  api/               route handlers
components/
  ui/                componentes base
  reservas/          grilla de bloques, tarjetas
lib/
  firebase/          client.ts (SDK cliente), admin.ts (Admin SDK, solo servidor)
  disponibilidad.ts  cálculo de bloques
  reglas.ts          constantes de negocio (3 h, 1 h, 30%, 6%)
content/             markdown de páginas estáticas
```

Las rutas reales son planas (`app/arrendatario/...`, `app/admin/...`), no usan route groups; la
estructura de arriba es una referencia de qué va dónde.

`lib/tipos/` guarda los tipos de las colecciones (sin dependencia de ningún SDK, para importarlos
desde servidor y cliente) y `lib/zona-horaria.ts` las fechas en America/Santiago.

`lib/reglas.ts` centraliza las constantes de negocio. No las repartas por el código: si mañana la
anticipación mínima cambia, debe cambiarse en un solo lugar.

Nunca importes `lib/firebase/admin.ts` desde un componente cliente. Filtra la credencial.

## Zona horaria

Todo el producto opera en America/Santiago. Chile tiene cambio de horario, así que no calcules
offsets a mano. Guarda timestamps en UTC en Firestore y convierte al mostrar.
