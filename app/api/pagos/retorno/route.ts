import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { consultasDelDia, seSuperponen } from "../../../../lib/disponibilidad";
import { dbAdmin } from "../../../../lib/firebase/admin";
import { notificar } from "../../../../lib/notificaciones/notificar";
import { PORCENTAJE_COMISION } from "../../../../lib/reglas";
import { ocupaElBloque } from "../../../../lib/reservas-estado";
import type { Bloqueo } from "../../../../lib/tipos/bloqueo";
import type { Reserva } from "../../../../lib/tipos/reserva";
import { confirmarPago, montoACobrar } from "../../../../lib/webpay";
import { formatearFechaHora, hoyEnSantiago } from "../../../../lib/zona-horaria";

function redirigir(request: Request, ruta: string) {
  const destino = new URL(ruta, process.env.NEXT_PUBLIC_APP_URL || request.url);
  return new Response(null, { status: 303, headers: { Location: destino.href, "Cache-Control": "no-store" } });
}

async function recibir(request: Request) {
  let comprobante = "/mis-reservas";
  let retornoNormal = false;
  try {
    const consulta = new URL(request.url).searchParams;
    const formulario = request.method === "POST" ? await request.formData().catch(() => null) : null;

    function parametro(nombre: string) {
      const valor = formulario?.get(nombre) ?? consulta.get(nombre);
      return typeof valor === "string" && valor.length <= 128 && /^\S+$/.test(valor) ? valor : null;
    }

    const tokenNormal = parametro("token_ws");
    const tokenAborto = parametro("TBK_TOKEN");
    const orden = parametro("TBK_ORDEN_COMPRA");
    const sesion = parametro("TBK_ID_SESION");
    const aborto = Boolean(tokenAborto || orden);
    retornoNormal = !aborto;
    const token = tokenAborto ?? tokenNormal;
    if (!token && (!orden || !sesion)) return redirigir(request, comprobante);

    const db = dbAdmin();
    // Una reserva como máximo: el token y la orden identifican una transacción de Webpay.
    const campo = token ? "webpayToken" : "webpayOrdenCompra";
    const coincidencia = await db.collection("reservas").where(campo, "==", token ?? orden).limit(1).get();
    const referencia = coincidencia.docs[0]?.ref;
    if (!referencia) return redirigir(request, comprobante);

    const rutaReserva = `/reservas/${encodeURIComponent(referencia.id)}/comprobante`;
    comprobante = rutaReserva;
    let resultadoWebpay: Awaited<ReturnType<typeof confirmarPago>> | undefined;
    const resultado = await db.runTransaction(async (tx) => {
      const documento = await tx.get(referencia);
      const reserva = documento.data() as Reserva | undefined;
      if (!reserva || (token && reserva.webpayToken !== token) ||
          (orden && reserva.webpayOrdenCompra !== orden) || (sesion && referencia.id !== sesion)) {
        comprobante = "/mis-reservas";
        return null;
      }
      if (reserva.estado !== "pendiente_pago") return null;

      const vencer = () => tx.update(referencia, {
        estado: "expirada",
        expiraAt: null,
        updatedAt: Timestamp.now(),
      });

      const vencimiento = reserva.expiraAt?.toMillis() ?? 0;
      if (aborto || !token || (resultadoWebpay === undefined && Date.now() >= vencimiento)) {
        vencer();
        return null;
      }

      // Se releen las excepciones de la cancha para resolver carreras cerca del vencimiento.
      const consultas = consultasDelDia(db, reserva.canchaId, hoyEnSantiago(reserva.inicio.toDate()));
      const reservas = await tx.get(consultas.reservas);
      const bloqueos = await tx.get(consultas.bloqueos);
      const ahora = new Date();
      const inicio = reserva.inicio.toMillis();
      const fin = reserva.fin.toMillis();
      const ocupado = reservas.docs.some((doc) => {
        const otra = doc.data() as Reserva;
        return doc.id !== referencia.id && otra.complejoId === reserva.complejoId &&
          seSuperponen(otra, inicio, fin) && ocupaElBloque(otra, ahora);
      }) || bloqueos.docs.some((doc) => {
        const bloqueo = doc.data() as Bloqueo;
        return bloqueo.complejoId === reserva.complejoId && seSuperponen(bloqueo, inicio, fin);
      });

      if (ocupado) {
        vencer();
        return null;
      }

      // El callback de Firestore puede repetirse; se conserva el resultado del commit de Webpay.
      if (resultadoWebpay === undefined) resultadoWebpay = await confirmarPago(token, vencimiento);
      if (!resultadoWebpay || resultadoWebpay.status !== "AUTHORIZED" || resultadoWebpay.response_code !== 0) {
        vencer();
        return null;
      }

      const monto = montoACobrar(reserva);
      if (resultadoWebpay.amount !== monto || resultadoWebpay.buy_order !== reserva.webpayOrdenCompra ||
          resultadoWebpay.session_id !== referencia.id) {
        throw new Error("La respuesta de Webpay no coincide con la reserva.");
      }

      tx.update(referencia, {
        estado: "pagada",
        montoPagado: monto,
        saldoPendiente: reserva.precioTotal - monto,
        comision: Math.round((reserva.precioTotal * PORCENTAJE_COMISION) / 100),
        expiraAt: null,
        updatedAt: Timestamp.now(),
      });

      return reserva;
    });

    if (resultado) {
      const detalle = `${resultado.complejoNombre} · ${resultado.canchaNombre}`;
      try {
        const fechaHora = formatearFechaHora(resultado.inicio.toDate());
        await Promise.all([
          notificar({
            userId: resultado.jugadorId,
            tipo: "reserva_confirmada",
            titulo: "Reserva confirmada",
            mensaje: `${detalle}, ${fechaHora}.`,
            enlace: comprobante,
          }),
          notificar({
            userId: resultado.ownerId,
            tipo: "nueva_reserva",
            titulo: "Nueva reserva",
            mensaje: `${resultado.jugadorNombre} reservó ${detalle} para el ${fechaHora}.`,
            enlace: "/arrendatario/reservas",
          }),
        ]);
      } catch (error) {
        console.error("No se pudieron enviar los avisos de la reserva.", error);
      }
    }
  } catch (error) {
    console.error("No se pudo procesar el retorno de Webpay.", error);
    if (retornoNormal && comprobante !== "/mis-reservas") comprobante += "?retorno=pendiente";
  }

  return redirigir(request, comprobante);
}

export const GET = recibir;
export const POST = recibir;
