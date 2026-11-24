export function normalizarTelefono(texto: string): string | null {
  const limpio = texto.replace(/\s/g, "");
  if (!/^(?:\+56)?9\d{8}$/.test(limpio)) return null;
  return limpio.startsWith("+56") ? limpio : `+56${limpio}`;
}
