// Forma mínima de un Timestamp de Firestore. El SDK cliente (firebase/firestore) y el Admin SDK
// (firebase-admin/firestore) tienen clases distintas, pero ambas cumplen esta forma. Los tipos de
// lib/tipos/ la usan para no depender de ninguno de los dos SDK y poder importarse desde servidor y
// cliente.
export type FechaFirestore = {
  toMillis(): number;
  toDate(): Date;
};
