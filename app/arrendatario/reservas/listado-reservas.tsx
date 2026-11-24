"use client";

// Componente cliente: requiere la sesión de Firebase Auth (useSesion), consulta las reservas con
// ownerId == uid desde el navegador y abre el modal de confirmación para cancelar con motivo.
import * as Dialog from "@radix-ui/react-dialog";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "../../../lib/firebase/client";
import type { MensajeError } from "../../../lib/firebase/errores-auth";
import { fetchConSesion } from "../../../lib/firebase/fetch-con-sesion";
import { useSesion } from "../../../lib/firebase/use-sesion";
import { estadoVisibleReserva } from "../../../lib/reservas-estado";
import type { EstadoReserva, ReservaConId } from "../../../lib/tipos/reserva";
import { formatearFechaHora, formatearHora } from "../../../lib/zona-horaria";

// Lima (#D9F24A) se usa para el estado "pagada", que es uno de sus usos exclusivos en CLAUDE.md.
const ETIQUETAS_ESTADO: Record<EstadoReserva, { texto: string; clases: string }> = {
  pendiente_pago: { texto: "Pendiente de pago", clases: "bg-[#F0EEE9] text-[#4D5D54]" },
  pagada: { texto: "Pagada", clases: "bg-[#D9F24A] text-[#12241C]" },
  jugada: { texto: "Jugada", clases: "bg-[#0F7A4D] text-white" },
  cancelada: { texto: "Cancelada", clases: "bg-[#12241C] text-white" },
  expirada: { texto: "Expirada", clases: "bg-[#F0EEE9] text-[#627067]" },
};

function formatearPesos(monto: number): string {
  return monto.toLocaleString("es-CL", { style: "currency", currency: "CLP" });
}

