"use client";

// Componente cliente: maneja el estado interactivo de los campos, el horario por día de la semana
// y los eventos de envío hacia el Route Handler autenticando con el token de Firebase Auth.
import { useState, type FormEvent } from "react";
import type { MensajeError } from "../../../../lib/firebase/errores-auth";
import { fetchConSesion } from "../../../../lib/firebase/fetch-con-sesion";
import {
  DIAS_SEMANA,
  FORMATOS,
  type CanchaConId,
  type DiaSemana,
  type Formato,
  type HorarioAtencion,
  type Superficie,
} from "../../../../lib/tipos/cancha";

const ETIQUETAS_DIA: Record<DiaSemana, string> = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

const HORARIO_POR_DEFECTO: HorarioAtencion = {
  lunes: { abre: "17:00", cierra: "23:00" },
  martes: { abre: "17:00", cierra: "23:00" },
  miercoles: { abre: "17:00", cierra: "23:00" },
  jueves: { abre: "17:00", cierra: "23:00" },
  viernes: { abre: "17:00", cierra: "23:00" },
  sabado: { abre: "10:00", cierra: "23:00" },
  domingo: { abre: "10:00", cierra: "22:00" },
};

const clasesInput =
  "rounded-xl border border-[#DAD7CF] bg-white px-4 py-2.5 text-sm font-medium text-[#12241C] outline-none focus:border-[#0F7A4D]";

