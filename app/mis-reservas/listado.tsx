"use client";

import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { useSesion } from "@/lib/firebase/use-sesion";
import { estadoVisibleReserva } from "@/lib/reservas-estado";
import type { EstadoReserva, Reserva, ReservaConId } from "@/lib/tipos/reserva";
import { formatearFechaHora } from "@/lib/zona-horaria";
import { CancelarReserva, formatearMonto } from "./acciones";
import { DejarResena } from "./dejar-resena";

const ETIQUETAS: Record<EstadoReserva, string> = {
  pendiente_pago: "Pendiente de pago",
  pagada: "Pagada",
  jugada: "Jugada",
  cancelada: "Cancelada",
  expirada: "Expirada",
};

type Carga = { reservas: ReservaConId[]; error: false } | { error: true };

// Va en cliente porque la sesión de Firebase Auth vive en el navegador.
export function ListadoMisReservas() {
  const { usuario, cargando } = useSesion();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuario) router.replace("/iniciar-sesion?siguiente=/mis-reservas");
  }, [cargando, usuario, router]);

  // La clave descarta los datos y modales de la sesión anterior al cambiar de cuenta.
  return usuario ? (
    <ReservasDelJugador key={usuario.uid} uid={usuario.uid} />
  ) : (
    <p role="status" className="text-sm text-[#12241C]">Cargando tus reservas…</p>
  );
}

