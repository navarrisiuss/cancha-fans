"use client";

// Dice si la cuenta con sesión es administradora, para mostrar el enlace al panel. Es solo
// navegación: la protección real está en el servidor (exigirAdmin).
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./client";

// Una consulta por cuenta mientras la página siga abierta: los encabezados se vuelven a montar al
// navegar y, sin esto, cada cambio de página costaría 1 lectura.
const consultas = new Map<string, Promise<boolean>>();

function consultarEsAdmin(uid: string) {
  let consulta = consultas.get(uid);
  if (!consulta) {
    consulta = getDoc(doc(db, "users", uid)).then(
      (documento) => documento.get("isAdmin") === true,
      () => {
        // Si falla (sin conexión), no se recuerda el error: se reintenta en el próximo montaje.
        consultas.delete(uid);
        return false;
      },
    );
    consultas.set(uid, consulta);
  }
  return consulta;
}

export function useEsAdmin(usuario: User | null) {
  // Se guarda el uid del admin y no un booleano: al cambiar de cuenta, el valor anterior no sirve.
  const [uidAdmin, setUidAdmin] = useState<string | null>(null);
  const uid = usuario?.uid;

  useEffect(() => {
    if (!uid) return;
    let cancelado = false;
    consultarEsAdmin(uid).then((esAdmin) => {
      if (!cancelado) setUidAdmin(esAdmin ? uid : null);
    });
    return () => {
      cancelado = true;
    };
  }, [uid]);

  return uid !== undefined && uidAdmin === uid;
}
