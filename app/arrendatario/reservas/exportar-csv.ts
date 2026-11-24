// Utilidades puras para exportar las reservas recibidas a un CSV compatible con Excel en es-CL
// (separador ";" y BOM UTF-8). Se importa desde el componente cliente para descargar en el navegador
// las reservas ya cargadas, sin lecturas adicionales a Firestore.
import { estadoVisibleReserva } from "../../../lib/reservas-estado";
import type { EstadoReserva, ReservaConId, TipoPago } from "../../../lib/tipos/reserva";
import { formatearHora, hoyEnSantiago } from "../../../lib/zona-horaria";

const SEPARADOR_CSV = ";";
const BOM_UTF8 = "\uFEFF";

// Protege celdas contra evaluación de fórmulas en Excel (incluidos teléfonos con prefijo "+",
// signos iniciales precedidos por espacios y caracteres de control al comienzo).
const PATRON_FORMULA_EXCEL = /^[\t\r\n]|^\s*[=+\-@]/;

const COLUMNAS_CSV = [
  "Código",
  "Complejo",
  "Cancha",
  "Fecha",
  "Hora",
  "Jugador",
  "RUT",
  "Teléfono",
  "Correo",
  "Estado",
  "Tipo de pago",
  "Total",
  "Pagado",
  "Saldo",
  "Motivo",
] as const;

export const TEXTOS_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  pendiente_pago: "Pendiente de pago",
  pagada: "Pagada",
  jugada: "Jugada",
  cancelada: "Cancelada",
  expirada: "Expirada",
};

const TEXTOS_TIPO_PAGO: Record<TipoPago, string> = {
  total: "Total",
  sena: "Seña",
};

export function escaparCeldaCsv(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";

  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) return "";
    return valor < 0 ? `'${valor}` : String(valor);
  }

  const textoSeguro = PATRON_FORMULA_EXCEL.test(valor) ? `'${valor}` : valor;
  if (/[;"\r\n]/.test(textoSeguro)) {
    return `"${textoSeguro.replace(/"/g, '""')}"`;
  }
  return textoSeguro;
}

export function generarCsvReservas(reservas: ReservaConId[], ahora: Date = new Date()): string {
  const encabezado = COLUMNAS_CSV.map(escaparCeldaCsv).join(SEPARADOR_CSV);

  const filas = reservas.map((reserva) => {
    const estadoVisible = estadoVisibleReserva(reserva, ahora);
    const inicio = reserva.inicio.toDate();
    const fin = reserva.fin.toDate();

    const celdas: Array<string | number | null | undefined> = [
      reserva.codigo,
      reserva.complejoNombre,
      reserva.canchaNombre,
      hoyEnSantiago(inicio),
      `${formatearHora(inicio)} - ${formatearHora(fin)}`,
      reserva.jugadorNombre,
      reserva.jugadorRut ?? "",
      reserva.jugadorTelefono ?? "",
      reserva.jugadorEmail,
      TEXTOS_ESTADO_RESERVA[estadoVisible],
      TEXTOS_TIPO_PAGO[reserva.tipoPago] ?? "",
      reserva.precioTotal,
      reserva.montoPagado,
      reserva.saldoPendiente,
      reserva.motivoCancelacion ?? "",
    ];

    return celdas.map(escaparCeldaCsv).join(SEPARADOR_CSV);
  });

  return `${BOM_UTF8}${[encabezado, ...filas].join("\r\n")}`;
}

export function descargarCsvReservas(reservas: ReservaConId[], ahora: Date = new Date()): void {
  const contenido = generarCsvReservas(reservas, ahora);
  const archivo = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `reservas-recibidas-${hoyEnSantiago(ahora)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