export function ListadoReservasRecibidas() {
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  const [reservas, setReservas] = useState<ReservaConId[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [reservaPorCancelar, setReservaPorCancelar] = useState<ReservaConId | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorModal, setErrorModal] = useState<MensajeError | null>(null);

  useEffect(() => {
    if (cargando) return;
    if (!usuario) {
      router.replace("/iniciar-sesion?siguiente=/arrendatario/reservas");
      return;
    }

    let cancelado = false;
    (async () => {
      try {
        // Las security rules exigen filtrar por ownerId == request.auth.uid. Se ordena en memoria
        // de la más próxima/reciente a la más antigua para no depender de un índice compuesto.
        const snap = await getDocs(
          query(collection(db, "reservas"), where("ownerId", "==", usuario.uid)),
        );
        if (cancelado) return;

        const lista: ReservaConId[] = snap.docs
          .map((d) => {
            const datos = d.data();
            return {
              id: d.id,
              codigo: datos.codigo,
              jugadorId: datos.jugadorId,
              jugadorNombre: datos.jugadorNombre,
              jugadorEmail: datos.jugadorEmail,
              complejoId: datos.complejoId,
              complejoNombre: datos.complejoNombre,
              complejoComuna: datos.complejoComuna,
              ownerId: datos.ownerId,
              canchaId: datos.canchaId,
              canchaNombre: datos.canchaNombre,
              canchaFormato: datos.canchaFormato,
              inicio: datos.inicio,
              fin: datos.fin,
              precioTotal: datos.precioTotal,
              montoPagado: datos.montoPagado,
              saldoPendiente: datos.saldoPendiente,
              tipoPago: datos.tipoPago,
              comision: datos.comision,
              estado: datos.estado,
              expiraAt: datos.expiraAt ?? null,
              cancelableHasta: datos.cancelableHasta,
              canceladaPor: datos.canceladaPor ?? null,
              motivoCancelacion: datos.motivoCancelacion ?? null,
              penalizacion: datos.penalizacion ?? null,
              tieneResena: Boolean(datos.tieneResena),
              webpayToken: datos.webpayToken ?? null,
              webpayOrdenCompra: datos.webpayOrdenCompra ?? null,
              createdAt: datos.createdAt,
              updatedAt: datos.updatedAt,
            };
          })
          .sort((a, b) => b.inicio.toMillis() - a.inicio.toMillis());

        setReservas(lista);
      } catch {
        if (!cancelado) setErrorCarga(true);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [cargando, usuario, router]);

  if (errorCarga) {
    return (
      <p role="alert" className="text-sm font-semibold text-[#12241C]">
        No pudimos cargar las reservas recibidas. Inténtalo de nuevo en unos minutos.
      </p>
    );
  }

  if (!reservas) {
    return <p className="text-sm font-medium text-[#627067]">Cargando reservas recibidas…</p>;
  }

  if (reservas.length === 0) {
    return (
      <p className="text-sm text-[#4D5D54]">
        Todavía no has recibido reservas en tus canchas.
      </p>
    );
  }

  function abrirModalCancelacion(reserva: ReservaConId) {
    setReservaPorCancelar(reserva);
    setMotivo("");
    setErrorModal(null);
  }

  async function confirmarCancelacion() {
    if (!reservaPorCancelar) return;
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      setErrorModal({
        texto: "Indica el motivo de la cancelación para avisarle al jugador.",
        debeActuar: true,
      });
      return;
    }

    setErrorModal(null);
    setEnviando(true);
    try {
      const respuesta = await fetchConSesion(
        `/api/reservas/${encodeURIComponent(reservaPorCancelar.id)}/cancelar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo: motivoLimpio }),
        },
      );
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        setErrorModal({
          texto: datos.error ?? "No pudimos cancelar la reserva. Inténtalo de nuevo.",
          debeActuar: respuesta.status === 400,
        });
        setEnviando(false);
        return;
      }

      setReservas((actual) =>
        actual
          ? actual.map((r) =>
              r.id === reservaPorCancelar.id
                ? {
                    ...r,
                    estado: "cancelada",
                    canceladaPor: "arrendatario",
                    motivoCancelacion: motivoLimpio,
                  }
                : r,
            )
          : actual,
      );
      setEnviando(false);
      setReservaPorCancelar(null);
    } catch {
      setErrorModal({
        texto: "No pudimos cancelar la reserva. Revisa tu conexión e inténtalo de nuevo.",
        debeActuar: false,
      });
      setEnviando(false);
    }
  }

  const ahora = new Date();

  return (
    <>
      <ul className="flex flex-col gap-4">
        {reservas.map((reserva) => {
          const estadoVisible = estadoVisibleReserva(reserva, ahora);
          const etiqueta = ETIQUETAS_ESTADO[estadoVisible];
          const puedeCancelar =
            estadoVisible === "pagada" && reserva.inicio.toMillis() > ahora.getTime();

          return (
            <li
              key={reserva.id}
              className="flex flex-col gap-3 rounded-2xl border border-[#DAD7CF] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[#F0EEE9] px-2.5 py-0.5 text-xs font-semibold text-[#12241C]">
                    {reserva.codigo}
                  </span>
                  <p className="font-semibold text-[#12241C]">
                    {reserva.complejoNombre} · {reserva.canchaNombre} ({reserva.canchaFormato})
                  </p>
                  <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${etiqueta.clases}`}>
                    {etiqueta.texto}
                  </span>
                </div>

                <p className="mt-1.5 text-sm font-medium text-[#12241C]">
                  {formatearFechaHora(reserva.inicio.toDate())} a {formatearHora(reserva.fin.toDate())}
                </p>

                <p className="mt-1 text-sm text-[#4D5D54]">
                  Jugador: <span className="font-semibold">{reserva.jugadorNombre}</span> ({reserva.jugadorEmail})
                </p>

                <p className="mt-1 text-xs font-medium text-[#627067]">
                  Pagado en línea: {formatearPesos(reserva.montoPagado)} · Saldo en complejo:{" "}
                  {formatearPesos(reserva.saldoPendiente)}
                </p>

                {estadoVisible === "cancelada" && reserva.motivoCancelacion && (
                  <p className="mt-2 rounded-xl bg-[#F0EEE9] px-3 py-2 text-xs font-medium text-[#12241C]">
                    Cancelada por {reserva.canceladaPor === "arrendatario" ? "el complejo" : "el jugador"}:{" "}
                    {reserva.motivoCancelacion}
                  </p>
                )}
              </div>

              {puedeCancelar && (
                <button
                  type="button"
                  onClick={() => abrirModalCancelacion(reserva)}
                  className="shrink-0 rounded-xl border border-[#DAD7CF] px-4 py-2.5 text-xs font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9]"
                >
                  Cancelar reserva
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog.Root
        open={reservaPorCancelar !== null}
        onOpenChange={(abierto) => !abierto && !enviando && setReservaPorCancelar(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[#12241C]/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] bg-white p-7 shadow-[0_24px_70px_rgba(18,36,28,0.18)]">
            <Dialog.Title className="text-lg font-semibold text-[#12241C]">
              Cancelar reserva {reservaPorCancelar?.codigo}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-[#4D5D54]">
              Al cancelar una reserva como arrendatario, el jugador conserva el 100% de su dinero sin
              importar el momento y recibe el motivo que indiques a continuación.
            </Dialog.Description>

            <label className="mt-4 flex flex-col gap-1.5 text-sm font-semibold text-[#12241C]">
              Motivo de la cancelación (obligatorio)
              <textarea
                rows={3}
                maxLength={500}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Mantención urgente de iluminación o lluvia intensa"
                className="rounded-xl border border-[#DAD7CF] px-3.5 py-2.5 text-sm font-medium text-[#12241C] outline-none focus:border-[#0F7A4D]"
              />
            </label>

            {errorModal && (
              <p
                role="alert"
                className={`mt-3 text-sm font-semibold ${
                  errorModal.debeActuar ? "text-[#A8302D]" : "text-[#12241C]"
                }`}
              >
                {errorModal.texto}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Dialog.Close
                disabled={enviando}
                className="rounded-xl border border-[#DAD7CF] py-3 text-sm font-semibold text-[#12241C] transition-colors hover:bg-[#F0EEE9] disabled:opacity-60"
              >
                Volver
              </Dialog.Close>
              <button
                type="button"
                disabled={enviando}
                onClick={() => void confirmarCancelacion()}
                className="rounded-xl bg-[#0F7A4D] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B6840] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando ? "Cancelando…" : "Confirmar cancelación"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
