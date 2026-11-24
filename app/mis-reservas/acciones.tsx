import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent, type ReactNode } from "react";
import { fetchConSesion } from "@/lib/firebase/fetch-con-sesion";
import { PORCENTAJE_PENALIZACION_CANCELACION } from "@/lib/reglas";
import type { Reserva, ReservaConId } from "@/lib/tipos/reserva";
import { formatearFechaHora } from "@/lib/zona-horaria";

const pesos = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });
export const formatearMonto = (monto: number) => pesos.format(monto);

export const claseCampo = "mt-1 w-full rounded-xl border border-[#A6AEA8] px-3 py-2 text-[#12241C]";

export type ErrorAccion = { texto: string; requiereAccion: boolean };

export async function leerError(respuesta: Response, mensaje: string): Promise<ErrorAccion> {
  const requiereAccion = respuesta.status === 400 || respuesta.status === 401;
  const cuerpo = await respuesta.json().catch(() => null);
  return { texto: typeof cuerpo?.error === "string" ? cuerpo.error : mensaje, requiereAccion };
}

// Va en cliente porque Radix administra el foco y el usuario confirma la operación en el modal.
export function ModalReserva({ titulo, boton, descripcion, abierto, enviando, error, alCambiar, alEnviar, children }: {
  titulo: string;
  boton: string;
  descripcion: ReactNode;
  abierto: boolean;
  enviando: boolean;
  error: ErrorAccion | null;
  alCambiar: (abierto: boolean) => void;
  alEnviar: (evento: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={abierto} onOpenChange={(valor) => !enviando && alCambiar(valor)}>
      <Dialog.Trigger className="text-[#0F7A4D] hover:underline">{boton}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#12241C]/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 text-[#12241C] shadow-xl">
          <Dialog.Title className="text-xl font-semibold">{titulo}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm">{descripcion}</Dialog.Description>
          <form onSubmit={alEnviar} className="mt-5 grid gap-4 text-sm" aria-busy={enviando}>
            {children}
            {error && (
              <p role="alert" className={`font-semibold ${error.requiereAccion ? "text-red-700" : "text-[#12241C]"}`}>
                {error.texto}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <Dialog.Close disabled={enviando} className="rounded-xl border border-[#DAD7CF] px-4 py-2.5 font-semibold disabled:opacity-60">
                Volver
              </Dialog.Close>
              <button type="submit" disabled={enviando} className="rounded-xl bg-[#0F7A4D] px-4 py-2.5 font-semibold text-white hover:bg-[#0B6840] disabled:opacity-60">
                {enviando ? "Enviando…" : titulo}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Va en cliente para mostrar el costo estimado en el modal y enviar la confirmación con la sesión.
export function CancelarReserva({ reserva, ahora, alCancelar }: {
  reserva: ReservaConId;
  ahora: Date;
  alCancelar: (cambios: Partial<Reserva>) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorAccion | null>(null);
  const limite = reserva.cancelableHasta.toMillis();
  const sinCosto = ahora.getTime() <= limite;
  const penalizacion = Math.round((reserva.montoPagado * PORCENTAJE_PENALIZACION_CANCELACION) / 100);

  async function cancelar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    if (sinCosto && Date.now() > limite) {
      setError({ texto: "Venció el plazo sin costo. Revisa el monto antes de confirmar.", requiereAccion: true });
      return;
    }
    const motivo = String(new FormData(evento.currentTarget).get("motivo") ?? "").trim();
    const mensaje = "No pudimos cancelar la reserva. Inténtalo de nuevo.";
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetchConSesion(`/api/reservas/${encodeURIComponent(reserva.id)}/cancelar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      if (!respuesta.ok) {
        setError(await leerError(respuesta, mensaje));
        return;
      }
      const resultado: Pick<Reserva, "estado" | "canceladaPor" | "penalizacion"> = await respuesta.json();
      setAbierto(false);
      alCancelar({ ...resultado, motivoCancelacion: motivo || null });
    } catch {
      setError({ texto: mensaje, requiereAccion: false });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ModalReserva
      titulo="Cancelar reserva"
      boton="Cancelar"
      descripcion={`Reserva ${reserva.codigo} · ${reserva.complejoNombre}`}
      abierto={abierto}
      enviando={enviando}
      error={error}
      alCambiar={(valor) => { setAbierto(valor); setError(null); }}
      alEnviar={cancelar}
    >
      <div className="grid gap-1 rounded-xl bg-[#F0EEE9] p-3">
        <p aria-live="polite" className="font-semibold">
          {sinCosto
            ? "Cancelación sin costo"
            : `Perderás ${formatearMonto(penalizacion)} (${PORCENTAJE_PENALIZACION_CANCELACION} % de lo pagado)`}
        </p>
        <p>Plazo sin costo hasta el {formatearFechaHora(limite)} (hora de Chile).</p>
        <p>Los reembolsos se informan, pero no se ejecutan en el sistema.</p>
      </div>
      <label>
        Motivo (opcional)
        <textarea name="motivo" rows={3} maxLength={500} className={claseCampo} disabled={enviando} />
      </label>
    </ModalReserva>
  );
}
