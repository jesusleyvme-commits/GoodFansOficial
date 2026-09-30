import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/button";

export function RootError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-brand-soft px-4">
      <div className="w-full max-w-sm rounded-card border border-white/[0.06] bg-white/[0.03] p-8 text-center shadow-soft">
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>

        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={reset}>
            Tentar de novo
          </Button>
          <Button
            size="sm"
            onClick={() => {
              router.invalidate();
              void router.navigate({ to: "/dashboard" });
            }}
          >
            Ir para o painel
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-brand-soft px-4">
      <div className="w-full max-w-sm rounded-card border border-white/[0.06] bg-white/[0.03] p-8 text-center shadow-soft">
        <h1 className="text-lg font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta página não existe.</p>
        <Button
          className="mt-6"
          size="sm"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          Ir para o painel
        </Button>
      </div>
    </div>
  );
}
