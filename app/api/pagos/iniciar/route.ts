import "server-only";

import { randomBytes } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { esIdDeDocumento } from "../../../../lib/disponibilidad";
import { dbAdmin } from "../../../../lib/firebase/admin";
import { exigirUsuario, respuestaError } from "../../../../lib/firebase/exigir-usuario";
import { normalizarRut } from "../../../../lib/rut";
import type { Reserva } from "../../../../lib/tipos/reserva";
import { montoACobrar, URL_FORMULARIO_WEBPAY, webpay } from "../../../../lib/webpay";
import { normalizarTelefono } from "../../../checkout/telefono";

type InicioWebpay = { url: string; token: string };

export async function POST(request: Request) {
  const usuario = await exigirUsuario(request);
  if (usuario instanceof Response) return usuario;

  const datos = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!esIdDeDocumento(datos?.reservaId)) return respuestaError(400, "Indica una reserva válida.");

  const nombre = typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  if (nombre.length < 2 || nombre.length > 80) {
    return respuestaError(400, "Ingresa un nombre y apellido de 2 a 80 caracteres.");
  }
  const rut = typeof datos.rut === "string" ? normalizarRut(datos.rut) : null;
  if (!rut) return respuestaError(400, "Ingresa un RUT válido.");

  const telefono = typeof datos.telefono === "string" ? normalizarTelefono(datos.telefono) : null;
  if (!telefono) return respuestaError(400, "Ingresa un número de celular chileno válido.");

  if (datos.aceptaReglas !== true) {
    return respuestaError(400, "Debes aceptar las reglas del recinto y la política de cancelación.");
  }

  const db = dbAdmin();
  const referencia = db.collection("reservas").doc(datos.reservaId);
  const orden = `CF${randomBytes(11).toString("hex")}`; // Webpay admite hasta 26 caracteres.
  let inicio: InicioWebpay | undefined;

  try {
    return await db.runTransaction(async (tx) => {
      // Una lectura de la reserva por intento. La transacción conserva solo el token ganador.
      const documento = await tx.get(referencia);
      const reserva = documento.data() as Reserva | undefined;
      if (!reserva || reserva.jugadorId !== usuario.uid) {
        return respuestaError(404, "No encontramos tu reserva.");
      }

      const vencimiento = reserva.expiraAt?.toMillis() ?? 0;
      if (reserva.estado !== "pendiente_pago" || Date.now() >= vencimiento) {
        return respuestaError(409, "La reserva ya no admite pagos.");
      }

      const cabeceras = { "Cache-Control": "no-store" };
      const monto = montoACobrar(reserva);
      if (!Number.isSafeInteger(monto) || monto <= 0) {
        return respuestaError(409, "El monto de la reserva no es válido para Webpay.");
      }

      // Si Firestore reintenta el callback, se conserva la respuesta obtenida de Webpay.
      if (!inicio) {
        const retorno = new URL("/api/pagos/retorno", process.env.NEXT_PUBLIC_APP_URL);
        retorno.searchParams.set("reserva", referencia.id);
        inicio = await webpay.create(orden, referencia.id, monto, retorno.href) as InicioWebpay;
        if (inicio.url !== URL_FORMULARIO_WEBPAY || !inicio.token) {
          throw new Error("Webpay devolvió un formulario inesperado.");
        }
      }

      if (Date.now() >= vencimiento) return respuestaError(409, "El tiempo para pagar terminó.");

      // El retorno solo confirma el token guardado. Sin confirmación, Transbank no cobra el intento anterior.
      tx.update(referencia, {
        webpayToken: inicio.token,
        webpayOrdenCompra: orden,
        jugadorNombre: nombre,
        jugadorRut: rut,
        jugadorTelefono: telefono,
        updatedAt: Timestamp.now(),
      });

      return Response.json(inicio, { headers: cabeceras });
    });
  } catch (error) {
    console.error("No se pudo iniciar el pago con Webpay.", error);
    return Response.json({ error: "No pudimos iniciar el pago. Intenta nuevamente." }, {
      status: 502, headers: { "Cache-Control": "no-store" },
    });
  }
}
