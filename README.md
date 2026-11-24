# Cancha Fans

![Jamstack](https://img.shields.io/badge/stack-Jamstack-F0047F)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20·%20Auth%20·%20Storage-FFCA28?logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-deploy-000000?logo=vercel)

Reservar una cancha de fútbol en Chile casi siempre termina en lo mismo: llamar o escribir por
WhatsApp, preguntar qué horas quedan, esperar respuesta y transferir a mano. Cancha Fans busca solucionar esto en solo una página web. El jugador busca por comuna, ve qué bloques están libres y paga en el momento.

## Cómo funciona

En la plataforma hay tres tipos de participación, pero una sola cuenta. Cualquiera se registra como
jugador y, si tiene un complejo, puede publicarlo desde esa misma cuenta.

**Jugadores.** Buscan por comuna, fecha, hora y formato (F5, F7 o F11). En la ficha de cada complejo
ven la grilla de horarios disponibles, reservan y pagan con Webpay. Pueden pagar el total o dejar
una seña del 30% y pagar el resto en la cancha. Después del partido pueden dejar una reseña con su
equipo, el rival y el resultado.

**Arrendatarios.** Postulan su complejo con datos y fotos, y definen cada cancha por separado:
formato, horario de atención y precio. Pueden bloquear horas a mano, ver las reservas que les llegan
y cancelarlas indicando un motivo.

**Admin.** Revisa los complejos postulados y los aprueba o rechaza. Un complejo solo aparece en las
búsquedas cuando ya está aprobado. También ve métricas de reservas, volumen transado y la comisión
de la plataforma.

## Reglas de las reservas

- Solo se puede reservar con al menos **3 horas de anticipación**.
- El jugador tiene **1 hora desde que reserva** para cancelar sin costo. Si reserva a las 14:54,
  puede cancelar gratis hasta las 15:54.
- Si cancela después, puede hacerlo igual, pero pierde el 30%.
- Si cancela el complejo, el jugador no pierde nada.
- Cada cancha tiene un precio único, sin tarifas distintas por horario.

Las 3 horas de anticipación existen para que la hora de arrepentimiento siempre termine antes de
que empiece el partido.

Los reembolsos se le informan al usuario, pero no se ejecutan en el sistema, y el saldo de una seña
se paga en persona.

## Por dentro

El proyecto sigue la arquitectura **Jamstack**: el frontend se sirve desde Vercel y todo lo demás
se resuelve con APIs y servicios externos, sin un servidor propio que mantener. Está hecho con
Next.js 16 (App Router) y React 19; la lógica de servidor vive en Route Handlers que corren como
Vercel Functions. Firebase se encarga de los datos, el login y las fotos; Tailwind CSS 4 de los
estilos; Resend de los correos y Webpay de los pagos.

Una decisión que vale la pena mencionar: los bloques horarios **no se guardan** en la base de
datos. Se calculan al momento cruzando el horario de cada cancha con las reservas y bloqueos que
existen. Un complejo con 3 canchas abiertas 12 horas al día generaría más de mil documentos al mes
si se guardaran, y Firestore cobra por cada lectura.

El detalle técnico está en [docs/modelo-datos.md](docs/modelo-datos.md) y
[docs/arquitectura.md](docs/arquitectura.md).

## Ejecución en local

Se necesita Node.js 20 o superior y un proyecto de Firebase con Auth (correo y contraseña),
Firestore y Storage activados.

```bash
npm install
cp .env.example .env.local   # completar los valores
npm run dev
```

La app queda en [http://localhost:3000](http://localhost:3000).

Las variables están explicadas en [.env.example](.env.example):

| Variable | Dónde se obtiene |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Consola de Firebase → Configuración del proyecto → Tus apps |
| `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Consola de Firebase → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada |

Las `FIREBASE_ADMIN_*` son solo de servidor. La clave privada va en una línea, entre comillas y con
los `\n` como vienen en el JSON. Ni `.env.local` ni ese JSON se suben al repo.

Algunas cosas que se hacen a mano:

- **Security rules:** [firestore.rules](firestore.rules) y [storage.rules](storage.rules) son
  copias de referencia. Si se modifica alguno, hay que publicarlo también en la consola de Firebase.
- **Cuentas de admin:** no tienen registro propio. Se crea una cuenta normal y luego se cambia
  `isAdmin` a `true` en su documento `users/{uid}` desde la consola de Firestore.

Otros comandos: `npm run build`, `npm run start` y `npm run lint`.

## Probar con emuladores

1. Instala las dependencias con `npm ci`. Usa Node.js 22.18+ o 24 LTS y Java 21 o superior.
   La versión de Firebase CLI del proyecto requiere Java 21 para iniciar los emuladores.
2. Ejecuta `npm run emuladores`. La interfaz queda en [http://localhost:4000](http://localhost:4000).
3. En otra terminal, ejecuta `npm run emuladores:sembrar`. Cada ejecución borra los datos
   locales de Firestore y las cuentas de Auth del proyecto demo antes de cargar los ejemplos.
4. Crea `.env.development.local` con estos valores. El bloque «Emuladores (opcional)» de
   [.env.example](.env.example) también incluye las variables que activan el modo local.

   ```dotenv
   NEXT_PUBLIC_USAR_EMULADORES=true
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cancha-fans
   NEXT_PUBLIC_FIREBASE_API_KEY=demo
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-cancha-fans.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-cancha-fans.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
   NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   RESEND_API_KEY=
   ```

5. Ejecuta `npm run dev` y abre [http://localhost:3000](http://localhost:3000).
6. Inicia sesión con una cuenta de prueba. Todas usan la clave `prueba123`.

   | Cuenta | Correo |
   |---|---|
   | Jugador | `jugador@prueba.cl` |
   | Segunda jugadora | `jugador2@prueba.cl` |
   | Dueña | `dueno@prueba.cl` |
   | Admin | `admin@prueba.cl` |

Auth, Firestore y Storage usan el proyecto local `demo-cancha-fans`, aislado del Firebase real.
Deja `RESEND_API_KEY` vacía para que las pruebas solo generen notificaciones dentro de la app.
La reserva de prueba dentro de la ventana permite cancelar sin costo durante 55 minutos después
de sembrar. Puedes volver a ejecutar la semilla para recuperar ese escenario.

## Flujo de trabajo

- La rama principal es `develop`. Cada cambio va en su propia rama (`feat/...`, `docs/...`) y entra
  por pull request.
- Los issues se abren con las plantillas de [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE).
- El commit o PR que cierra un issue termina con `, closes #N`.
- Todo está en español de Chile: interfaz, variables, funciones y comentarios.