export function FormularioCancha({
  complejoId,
  canchaInicial,
  alGuardar,
  alCancelar,
}: {
  complejoId: string;
  canchaInicial?: CanchaConId;
  alGuardar: (cancha: CanchaConId, formatosDisponibles: Formato[]) => void;
  alCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(canchaInicial?.nombre ?? "");
  const [formato, setFormato] = useState<Formato>(canchaInicial?.formato ?? "F5");
  const [superficie, setSuperficie] = useState<Superficie>(canchaInicial?.superficie ?? "sintetico");
  const [techada, setTechada] = useState<boolean>(canchaInicial?.techada ?? false);
  const [precioPorBloque, setPrecioPorBloque] = useState<string>(
    canchaInicial ? String(canchaInicial.precioPorBloque) : "25000",
  );
  const [duracionBloqueMin, setDuracionBloqueMin] = useState<string>(
    canchaInicial ? String(canchaInicial.duracionBloqueMin) : "60",
  );
  const [horario, setHorario] = useState<HorarioAtencion>(
    canchaInicial?.horarioAtencion ?? HORARIO_POR_DEFECTO,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<MensajeError | null>(null);

  function alternarDia(dia: DiaSemana, abierto: boolean) {
    setHorario((actual) => ({
      ...actual,
      [dia]: abierto ? { abre: "17:00", cierra: "23:00" } : null,
    }));
  }

  function cambiarHoraDia(dia: DiaSemana, campo: "abre" | "cierra", valor: string) {
    setHorario((actual) => {
      const actualDia = actual[dia] ?? { abre: "17:00", cierra: "23:00" };
      return {
        ...actual,
        [dia]: { ...actualDia, [campo]: valor },
      };
    });
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const precio = Number(precioPorBloque);
    const duracion = Number(duracionBloqueMin);

    if (!nombre.trim()) {
      setError({ texto: "Escribe un nombre para la cancha.", debeActuar: true });
      return;
    }
    if (!Number.isInteger(precio) || precio <= 0) {
      setError({ texto: "Ingresa un precio por bloque válido en CLP.", debeActuar: true });
      return;
    }
    if (!Number.isInteger(duracion) || duracion < 30 || duracion > 240) {
      setError({ texto: "La duración del bloque debe estar entre 30 y 240 minutos.", debeActuar: true });
      return;
    }

    setError(null);
    setEnviando(true);

    try {
      const url = canchaInicial
        ? `/api/complejos/${encodeURIComponent(complejoId)}/canchas/${encodeURIComponent(canchaInicial.id)}`
        : `/api/complejos/${encodeURIComponent(complejoId)}/canchas`;

      const respuesta = await fetchConSesion(url, {
        method: canchaInicial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          formato,
          superficie,
          techada,
          precioPorBloque: precio,
          duracionBloqueMin: duracion,
          horarioAtencion: horario,
          activa: canchaInicial ? canchaInicial.activa : true,
        }),
      });

      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setError({
          texto: datos.error ?? "No pudimos guardar la cancha. Inténtalo de nuevo.",
          debeActuar: respuesta.status === 400,
        });
        setEnviando(false);
        return;
      }

      alGuardar(datos.cancha as CanchaConId, datos.formatosDisponibles as Formato[]);
    } catch {
      setError({
        texto: "No pudimos guardar la cancha. Revisa tu conexión e inténtalo en unos minutos.",
        debeActuar: false,
      });
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5 rounded-2xl border border-[#DAD7CF] bg-[#F0EEE9]/45 p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-[#12241C]">
          {canchaInicial ? `Editar ${canchaInicial.nombre}` : "Nueva cancha"}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
          Nombre de la cancha
          <input
            type="text"
            required
            maxLength={80}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. F5 #1"
            className={clasesInput}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
          Formato
          <select
            value={formato}
            onChange={(e) => setFormato(e.target.value as Formato)}
            className={clasesInput}
          >
            {FORMATOS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
          Superficie
          <select
            value={superficie}
            onChange={(e) => setSuperficie(e.target.value as Superficie)}
            className={clasesInput}
          >
            <option value="sintetico">Pasto sintético</option>
            <option value="pasto_natural">Pasto natural</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
          Precio por bloque (CLP)
          <input
            type="number"
            required
            min={1}
            step={1}
            value={precioPorBloque}
            onChange={(e) => setPrecioPorBloque(e.target.value)}
            className={clasesInput}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
          Duración del bloque (minutos)
          <select
            value={duracionBloqueMin}
            onChange={(e) => setDuracionBloqueMin(e.target.value)}
            className={clasesInput}
          >
            <option value="60">60 minutos</option>
            <option value="90">90 minutos</option>
            <option value="120">120 minutos</option>
          </select>
        </label>

        <label className="flex items-center gap-3 self-end rounded-xl border border-[#DAD7CF] bg-white px-4 py-2.5 text-sm font-semibold text-[#12241C]">
          <input
            type="checkbox"
            checked={techada}
            onChange={(e) => setTechada(e.target.checked)}
            className="h-4 w-4 accent-[#0F7A4D]"
          />
          Cancha techada
        </label>
      </div>

      <div>
        <p className="text-sm font-semibold text-[#12241C]">Horario de atención por día</p>
        <p className="mt-0.5 text-xs text-[#627067]">
          Desmarca los días en que esta cancha permanece cerrada.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {DIAS_SEMANA.map((dia) => {
            const tramo = horario[dia];
            const abierto = tramo !== null;
            return (
              <div
                key={dia}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DAD7CF] bg-white px-4 py-2.5"
              >
                <label className="flex min-w-[130px] items-center gap-2.5 text-sm font-semibold text-[#12241C]">
                  <input
                    type="checkbox"
                    checked={abierto}
                    onChange={(e) => alternarDia(dia, e.target.checked)}
                    className="h-4 w-4 accent-[#0F7A4D]"
                  />
                  {ETIQUETAS_DIA[dia]}
                </label>

                {abierto ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#4D5D54]">
                    <label className="flex items-center gap-1.5">
                      Abre
                      <input
                        type="time"
                        required
                        value={tramo.abre}
                        onChange={(e) => cambiarHoraDia(dia, "abre", e.target.value)}
                        className="rounded-lg border border-[#DAD7CF] px-2.5 py-1.5 text-sm font-medium text-[#12241C] outline-none focus:border-[#0F7A4D]"
                      />
                    </label>
                    <span>a</span>
                    <label className="flex items-center gap-1.5">
                      Cierra
                      <input
                        type="time"
                        required
                        value={tramo.cierra}
                        onChange={(e) => cambiarHoraDia(dia, "cierra", e.target.value)}
                        className="rounded-lg border border-[#DAD7CF] px-2.5 py-1.5 text-sm font-medium text-[#12241C] outline-none focus:border-[#0F7A4D]"
                      />
                    </label>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-[#627067]">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className={`text-sm font-semibold ${error.debeActuar ? "text-[#A8302D]" : "text-[#12241C]"}`}
        >
          {error.texto}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={alCancelar}
          disabled={enviando}
          className="rounded-xl border border-[#DAD7CF] bg-white px-4 py-2.5 text-sm font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9] disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-[#0F7A4D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Guardando…" : canchaInicial ? "Guardar cambios" : "Crear cancha"}
        </button>
      </div>
    </form>
  );
}
