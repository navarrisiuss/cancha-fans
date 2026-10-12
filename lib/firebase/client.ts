// SDK cliente de Firebase. Solo se importa desde componentes cliente: la sesión de Auth vive en
// el navegador. Para lecturas y escrituras desde el servidor se usará lib/firebase/admin.ts.
import "client-only";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