// Va en cliente para escuchar los cambios de Firestore con las reglas del jugador.
function ReservasDelJugador({ uid }: { uid: string }) {
  const [carga, setCarga] = useState<Carga | null>(null);
  const [ahora, setAhora] = useState<Date | null>(null);
  const reservas = carga?.error === false ? carga.reservas : null;

  useEffect(() => {
    // Una lectura inicial por reserva de esta cuenta, sin lecturas extra de complejos ni canchas.
    // La suscripción recibe cambios posteriores, incluidas las cancelaciones del arrendatario.
    const propias = query(collection(db, "reservas"), where("jugadorId", "==", uid), orderBy("inicio", "desc"));
    return onSnapshot(propias, (resultado) => {
      setAhora(new Date());
      setCarga({
        error: false,
        reservas: resultado.docs.map((documento) => ({
          ...(documento.data() as Reserva),
          id: documento.id,
        })),
      });
    }, () => setCarga({ error: true }));
  }, [uid]);

  useEffect(() => {
    if (!reservas) return;
    // Actualiza los estados cuando vence un plazo con los datos que ya están en memoria.
    let temporizador: ReturnType<typeof setTimeout>;
    const actualizarReloj = () => {
      const instante = Date.now();
      setAhora(new Date(instante));
      let siguiente = Infinity;
      for (const reserva of reservas) {
        const limites = reserva.estado === "pagada"
          ? [reserva.inicio.toMillis(), reserva.fin.toMillis(), reserva.cancelableHasta.toMillis() + 1]
          : [reserva.expiraAt?.toMillis()];
        for (const limite of limites) {
          if (limite !== undefined && limite > instante) siguiente = Math.min(siguiente, limite);
        }
      }
      if (Number.isFinite(siguiente)) {
        temporizador = setTimeout(actualizarReloj, Math.min(siguiente - instante, 2_147_483_647));
      }
    };
    temporizador = setTimeout(actualizarReloj, 0);
    return () => clearTimeout(temporizador);
  }, [reservas]);

  if (carga?.error) {
    return (
      <p role="alert" className="rounded-2xl border border-[#DAD7CF] bg-white p-5 text-sm font-semibold text-[#12241C]">
        No pudimos cargar tus reservas. Inténtalo de nuevo en unos minutos.
      </p>
    );
  }
  if (!reservas || !ahora) return <p role="status" className="text-sm text-[#12241C]">Cargando tus reservas…</p>;

  const visibles = reservas.map((reserva) => ({
    reserva,
    estado: estadoVisibleReserva(reserva, ahora),
  }));
  const proximas = visibles.filter(({ reserva, estado }) => estado === "pagada" && reserva.inicio.toMillis() > ahora.getTime()).reverse();
  const enCurso = visibles.filter(({ reserva, estado }) => estado === "pagada" && reserva.inicio.toMillis() <= ahora.getTime());
  const historial = visibles.filter(({ estado }) => estado === "jugada" || estado === "cancelada" || estado === "expirada");

  function actualizarReserva(id: string, cambios: Partial<Reserva>) {
    setCarga((actual) => actual?.error === false
      ? { ...actual, reservas: actual.reservas.map((reserva) => reserva.id === id ? { ...reserva, ...cambios } : reserva) }
      : actual);
  }

  if (!proximas.length && !enCurso.length && !historial.length) {
    return (
      <div className="rounded-2xl border border-[#DAD7CF] bg-white px-6 py-8 text-center text-[#12241C]">
        <p>Aquí verás tus reservas cuando tengas una confirmada.</p>
        <Link href="/" className="mt-3 inline-block text-sm font-semibold text-[#0F7A4D] hover:underline">
          Buscar una cancha
        </Link>
      </div>
    );
  }

  const secciones = [
    { id: "proximas", titulo: "Próximas", filas: proximas, vacio: "No tienes reservas próximas." },
    ...(enCurso.length ? [{ id: "en-curso", titulo: "En curso", filas: enCurso, vacio: "" }] : []),
    { id: "historial", titulo: "Historial", filas: historial, vacio: "Tu historial aún está vacío." },
  ];

  return (
    <div className="grid gap-8">
      {secciones.map(({ id, titulo, filas, vacio }) => (
        <section key={id} aria-labelledby={id}>
          <h2 id={id} className="mb-3 text-xl font-semibold text-[#12241C]">{titulo}</h2>
          {filas.length ? (
            <ul className="grid gap-3">
              {filas.map(({ reserva, estado }) => (
                <TarjetaReserva key={reserva.id} reserva={reserva} estado={estado} ahora={ahora}
                  actualizar={(cambios) => actualizarReserva(reserva.id, cambios)} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#12241C]">{vacio}</p>
          )}
        </section>
      ))}
    </div>
  );
}

// Va en cliente para mostrar acciones y estados a partir de los datos de la sesión.
function TarjetaReserva({ reserva, estado, ahora, actualizar }: {
  reserva: ReservaConId;
  estado: EstadoReserva;
  ahora: Date;
  actualizar: (cambios: Partial<Reserva>) => void;
}) {
  const pagada = estado === "pagada";
  const cancelada = estado === "cancelada";
  const jugada = estado === "jugada";

  return (
    <li className="grid gap-4 rounded-2xl border border-[#DAD7CF] bg-white p-5 text-[#12241C] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#4D5D54]">Reserva {reserva.codigo}</p>
          <h3 className="break-words text-lg font-semibold">{reserva.complejoNombre} · {reserva.canchaNombre}</h3>
          <p className="text-sm">{formatearFechaHora(reserva.inicio.toDate())}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pagada ? "bg-[#D9F24A] text-[#12241C]" : "bg-[#12241C] text-white"}`}>
          {ETIQUETAS[estado]}
        </span>
      </div>

      <div className="grid gap-1 text-sm">
        <p>Monto pagado <strong className="font-semibold">{formatearMonto(reserva.montoPagado)}</strong></p>
        {(pagada || jugada) && reserva.saldoPendiente > 0 && (
          <p>Saldo a pagar en el complejo <strong className="font-semibold">{formatearMonto(reserva.saldoPendiente)}</strong></p>
        )}
      </div>

      {cancelada && (
        <div className="grid gap-1 rounded-xl bg-[#F0EEE9] p-3 text-sm">
          {reserva.canceladaPor === "arrendatario" && (
            <p><strong>El arrendatario canceló la reserva. Conservas todo tu dinero.</strong></p>
          )}
          {reserva.canceladaPor === "jugador" && (
            <p><strong>Cancelaste esta reserva.</strong></p>
          )}
          {reserva.motivoCancelacion && <p className="whitespace-pre-wrap break-words">Motivo: {reserva.motivoCancelacion}</p>}
          {reserva.penalizacion != null && <p>Aviso: perdiste {formatearMonto(reserva.penalizacion)} de lo pagado.</p>}
          <p>Los reembolsos se informan, pero no se ejecutan en el sistema.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#E7E5DF] pt-3 text-sm font-semibold">
        <Link href={`/reservas/${encodeURIComponent(reserva.id)}/comprobante`} className="text-[#0F7A4D] hover:underline">
          Ver comprobante
        </Link>
        {pagada && reserva.inicio.toMillis() > ahora.getTime() && (
          <CancelarReserva reserva={reserva} ahora={ahora} alCancelar={actualizar} />
        )}
        {jugada && (reserva.tieneResena ? (
          <span>Reseña enviada</span>
        ) : (
          <DejarResena reservaId={reserva.id} alEnviar={() => actualizar({ tieneResena: true })} />
        ))}
      </div>
    </li>
  );
}
