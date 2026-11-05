// Documento complejos/{complejoId} de Firestore (ver docs/modelo-datos.md).
// Solo tipos por ahora: sin "client-only" porque también los usarán los Route Handlers.

export type EstadoComplejo = "borrador" | "en_revision" | "aprobado" | "rechazado";

export type Formato = "F5" | "F7" | "F11";

// Datos que escribe el arrendatario al postular. El resto de los campos del modelo (estado,
// notaAdmin, rating, fechas) los pone el sistema o el admin, no el formulario.
export type DatosComplejo = {
  nombre: string;
  descripcion: string;
  comuna: string;
  direccion: string;
  rut: string;
  razonSocial: string;
  datosBancarios: string;
};
