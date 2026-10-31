"use client";

// Estado de la sesión de Firebase Auth para componentes cliente. Es un hook y no un provider:
// Firebase ya guarda la sesión en memoria, así que varios componentes pueden escucharla sin
// duplicar lecturas ni envolver todo el layout en un componente cliente.
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "./client";

export type EstadoSesion = {
  usuario: User | null;
  // true hasta que Firebase confirma si hay sesión. Mientras tanto no se sabe si el usuario
  // entró o no, así que conviene no mostrar ni "Iniciar sesión" ni "Cerrar sesión".
  cargando: boolean;
};

export function useSesion(): EstadoSesion {
  const [estado, setEstado] = useState<EstadoSesion>({ usuario: null, cargando: true });

  useEffect(() => {
    // onAuthStateChanged avisa al cargar la página y cada vez que se inicia o cierra sesión.
    // Devuelve la función que cancela la suscripción.
    return onAuthStateChanged(auth, (usuario) => setEstado({ usuario, cargando: false }));
  }, []);

  return estado;
}
