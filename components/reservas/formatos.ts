import { PORCENTAJE_SENA } from "../../lib/reglas";

const moneda = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

export function formatearMonto(monto: number): string {
  return moneda.format(monto);
}

export function montoSena(total: number): number {
  return Math.round((total * PORCENTAJE_SENA) / 100);
}
