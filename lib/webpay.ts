import "server-only";

import { Environment, IntegrationApiKeys, IntegrationCommerceCodes, Options, WebpayPlus } from "transbank-sdk";
import { PORCENTAJE_SENA } from "./reglas";
import type { Reserva } from "./tipos/reserva";

export const URL_FORMULARIO_WEBPAY = `${Environment.Integration}/webpayserver/initTransaction`;

export const webpay = new WebpayPlus.Transaction(new Options(
  IntegrationCommerceCodes.WEBPAY_PLUS,
  IntegrationApiKeys.WEBPAY,
  Environment.Integration,
  5_000,
));

export function montoACobrar({ precioTotal, tipoPago }: Pick<Reserva, "precioTotal" | "tipoPago">) {
  return tipoPago === "total" ? precioTotal : Math.round((precioTotal * PORCENTAJE_SENA) / 100);
}

type ResultadoWebpay = {
  status: string;
  response_code: number;
  amount: number;
  buy_order: string;
  session_id: string;
};

export async function confirmarPago(token: string, venceEn: number): Promise<ResultadoWebpay | null> {
  // Si Webpay alcanzó a confirmar y falló la escritura en Firestore, se recupera ese resultado.
  const previo: ResultadoWebpay = await webpay.status(token);
  if (previo.status !== "INITIALIZED") return previo;
  if (Date.now() >= venceEn) return null;

  try {
    return await webpay.commit(token);
  } catch (error) {
    const posterior: ResultadoWebpay = await webpay.status(token);
    if (posterior.status !== "INITIALIZED") return posterior;
    throw error;
  }
}
