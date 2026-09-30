import { cn } from "@/lib/utils";

/**
 * A marca é o próprio nome: "GoodFans" com interior azul sólido, contorno neon
 * e brilho. Sem imagem, para ficar nítido em qualquer tamanho.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("text-neon-brand block text-2xl font-black tracking-tight", className)}>
      GoodFans
    </span>
  );
}
