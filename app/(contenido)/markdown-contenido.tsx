// Componente de servidor: convierte el texto Markdown leído del repositorio en HTML semántico con
// estilos de Tailwind durante el build (SSG), sin enviar el parser al navegador.
import Markdown from "react-markdown";

export function MarkdownContenido({ contenido }: { contenido: string }) {
  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed text-[#4D5D54]">
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#12241C]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 text-xl font-semibold tracking-[-0.025em] text-[#12241C]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3 text-base font-semibold text-[#12241C]">{children}</h3>
          ),
          p: ({ children }) => <p className="leading-7 text-[#4D5D54]">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-2 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-2 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-6">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-[#12241C]">{children}</strong>,
        }}
      >
        {contenido}
      </Markdown>
    </div>
  );
}
