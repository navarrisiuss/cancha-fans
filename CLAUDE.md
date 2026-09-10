@AGENTS.md

# Cancha Fans

Plataforma web para reservar canchas de fútbol en Chile. Los arrendatarios publican sus
complejos, un admin los aprueba y los jugadores reservan bloques horarios pagando en línea.

## Documentación complementaria

Lee estos archivos antes de trabajar en el área correspondiente. No los leas todos por defecto.

| Archivo | Cuándo leerlo |
|---|---|
| `docs/modelo-datos.md` | Cualquier cosa que toque Firestore: colecciones, campos, consultas, security rules |
| `docs/arquitectura.md` | Decidir si algo es servidor o cliente, estrategia de renderizado, estructura de carpetas |

## Cómo debes trabajar en este proyecto

**Sugiere, no decides.** Antes de instalar una dependencia, cambiar la estructura de carpetas,
modificar el esquema de datos o tocar las security rules, propón el cambio y espera confirmación.
Puedes y debes recomendar librerías que ayuden, pero no las agregues al `package.json` por tu cuenta.

**No inventes alcance.** Si algo no está en la sección "Qué se construye", no lo construyas
aunque aparezca en los wireframes. Si crees que falta algo, dilo antes de escribir código.

**No escribas tests.** El equipo los escribe. No crees archivos de test ni configures frameworks
de testing salvo petición explícita.

**Explica las decisiones de Next.js.** El desarrollador maneja React bien (hooks, estado,
memorización) pero es nuevo en Next.js y App Router. Cada vez que decidas que un componente va en
servidor o en cliente, explica por qué en una o dos frases. No asumas que la frontera
servidor/cliente es obvia.

**Cuida el costo.** Firestore cobra por documento leído. Si una funcionalidad requiere un servicio
externo de pago o dispara cientos de lecturas para pintar una pantalla, propón una alternativa
más barata antes de implementarla.

**UI.** Usa una librería de componentes para lo complejo (modales, calendarios, selects,
combobox). Escribe con Tailwind directo lo simple (tarjetas, badges, botones, layouts).

## Stack

- **Framework:** Next.js (App Router) sobre Vercel
- **Backend:** Next.js Route Handlers desplegados como Vercel Functions
- **Datos:** Firestore
- **Auth:** Firebase Auth
- **Archivos:** Firebase Storage (fotos de complejos y documentos del arrendatario)
- **Correo:** Resend
- **Pagos:** Transbank Webpay en ambiente de integración. **Simulado, no mueve dinero real.**
- **Contenido estático:** Markdown en el repo (ayuda, términos, reglas de cancelación)

No mezcles Vercel Functions con Firebase Cloud Functions. Todo lo HTTP va en Route Handlers.

## Roles

Una cuenta es una persona, no un rol. Cualquiera se registra como jugador y puede activar el modo
arrendatario publicando un complejo. El rol es **contextual**: eres arrendatario respecto de tus
propios complejos y jugador en cualquier otro.

La pregunta de autorización nunca es "¿este usuario es arrendatario?" sino
**"¿este usuario es dueño de este complejo?"**.

- **Jugador:** busca, reserva, cancela, deja reseñas.
- **Arrendatario:** crea complejos, define canchas, horarios y precios, bloquea bloques, cancela reservas de sus canchas.
- **Admin:** aprueba o rechaza complejos. Cuentas creadas manualmente, sin flujo de registro.

## Jerarquía de datos

```
usuario → complejo(s) → cancha(s) → reserva(s)
```

Un arrendatario puede tener varios complejos. Un complejo agrupa N canchas de distinto formato
(F5, F7, F11), numeradas dentro del complejo: "Los Leones · F5 #2".

El horario de atención y el precio se definen **por cancha**, no por complejo.

## Regla crítica: los bloques no existen como dato

El arrendatario define un horario de atención por cancha (días, apertura, cierre, duración del
bloque). Los bloques se **derivan en tiempo real** cruzando ese horario contra las reservas
activas y los bloqueos manuales.

