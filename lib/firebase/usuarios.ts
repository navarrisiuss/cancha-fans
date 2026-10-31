// Documento users/{uid} de Firestore (ver docs/modelo-datos.md). Lo usan el registro y el login
// para que la forma del documento se defina en un solo lugar.
import "client-only";

import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./client";

// Se guarda el correo que devuelve Firebase (normalizado), no el del formulario: la security rule
// lo compara contra el token. isAdmin nace en false y solo se activa a mano en la consola.
export async function crearDocumentoUsuario(usuario: User, nombre: string | null) {
  await setDoc(doc(db, "users", usuario.uid), {
    email: usuario.email,
    displayName: nombre,
    phone: null,
    photoURL: null,
    isAdmin: false,
    createdAt: serverTimestamp(),
  });
}

// Si el registro creó la cuenta en Auth pero falló al escribir en Firestore, el usuario quedó sin
// documento. Al iniciar sesión se revisa y se crea si falta. Costo: 1 lectura por inicio de sesión
// y 1 escritura solo cuando falta el documento.
export async function asegurarDocumentoUsuario(usuario: User) {
  const documento = await getDoc(doc(db, "users", usuario.uid));
  if (!documento.exists()) {
    await crearDocumentoUsuario(usuario, usuario.displayName);
  }
}
