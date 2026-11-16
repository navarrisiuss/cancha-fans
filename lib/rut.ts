// Validación del RUT chileno con el dígito verificador (módulo 11). Sin dependencias: son pocas
// líneas y no cambia. Sirve en servidor y en cliente.

// Acepta "12.345.678-5", "12345678-5" o "123456785" (y "k" minúscula). Devuelve el RUT normalizado
// ("12345678-5") si el dígito verificador es correcto, o null si no lo es.
export function normalizarRut(texto: string): string | null {
  const limpio = texto.replace(/[.\s-]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return null;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  // Se multiplican los dígitos de derecha a izquierda por 2, 3, 4, 5, 6, 7, 2, 3...
  let suma = 0;
  for (let i = 0; i < cuerpo.length; i++) {
    suma += Number(cuerpo[cuerpo.length - 1 - i]) * ((i % 6) + 2);
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);

  return dv === esperado ? `${cuerpo}-${dv}` : null;
}
