// SDK cliente de Firebase. Solo se importa desde componentes cliente: la sesión de Auth vive en
// el navegador. Para lecturas y escrituras desde el servidor se usará lib/firebase/admin.ts.
import "client-only";

import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

// Cada variable se lee de forma literal: Next.js reemplaza `process.env.NEXT_PUBLIC_*` por su
// valor al compilar, y un acceso dinámico (process.env[nombre]) no llega al navegador.
const variables = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const usarEmuladores = process.env.NEXT_PUBLIC_USAR_EMULADORES === "true";

if (usarEmuladores && variables.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "demo-cancha-fans") {
  throw new Error("Para usar los emuladores, configura NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-cancha-fans.");
}

const faltantes = Object.entries(variables)
  .filter(([, valor]) => !valor)
  .map(([nombre]) => nombre);

if (faltantes.length > 0) {
  throw new Error(
    `Faltan variables de entorno de Firebase: ${faltantes.join(", ")}. ` +
      "Copia .env.example a .env.local y rellénalo con la configuración web del proyecto.",
  );
}

const configuracion = {
  apiKey: variables.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: variables.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: variables.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: variables.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: variables.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: variables.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// El recargado en caliente de `next dev` vuelve a ejecutar este módulo; sin esta guarda
// Firebase lanza "app already exists".
const app = getApps().length > 0 ? getApp() : initializeApp(configuracion);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Fast Refresh vuelve a ejecutar este módulo con las mismas instancias de Firebase.
const entorno = globalThis as typeof globalThis & { emuladoresCanchaFansConectados?: boolean };
if (usarEmuladores && !entorno.emuladoresCanchaFansConectados) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  entorno.emuladoresCanchaFansConectados = true;
}
