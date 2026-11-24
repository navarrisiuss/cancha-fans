export const MAXIMO_CARACTERES_BUSQUEDA = 60;

export function normalizarNombre(texto: string) {
  return texto.toLocaleLowerCase("es-CL").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
