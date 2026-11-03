// Traduce los errores de Firebase a mensajes en español de Chile. No lleva "client-only": es solo
// un mapa de textos y no toca el SDK, así que puede usarse desde cualquier lado.
import { FirebaseError } from "firebase/app";

export type MensajeError = {
  texto: string;
  // true cuando el usuario debe corregir algo (se muestra en rojo); false cuando el problema es
  // del sistema (se muestra en carbón).
  debeActuar: boolean;
};

const mensajes: Record<string, MensajeError> = {
  "auth/email-already-in-use": {
    texto: "Ya existe una cuenta con ese correo. Prueba iniciando sesión.",
    debeActuar: true,
  },
  "auth/invalid-email": {
    texto: "El correo no es válido.",
    debeActuar: true,
  },
  "auth/weak-password": {
    texto: "La contraseña es muy débil. Usa al menos 6 caracteres.",
    debeActuar: true,
  },
  "auth/password-does-not-meet-requirements": {
    texto: "La contraseña es muy débil. Usa al menos 6 caracteres.",
    debeActuar: true,
  },
  // Firebase devuelve el mismo código para correo inexistente y contraseña incorrecta, para no
  // revelar qué correos tienen cuenta.
  "auth/invalid-credential": {
    texto: "El correo o la contraseña no son correctos.",
    debeActuar: true,
  },
  "auth/user-disabled": {
    texto: "Esta cuenta está deshabilitada. Escríbenos si crees que es un error.",
    debeActuar: true,
  },
  "auth/too-many-requests": {
    texto: "Hubo demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    debeActuar: false,
  },
  "auth/network-request-failed": {
    texto: "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.",
    debeActuar: false,
  },
};

const mensajeGenerico: MensajeError = {
  texto: "Algo salió mal de nuestro lado. Inténtalo en unos minutos.",
  debeActuar: false,
};

export function mensajeErrorAuth(error: unknown): MensajeError {
  if (error instanceof FirebaseError) {
    return mensajes[error.code] ?? mensajeGenerico;
  }
  return mensajeGenerico;
}
