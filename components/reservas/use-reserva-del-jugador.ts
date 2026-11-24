"use client";

// Firebase Auth y las reglas de Firestore verifican en el navegador quién puede leer la reserva.
import { doc, getDocFromServer } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase/client";
import { useSesion } from "../../lib/firebase/use-sesion";
import type { Reserva } from "../../lib/tipos/reserva";

type Resultado = { estado: "lista"; reserva: Reserva } | { estado: "no_disponible" | "error" };
type Lectura = { id: string; jugadorId: string; resultado: Resultado };

export function useReservaDelJugador(id: string): Resultado | { estado: "cargando" | "sin_sesion" } {
  const { usuario, cargando } = useSesion();
  const jugadorId = usuario?.uid;
  const idValido = Boolean(id) && !id.includes("/");
  const [lectura, guardarLectura] = useState<Lectura>();

  useEffect(() => {
    if (!jugadorId || !idValido) return;
    let vigente = true;

    // Una lectura del documento para el jugador; las reglas rechazan accesos de terceros.
    getDocFromServer(doc(db, "reservas", id)).then((documento) => {
      if (!vigente) return;
      const reserva = documento.data() as Reserva | undefined;
      const resultado: Resultado = reserva?.jugadorId === jugadorId
        ? { estado: "lista", reserva }
        : { estado: "no_disponible" };
      guardarLectura({ id, jugadorId, resultado });
    }).catch((error: { code?: string }) => {
      if (vigente) {
        const estado = error.code === "permission-denied" ? "no_disponible" : "error";
        guardarLectura({ id, jugadorId, resultado: { estado } });
      }
    });

    return () => { vigente = false; };
  }, [id, idValido, jugadorId]);

  if (cargando) return { estado: "cargando" };
  if (!jugadorId) return { estado: "sin_sesion" };
  if (!idValido) return { estado: "no_disponible" };
  if (lectura?.id !== id || lectura.jugadorId !== jugadorId) return { estado: "cargando" };
  return lectura.resultado;
}
