type NombreIcono =
  | "pin"
  | "calendar"
  | "clock"
  | "chevron"
  | "search"
  | "heart"
  | "star"
  | "menu"
  | "close";

export function Icono({
  nombre,
  className = "h-5 w-5",
}: {
  nombre: NombreIcono;
  className?: string;
}) {
  const paths: Record<NombreIcono, React.ReactNode> = {
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5a5.5 5.5 0 0 0 1.1-8.9Z" />
    ),
    star: <path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.1 6.8-6-3.2-6 3.2 1.1-6.8-4.9-4.8 6.8-1L12 2Z" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[nombre]}
    </svg>
  );
}

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-extrabold tracking-[-0.028em] ${
        claro ? "text-white" : "text-[#12241C]"
      }`}
    >
      <span className="relative h-10 w-10 shrink-0 rounded-[11px] bg-[#0F7A4D]" aria-hidden="true">
        <span className="absolute inset-[8px] rounded-[5px] border-[2px] border-white" />
        <span className="absolute left-1/2 top-[8px] h-6 -translate-x-1/2 border-l-[2px] border-white" />
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] border-white" />
        <span className="absolute right-[8px] top-[8px] h-3 w-3 rounded-[3px] bg-[#D9F24A]" />
      </span>
      <span className="text-xl">
        Cancha<span className={claro ? "text-white" : "text-[#0F7A4D]"}>Fans</span>
      </span>
    </span>
  );
}