**Nunca crees una colección de bloques.** Un complejo de 3 canchas abiertas 12 h al día generaría
más de mil documentos al mes. En Firestore solo se guardan las excepciones: reservas y bloqueos.

## Reglas de negocio

Estas son duras. No las cambies ni las parametrices sin pedir confirmación.

- **Anticipación mínima: 3 horas.** Un bloque que empieza en menos de 3 h no se muestra como
  disponible. Valor global de plataforma, no configurable por complejo.
- **Ventana de cancelación: 1 hora desde el momento de la reserva**, no desde la hora del partido.
  Reserva hecha a las 14:54 se puede cancelar sin costo hasta las 15:54.
- **Fuera de la ventana** el jugador puede cancelar igual, pero pierde el 30%.
- **Si cancela el arrendatario**, el jugador conserva todo su dinero sin importar el momento, y
  debe indicar un motivo que llega al jugador.
- **Pago:** el jugador elige entre pagar el total o una seña del 30%. El saldo se paga
  presencialmente en el complejo. El sistema no cobra saldos.
- **Reembolsos:** se informan al usuario como aviso pero **no se ejecutan** en el sistema.
- **Precio único por cancha.** No hay tarifa peak ni valle.
- **Comisión de plataforma: 6%** sobre el monto de las reservas pagadas.
- Un complejo solo aparece en búsquedas si el admin lo aprobó.

La anticipación de 3 h garantiza que la ventana de arrepentimiento de 1 h siempre expire antes de
que empiece el partido. No rompas esa relación.

## Qué se construye

**Jugador:** registro y login, búsqueda por comuna + fecha + hora + formato, ficha de complejo con
grilla de bloques, checkout con Webpay de integración, comprobante, "Mis reservas" con estados,
cancelación, reseñas sobre reservas jugadas.

**Arrendatario:** postulación de complejo con datos y fotos, gestión de canchas (formato, horario
de atención, precio), bloqueo manual de bloques, listado de reservas recibidas, cancelación con
motivo.

**Admin:** cola de complejos por aprobar, aprobar/rechazar con nota interna, listado de complejos
y usuarios, métricas de reservas, GMV y comisión.

**Transversal:** notificaciones reactivas por dos canales (campanita in-app con historial y correo
vía Resend), páginas estáticas de contenido, 404.

## Qué NO se construye

No implementes nada de esto aunque aparezca dibujado en los wireframes:

- Pagos reales, boleta electrónica SII, reembolsos efectivos, disputas de pago
- Cobro automático del saldo
- Reprogramación de reservas
- Torneos
- Geolocalización, distancias en km, mapa, búsqueda por proximidad
- Tarifa peak/valle o precio variable por horario
- Notificaciones programadas (recordatorios, invitación a reseñar por correo)
- Invitar por WhatsApp / pago dividido entre jugadores
- Tests automatizados

**El sistema no tiene tareas programadas ni cron jobs.** Si una funcionalidad los necesita, está
fuera de alcance.

## Búsqueda

Filtro por comuna desde una lista cerrada, más fecha, hora y formato. Sin geolocalización.

La búsqueda **no** filtra por disponibilidad real: devuelve los complejos aprobados de esa comuna
que tengan canchas del formato pedido. La disponibilidad se calcula al entrar a la ficha de cada
complejo. Calcular grillas de veinte complejos en una sola llamada es demasiado caro.

## Identidad visual

Paleta (verificar contra el archivo de identidad antes de fijarla en la config de Tailwind):

- Verde `#0F7A4D` — marca y acciones primarias
- Carbón `#12241C` — texto y fondos oscuros
- Lima `#D9F24A` — **solo** estados "reservado" y "pagado", y bloques horarios disponibles
- Hueso `#F0EEE9` — fondo de página

Tipografía Archivo: 800 en el logotipo, 600 en botones y títulos, 500 en texto corrido.

**Regla de color en errores:** el rojo se reserva para situaciones donde el usuario debe actuar
(pago rechazado). Cuando el problema es del sistema (sin conexión, error de carga), se usa carbón.

## Idioma

Todo el producto está en español de Chile. Textos de interfaz, correos y mensajes de error en
español. Nombres de variables, funciones y comentarios en español.
