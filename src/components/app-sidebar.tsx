import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Shapes, Settings2, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Shapes;
  /** Só o administrador vê a área de pessoas. O banco confere de novo. */
  adminOnly?: boolean;
};

/**
 * A ordem é a que o uso pede: quanto entra por mês primeiro, depois o que se
 * gerencia, e por último o ajuste da conta.
 */
const ITEMS: NavItem[] = [
  { to: "/dashboard/financeiro", label: "Dashboard financeiro", icon: LayoutDashboard },
  { to: "/dashboard", label: "Modelos", icon: Shapes },
  { to: "/dashboard/admin", label: "Usuários", icon: ShieldCheck, adminOnly: true },
  { to: "/dashboard/settings", label: "Configurações", icon: Settings2 },
];

type AppSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  username: string | null;
  displayName: string | null;
  avatarPath: string | null;
  isAdmin: boolean;
};

/**
 * Menu lateral do painel, com o botão que o abre no cabeçalho.
 *
 * O botão fica fora do painel deslizante de propósito: é o que fecha o menu, e
 * um controle que desaparece junto com o que ele controla obriga a pessoa a
 * caçar o clique fora da área escurecida para sair.
 */
export function AppSidebar({
  open,
  onOpenChange,
  email,
  username,
  displayName,
  avatarPath,
  isAdmin,
}: AppSidebarProps) {
  // O pathname serve de gatilho de fechamento. Escutar o objeto inteiro do
  // router derrubaria a gaveta a cada re-render sem mudança de página.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const painel = useRef<HTMLDivElement>(null);

  // Navegar fecha. Um menu que continua aberto em cima da página nova esconde o
  // conteúdo que a pessoa acabou de pedir.
  useEffect(() => {
    onOpenChange(false);
    // Só o caminho importa aqui; a função chega nova a cada render do pai e
    // repetiria o efeito sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Escape fecha, e o foco vai para o botão que abre. Sem isso o foco fica preso
  // num elemento que sumiu da tela e o teclado anda só pelo documento de baixo.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("keydown", onKeyDown);
    painel.current?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const visiveis = ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      <div
        // some do fluxo e do teclado quando fechado, senão o Tab entraria num
        // menu invisível
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      <div
        ref={painel}
        id="menu-lateral"
        role="dialog"
        aria-label="Menu do painel"
        // `inert` quando fechado é o que tira o menu do alcance do teclado.
        // O atributo é o padrão correto para "existe no DOM, mas não está na
        // tela"; sem ele, um leitor de tela narraria os links de um menu que
        // ninguém está vendo.
        {...(open ? {} : { inert: "" })}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.06] bg-[#0b0b12] transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
          <Logo className="text-xl" />

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar menu"
            className="grid size-9 cursor-pointer place-items-center rounded-input text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {visiveis.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                // `activeOptions.exact` evita o item "Modelos" ficar marcado
                // quando a pessoa está na página de um modelo — a sub-página tem
                // outro item, e dois marcados ao mesmo tempo não indica onde
                // ela está.
                activeOptions={{ exact: item.to === "/dashboard" }}
                activeProps={{ className: "bg-white/[0.07] text-foreground" }}
                className="flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Avatar no canto inferior esquerdo. Fica num rodapé fixo para que a
            conta fique sempre no mesmo lugar, e o menu do usuário vem junto
            para não haver duas entradas para a mesma coisa. */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <UserMenu
            email={email}
            username={username}
            displayName={displayName}
            avatarPath={avatarPath}
            isAdmin={isAdmin}
            // No rodapé o botão ocupa a largura toda e o menu abre pela mesma
            // borda, senão o balão de opções nascia por cima do próprio menu.
            className="w-full justify-start"
            align="start"
          />
        </div>
      </div>
    </>
  );
}

/** Botão de três traços que abre e fecha o menu lateral. */
export function SidebarToggle({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      aria-label={open ? "Fechar menu" : "Abrir menu"}
      aria-expanded={open}
      aria-controls="menu-lateral"
      className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-input text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}
