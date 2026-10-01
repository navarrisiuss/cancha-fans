import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./componentes-ui";

export function TarjetaAuth({
  titulo,
  subtitulo,
  children,
  pieTexto,
  pieEnlaceTexto,
  pieEnlaceHref,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  pieTexto: string;
  pieEnlaceTexto: string;
  pieEnlaceHref: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0EEE9] px-5 py-16">
      <Link href="/" aria-label="CanchaFans, inicio" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-[420px] rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(18,36,28,0.06)]">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#12241C]">{titulo}</h1>
        <p className="mt-1.5 text-sm text-[#627067]">{subtitulo}</p>
        <div className="mt-7">{children}</div>
      </div>
      <p className="mt-6 text-sm text-[#627067]">
        {pieTexto}{" "}
        <Link href={pieEnlaceHref} className="font-semibold text-[#0F7A4D]">
          {pieEnlaceTexto}
        </Link>
      </p>
    </div>
  );
}
