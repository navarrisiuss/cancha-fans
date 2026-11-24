import type { BloqueDisponible, DiaDisponible } from "../../lib/disponibilidad";
import { formatearHora, instanteEnSantiago, ZONA_HORARIA } from "../../lib/zona-horaria";

const formatoEncabezado = new Intl.DateTimeFormat("es-CL", {
  timeZone: ZONA_HORARIA, weekday: "short", day: "numeric",
});
const formatoFecha = new Intl.DateTimeFormat("es-CL", {
  timeZone: ZONA_HORARIA, weekday: "long", day: "numeric", month: "long",
});
const formatoRango = new Intl.DateTimeFormat("es-CL", {
  timeZone: ZONA_HORARIA, day: "numeric", month: "short", year: "numeric",
});
const formatoHoraRepetida = new Intl.DateTimeFormat("es-CL", {
  timeZone: ZONA_HORARIA, hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "shortOffset",
});

// Se renderiza dentro de la sección cliente porque cada botón cambia el bloque elegido.
export function GrillaSemanal({ dias, inicioElegido, elegirInicio }: {
  dias: DiaDisponible[];
  inicioElegido?: string;
  elegirInicio: (inicio: string) => void;
}) {
  const horas = new Set<string>();
  const columnas = dias.map(({ fecha, bloques }) => {
    const mediodia = instanteEnSantiago(fecha, "12:00");
    const porHora = new Map<string, BloqueDisponible[]>();
    for (const bloque of bloques) {
      const hora = formatearHora(Date.parse(bloque.inicio));
      horas.add(hora);
      const coincidencias = porHora.get(hora);
      // Al atrasarse el reloj, pueden existir dos bloques distintos con la misma hora local.
      if (coincidencias) coincidencias.push(bloque);
      else porHora.set(hora, [bloque]);
    }
    return { fecha, mediodia, porHora };
  });
  const filas = Array.from(horas).sort();
  const rango = formatoRango.formatRange(columnas[0].mediodia, columnas[columnas.length - 1].mediodia);
  const cabeceraHora = "sticky left-0 z-10 bg-white py-2 pr-2 text-left font-semibold";

  return (
    <div>
      <div role="region" aria-label="Horarios de la semana" tabIndex={0} className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[40rem] table-fixed text-center text-sm">
          <caption className="pb-2 text-left font-semibold">{rango}</caption>
          <thead>
            <tr className="border-b border-[#DAD7CF]">
              <th scope="col" className={`${cabeceraHora} w-[4.5rem]`}>Hora</th>
              {columnas.map(({ fecha, mediodia }) => (
                <th key={fecha} scope="col" aria-label={formatoFecha.format(mediodia)} className="p-2 font-semibold">
                  <time dateTime={fecha}>{formatoEncabezado.format(mediodia)}</time>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((hora) => (
              <tr key={hora} className="border-b border-[#F0EEE9]">
                <th scope="row" className={cabeceraHora}>{hora}</th>
                {columnas.map(({ fecha, mediodia, porHora }) => {
                  const horarios = porHora.get(hora) ?? [];
                  return (
                    <td key={fecha} className="p-1 align-top">
                      {horarios.map((horario) => {
                        const ocupado = horario.estado === "ocupado";
                        const horaVisible = horarios.length > 1
                          ? formatoHoraRepetida.format(Date.parse(horario.inicio))
                          : hora;
                        return (
                          <button
                            key={horario.inicio}
                            type="button"
                            disabled={ocupado}
                            aria-pressed={horario.inicio === inicioElegido}
                            aria-label={`${formatoFecha.format(mediodia)}, ${horaVisible}${ocupado ? ", Ocupado" : ""}`}
                            onClick={() => elegirInicio(horario.inicio)}
                            className="block min-h-11 w-full rounded-lg bg-[#D9F24A] px-1 py-2 text-sm font-semibold ring-inset ring-[#0F7A4D] enabled:hover:ring-2 aria-pressed:ring-2 disabled:bg-[#F0EEE9] disabled:text-[#627067] [&+&]:mt-1"
                          >
                            {ocupado && horarios.length === 1 ? "Ocupado" : horaVisible}
                          </button>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filas.length === 0 && <p role="status" className="mt-2 text-sm">No hay horarios para esta semana.</p>}
    </div>
  );
}
