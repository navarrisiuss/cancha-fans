// Admin SDK de Firebase. Solo se importa desde el servidor (Route Handlers): usa una credencial
// de cuenta de servicio que salta las security rules. "server-only" hace fallar el build si un
// componente cliente lo importa por error, así la credencial nunca llega al navegador.
import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// La inicialización es perezosa: ocurre en la primera llamada y no al importar el módulo. Así
// `next build` funciona sin las variables secretas, que solo existen en .env.local y en Vercel.
function obtenerApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  const faltantes = Object.entries({
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
    FIREBASE_ADMIN_CLIENT_EMAIL: clientEmail,
    FIREBASE_ADMIN_PRIVATE_KEY: privateKey,
  })
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Faltan variables de entorno del Admin SDK: ${faltantes.join(", ")}. ` +
        "Revisa .env.example: salen de la cuenta de servicio del proyecto de Firebase.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // En .env y en Vercel la clave se guarda en una sola línea con "\n" escritos; el SDK
      // necesita saltos de línea reales.
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

export function authAdmin() {
  return getAuth(obtenerApp());
}

export function dbAdmin() {
  return getFirestore(obtenerApp());
}
