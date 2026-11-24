import "server-only";

import { Environment, IntegrationApiKeys, IntegrationCommerceCodes, Options, WebpayPlus } from "transbank-sdk";
import { PORCENTAJE_SENA } from "./reglas";
import type { Reserva } from "./tipos/reserva";

export const URL_FORMULARIO_WEBPAY = `${Environment.Integration}/webpayserver/initTransaction`;

export const webpay = new WebpayPlus.Transaction(new Options(
  IntegrationCommerceCodes.WEBPAY_PLUS,
  IntegrationApiKeys.WEBPAY,
  Environment.Integration,
  // 15 s por llamada: la primera conexión a Transbank (en frío) llegó a tardar más de 5 s en las
  // pruebas y el pago quedaba sin verificar. Cabe dentro del tiempo máximo de una Vercel Function.
  15_000,
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

// Confirma (commit) el pago. Sin commit, Transbank anula la transacción aunque el banco la haya
// autorizado, así que el commit se intenta siempre y no se decide a partir de status(). En el
// ambiente de integración se comprobó que un segundo commit de la misma transacción devuelve el
// mismo resultado, así que repetirlo es seguro.
//
// Si el commit falla, se reintenta una vez (un error de red pudo cortar la respuesta). Si vuelve a
// fallar, se consulta el estado: "AUTHORIZED" significa que el pago quedó autorizado; "FAILED" u
// otro estado significa rechazo; "INITIALIZED" relanza el error y el comprobante ofrece reintentar.
export async function confirmarPago(token: string, venceEn: number): Promise<ResultadoWebpay | null> {
  if (Date.now() >= venceEn) return null;

  try {
    return await webpay.commit(token);
  } catch {
    try {
      return await webpay.commit(token);
    } catch (error) {
      const estado: ResultadoWebpay = await webpay.status(token);
      if (estado.status !== "INITIALIZED") return estado;
      throw error;
    }
  }
}
