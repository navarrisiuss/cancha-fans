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

// Confirma (commit) el pago. Sin commit, Transbank anula la transacción aunque el banco la haya
// autorizado. Ojo: status() devuelve "AUTHORIZED" apenas el banco autoriza, ANTES del commit
// (verificado contra el ambiente de integración), así que el estado no sirve para decidir si hay que
// hacer commit: siempre se intenta el commit primero.
//
// Si el commit falla, se reintenta una vez (un error de red pudo cortar la respuesta). Si vuelve a
// fallar, se consulta el estado: "AUTHORIZED" significa que un commit anterior ya se aplicó (por
// ejemplo, un retorno duplicado) y el pago vale; "FAILED" u otro estado significa rechazo.
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
