import { TZDate } from "@date-fns/tz";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  PORCENTAJE_COMISION,
  PORCENTAJE_SENA,
  VENTANA_CANCELACION_MS,
} from "../lib/reglas.ts";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";

const proyecto = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ?? process.env.GCLOUD_PROJECT
  ?? process.env.GOOGLE_CLOUD_PROJECT
  ?? "demo-cancha-fans";
const hostFirestore = process.env.FIRESTORE_EMULATOR_HOST;
const hostAuth = process.env.FIREBASE_AUTH_EMULATOR_HOST;

const clave = "prueba123";
const cuentas = [
  { uid: "jugador1", email: "jugador@prueba.cl", displayName: "Jugador Prueba", isAdmin: false },
  { uid: "jugador2", email: "jugador2@prueba.cl", displayName: "Segunda Jugadora", isAdmin: false },
  { uid: "dueno1", email: "dueno@prueba.cl", displayName: "Dueña Prueba", isAdmin: false },
  { uid: "admin1", email: "admin@prueba.cl", displayName: "Admin Prueba", isAdmin: true },
];
const [jugador, jugadora, duena, admin] = cuentas;

const zonaHoraria = "America/Santiago";
const minutoMs = 60_000;
const horario = { abre: "08:00", cierra: "23:00" };
const horarioAtencion = Object.fromEntries(
  ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"].map(
    (dia) => [dia, horario],
  ),
);

