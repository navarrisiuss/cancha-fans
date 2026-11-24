// Punto de integración para notificaciones reactivas: crea el documento en notificaciones/{id} con
// el Admin SDK y envía un correo en español de Chile mediante Resend leyendo users/{userId}.email.
// Un fallo al notificar o al enviar correo se captura y se registra sin romper la operación origen.
import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";
import { dbAdmin } from "../firebase/admin";
import type { TipoNotificacion } from "../tipos/notificacion";

export type DatosNotificacion = {
  // Destinatario (uid de Firebase Auth).
  userId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  // Ruta interna a la que lleva la notificación, ej. "/mis-reservas".
  enlace: string;
};

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function construirUrlCompleta(enlace: string): string {
  if (enlace.startsWith("http://") || enlace.startsWith("https://")) {
    return enlace;
  }
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const ruta = enlace.startsWith("/") ? enlace : `/${enlace}`;
  return `${base}${ruta}`;
}

export async function notificar(datos: DatosNotificacion): Promise<void> {
  try {
    const db = dbAdmin();

    await db.collection("notificaciones").add({
      userId: datos.userId,
      tipo: datos.tipo,
      titulo: datos.titulo,
      mensaje: datos.mensaje,
      enlace: datos.enlace,
      leida: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    const claveResend = process.env.RESEND_API_KEY;
    if (!claveResend) {
      return;
    }

    const usuarioSnap = await db.collection("users").doc(datos.userId).get();
    const correo = usuarioSnap.get("email");
    if (typeof correo !== "string" || !correo.trim()) {
      return;
    }

    const remitente = process.env.RESEND_FROM || "CanchaFans <onboarding@resend.dev>";
    const urlDestino = construirUrlCompleta(datos.enlace);
    const resend = new Resend(claveResend);

    await resend.emails.send({
      from: remitente,
      to: correo.trim(),
      subject: `${datos.titulo} — CanchaFans`,
      text: `${datos.titulo}\n\n${datos.mensaje}\n\nVer en CanchaFans: ${urlDestino}`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #F0EEE9; padding: 32px 16px; color: #12241C;">
          <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; padding: 32px; border: 1px solid #DAD7CF;">
            <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #0F7A4D;">
              CanchaFans
            </p>
            <h1 style="margin: 0 0 12px; font-size: 22px; line-height: 1.3; color: #12241C;">
              ${escaparHtml(datos.titulo)}
            </h1>
            <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4D5D54;">
              ${escaparHtml(datos.mensaje)}
            </p>
            <a href="${escaparHtml(urlDestino)}" style="display: inline-block; background-color: #0F7A4D; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 20px; border-radius: 12px;">
              Ir a CanchaFans
            </a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    // Una falla en notificaciones o correo no debe abortar la reserva, cancelación o revisión.
    console.error("No se pudo procesar la notificación:", error);
  }
}
