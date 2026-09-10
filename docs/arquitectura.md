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

Endpoints previstos:

- `GET /api/disponibilidad` — bloques libres de una cancha en una fecha
- `POST /api/reservas` — crea reserva en estado `pendiente_pago` dentro de transacción
- `POST /api/pagos/iniciar` — abre la transacción de Webpay (integración)
- `POST /api/pagos/retorno` — recibe el resultado y confirma o expira la reserva
- `POST /api/reservas/{id}/cancelar` — valida ventana y quién cancela
- `POST /api/complejos/{id}/revisar` — aprobar o rechazar, solo admin

El retorno de Webpay debe ser **idempotente**: puede llegar repetido o fuera de orden. Guarda el
identificador de la transacción y descarta duplicados.

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

`lib/reglas.ts` centraliza las constantes de negocio. No las repartas por el código: si mañana la
anticipación mínima cambia, debe cambiarse en un solo lugar.

Nunca importes `lib/firebase/admin.ts` desde un componente cliente. Filtra la credencial.

## Zona horaria

Todo el producto opera en America/Santiago. Chile tiene cambio de horario, así que no calcules
offsets a mano. Guarda timestamps en UTC en Firestore y convierte al mostrar.
