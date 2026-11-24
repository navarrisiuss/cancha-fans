// Contrato compartido entre GET /api/arrendatario/metricas y la vista cliente de resumen.
// Módulo puro sin dependencias de SDK para importarlo tanto en servidor como en cliente.
import type { EstadoReserva } from "../../../../lib/tipos/reserva";

export const FECHA_CORTE_METRICAS = "2026-11-24" as const;

export type MetricasMensualesArrendatario = {
  reservasPagadas: number;
  ventas: number;
  cobradoEnLinea: number;
  canceladas: number;
  ocupacion: number | null;
};

export type ReservaHoyArrendatario = {
  id: string;
  codigo: string;
  complejoNombre: string;
  canchaNombre: string;
  jugadorNombre: string;
  inicio: string;
  fin: string;
  estado: EstadoReserva;
};

export type RespuestaMetricasArrendatario = {
  mes: string;
  fechaCorte: typeof FECHA_CORTE_METRICAS;
  metricas: MetricasMensualesArrendatario | null;
  reservasHoy: ReservaHoyArrendatario[];
};
