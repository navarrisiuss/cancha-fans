import "server-only";

import { randomInt } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { calcularBloques, consultasDelDia, esIdDeDocumento } from "../../../lib/disponibilidad";
import { authAdmin, dbAdmin } from "../../../lib/firebase/admin";
import { exigirUsuario, respuestaError } from "../../../lib/firebase/exigir-usuario";
import { VENTANA_CANCELACION_MS } from "../../../lib/reglas";
import type { Bloqueo } from "../../../lib/tipos/bloqueo";
import type { Cancha } from "../../../lib/tipos/cancha";
import type { Reserva } from "../../../lib/tipos/reserva";
import { esFechaValida, hoyEnSantiago } from "../../../lib/zona-horaria";

const VIGENCIA_RESERVA_MS = 10 * 60_000;
const INICIO_ISO = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function leerInicio(valor: unknown): Date | null {
  if (typeof valor !== "string") return null;
  const fecha = INICIO_ISO.exec(valor)?.[1];
  if (!fecha || !esFechaValida(fecha)) return null;

  const inicio = new Date(valor);
  return Number.isFinite(inicio.getTime()) ? inicio : null;
}

export async function POST(request: Request) {
  const usuario = await exigirUsuario(request);
  if (usuario instanceof Response) return usuario;

  const datos = await request.json().catch(() => null) as Record<string, unknown> | null;
  const { complejoId, canchaId, tipoPago } = datos ?? {};
  const inicio = leerInicio(datos?.inicio);

  if (!esIdDeDocumento(complejoId) || !esIdDeDocumento(canchaId) || !inicio ||
      (tipoPago !== "total" && tipoPago !== "sena")) {
    return respuestaError(400, "Indica un complejo, una cancha, un horario y un tipo de pago válidos.");
  }

  const db = dbAdmin();
  const complejo = db.collection("complejos").doc(complejoId);
  const cancha = complejo.collection("canchas").doc(canchaId);
  const perfil = db.collection("users").doc(usuario.uid);
  const reservas = db.collection("reservas");
  const referencia = reservas.doc();
  const fecha = hoyEnSantiago(inicio);

  try {
    return await db.runTransaction(async (tx) => {
      const [datosComplejo, datosCancha, datosPerfil] = await tx.getAll(complejo, cancha, perfil);
      const canchaElegida = datosCancha.data() as Cancha | undefined;
      if (datosComplejo.get("estado") !== "aprobado" || canchaElegida?.activa !== true) {
        return respuestaError(404, "La cancha ya no está disponible.");
      }

      const consultas = consultasDelDia(db, canchaId, fecha);
      const reservasDelDia = await tx.get(consultas.reservas);
      const bloqueos = await tx.get(consultas.bloqueos);

      // Una coincidencia como máximo por intento. El código legible es independiente del ID.
      let codigo: string;
      let codigoOcupado: boolean;
      do {
        codigo = `${String.fromCharCode(65 + randomInt(26))}-${randomInt(10_000, 100_000)}`;
        codigoOcupado = !(await tx.get(reservas.where("codigo", "==", codigo).limit(1))).empty;
      } while (codigoOcupado);

      // El guard devuelve el UID. Si falta el perfil, se recuperan el nombre y correo del token.
      const token = datosPerfil.exists ? null
        : await authAdmin().verifyIdToken(request.headers.get("authorization")!.slice("Bearer ".length).trim());
      const correo = datosPerfil.get("email") || token?.email || "";
      const nombre = datosPerfil.get("displayName") || token?.name || correo || "Jugador";
      const ahora = new Date();
      const bloque = calcularBloques(
        canchaElegida, fecha,
        reservasDelDia.docs.map((doc) => doc.data() as Reserva).filter((reserva) => reserva.complejoId === complejoId),
        bloqueos.docs.map((doc) => doc.data() as Bloqueo).filter((bloqueo) => bloqueo.complejoId === complejoId),
        ahora,
      ).find((bloque) => bloque.inicio.getTime() === inicio.getTime());

      if (bloque?.estado !== "libre") {
        return respuestaError(409, "Ese bloque ya no está disponible. Elige otro horario.");
      }

      const precioTotal = canchaElegida.precioPorBloque;
      const creadaAt = Timestamp.fromDate(ahora);
      const duracionMin = Math.round((bloque.fin.getTime() - bloque.inicio.getTime()) / 60_000);
      const reserva: Reserva = {
        codigo,
        jugadorId: usuario.uid,
        jugadorNombre: nombre,
        jugadorEmail: correo,
        complejoId,
        complejoNombre: datosComplejo.get("nombre"),
        complejoComuna: datosComplejo.get("comuna"),
        ownerId: datosComplejo.get("ownerId"),
        canchaId,
        canchaNombre: canchaElegida.nombre,
        canchaFormato: canchaElegida.formato,
        inicio: Timestamp.fromDate(bloque.inicio),
        fin: Timestamp.fromDate(bloque.fin),
        duracionMin,
        precioTotal,
        montoPagado: 0,
        saldoPendiente: precioTotal,
        tipoPago,
        comision: 0,
        estado: "pendiente_pago",
        expiraAt: Timestamp.fromMillis(ahora.getTime() + VIGENCIA_RESERVA_MS),
        cancelableHasta: Timestamp.fromMillis(ahora.getTime() + VENTANA_CANCELACION_MS),
        canceladaPor: null,
        motivoCancelacion: null,
        penalizacion: null,
        tieneResena: false,
        webpayToken: null,
        webpayOrdenCompra: null,
        createdAt: creadaAt,
        updatedAt: creadaAt,
      };

      tx.create(referencia, reserva);
      return Response.json({ reservaId: referencia.id }, {
        status: 201, headers: { "Cache-Control": "no-store" },
      });
    });
  } catch (error) {
    console.error("No se pudo crear la reserva.", error);
    return Response.json({ error: "No pudimos crear la reserva. Intenta nuevamente." }, { status: 500 });
  }
}