async function vaciarEmulador(url, servicio) {
  const respuesta = await fetch(url, {
    method: "DELETE",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!respuesta.ok) {
    throw new Error(`No se pudo vaciar el emulador de ${servicio} (HTTP ${respuesta.status}).`);
  }
}

async function sembrar() {
  if (!/^demo-[a-z0-9-]+$/.test(proyecto)) {
    throw new Error("La semilla solo se puede ejecutar en un proyecto con prefijo demo-.");
  }
  const hostLocal = /^(?:127\.0\.0\.1|localhost|\[::1\]):[0-9]{1,5}$/;
  if (!hostLocal.test(hostFirestore) || !hostLocal.test(hostAuth)) {
    throw new Error("La semilla requiere direcciones locales con puerto para Firestore y Auth.");
  }

  await vaciarEmulador(
    `http://${hostFirestore}/emulator/v1/projects/${proyecto}/databases/(default)/documents`,
    "Firestore",
  );
  await vaciarEmulador(`http://${hostAuth}/emulator/v1/projects/${proyecto}/accounts`, "Auth");

  const app = initializeApp({ projectId: proyecto });
  try {
    const db = getFirestore(app);
    const auth = getAuth(app);
    const lote = db.batch();
    const guardar = (ruta, datos) => lote.set(db.doc(ruta), datos);
    const ahora = Date.now();
    const hoy = new TZDate(ahora, zonaHoraria);
    const fecha = (dias, hora) => new TZDate(
      hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias, hora, 0, 0, 0, zonaHoraria,
    ).getTime();
    const marcasTiempo = {
      createdAt: Timestamp.fromMillis(ahora),
      updatedAt: Timestamp.fromMillis(ahora),
    };

    for (const { uid, email, displayName, isAdmin } of cuentas) {
      await auth.createUser({ uid, email, password: clave, displayName });
      guardar(`users/${uid}`, {
        email, displayName, phone: "", photoURL: "", isAdmin, createdAt: marcasTiempo.createdAt,
      });
    }

    const baseComplejo = {
      ownerId: duena.uid,
      region: "Metropolitana",
      comuna: "Ñuñoa",
      fotos: [],
      ratingPromedio: 0,
      totalResenas: 0,
      ...marcasTiempo,
    };
    const complejo = {
      ...baseComplejo,
      nombre: "[PRUEBA] Complejo Los Leones",
      descripcion: "Complejo de prueba con dos canchas activas y una inactiva.",
      direccion: "Av. Irarrázaval 1234",
      estado: "aprobado",
      formatosDisponibles: ["F5", "F7"],
      notaAdmin: "",
      revisadoPor: admin.uid,
      revisadoAt: marcasTiempo.createdAt,
    };
    guardar("complejos/leones", complejo);
    guardar("complejos/revision", {
      ...baseComplejo,
      nombre: "[PRUEBA] Complejo en revisión",
      descripcion: "Postulación de prueba para la revisión del administrador.",
      direccion: "Calle Falsa 123",
      estado: "en_revision",
      formatosDisponibles: ["F5"],
    });
    for (const id of ["leones", "revision"]) {
      guardar(`complejos/${id}/privado/datos`, {
        ownerId: duena.uid,
        rut: "12345678-5",
        razonSocial: "Prueba SpA",
        datosBancarios: "Banco Prueba 123",
      });
    }

    const cancha = (nombre, formato, precioPorBloque, activa) => ({
      nombre,
      formato,
      superficie: "sintetico",
      techada: formato === "F5",
      precioPorBloque,
      duracionBloqueMin: 60,
      horarioAtencion,
      activa,
      ...marcasTiempo,
    });
    const canchaPrincipal = cancha("F5 #1", "F5", 25_000, true);
    guardar("complejos/leones/canchas/f5uno", canchaPrincipal);
    guardar("complejos/leones/canchas/f7uno", cancha("F7 #1", "F7", 40_000, true));
    guardar("complejos/leones/canchas/f5dos", cancha("F5 #2", "F5", 25_000, false));
    guardar("complejos/revision/canchas/revision-f5uno", cancha("F5 #1", "F5", 20_000, true));

    function reserva(codigo, cuenta, inicio, creacion, tipoPago = "total") {
      const precioTotal = canchaPrincipal.precioPorBloque;
      const montoPagado = tipoPago === "sena"
        ? Math.round((precioTotal * PORCENTAJE_SENA) / 100)
        : precioTotal;
      return {
        codigo,
        jugadorId: cuenta.uid,
        jugadorNombre: cuenta.displayName,
        jugadorEmail: cuenta.email,
        jugadorRut: cuenta === jugador ? "12345678-5" : "11111111-1",
        jugadorTelefono: cuenta === jugador ? "+56900000001" : "+56900000002",
        complejoId: "leones",
        complejoNombre: complejo.nombre,
        complejoComuna: complejo.comuna,
        ownerId: complejo.ownerId,
        canchaId: "f5uno",
        canchaNombre: canchaPrincipal.nombre,
        canchaFormato: canchaPrincipal.formato,
        inicio: Timestamp.fromMillis(inicio),
        fin: Timestamp.fromMillis(inicio + canchaPrincipal.duracionBloqueMin * minutoMs),
        precioTotal,
        tipoPago,
        montoPagado,
        saldoPendiente: precioTotal - montoPagado,
        comision: Math.round((precioTotal * PORCENTAJE_COMISION) / 100),
        estado: "pagada",
        expiraAt: null,
        cancelableHasta: Timestamp.fromMillis(creacion + VENTANA_CANCELACION_MS),
        canceladaPor: null,
        motivoCancelacion: null,
        penalizacion: null,
        tieneResena: false,
        webpayToken: null,
        webpayOrdenCompra: null,
        createdAt: Timestamp.fromMillis(creacion),
        updatedAt: Timestamp.fromMillis(creacion),
      };
    }

    guardar("reservas/jugada", reserva("P-10001", jugador, fecha(-1, 20), fecha(-4, 10)));
    guardar("reservas/fueraventana", reserva("P-10002", jugador, fecha(2, 21), ahora - 120 * minutoMs, "sena"));
    guardar("reservas/dentroventana", reserva("P-10003", jugador, fecha(3, 21), ahora - 5 * minutoMs));
    guardar("reservas/paradueno", reserva("P-10004", jugadora, fecha(4, 20), ahora - 30 * minutoMs));
    guardar("bloqueos/mantencion", {
      complejoId: "leones",
      canchaId: "f5uno",
      ownerId: duena.uid,
      inicio: Timestamp.fromMillis(fecha(1, 18)),
      fin: Timestamp.fromMillis(fecha(1, 20)),
      motivo: "Mantención",
      createdAt: marcasTiempo.createdAt,
    });
    await lote.commit();
  } finally {
    await deleteApp(app);
  }

  console.log(`Emuladores sembrados en ${proyecto}. Clave de las cuatro cuentas: ${clave}`);
  for (const { displayName, email } of cuentas) console.log(`${displayName}: ${email}`);
}

try {
  await sembrar();
} catch (error) {
  console.error("No se pudo sembrar. Revisa que ambos emuladores estén levantados.", error);
  process.exitCode = 1;
}
